#!/usr/bin/env bash
# Regatta SQLite backup script.
#
# Runs on the VPS. Takes an online backup of regatta-stats.db (the event log /
# feedback / leaderboard / replays store), gzips it, keeps the local copies for
# REGATTA_BACKUP_RETENTION_DAYS (14 by default), and uploads each one to an
# S3-compatible remote when REGATTA_BACKUP_REMOTE is set. Backups are private:
# the directory is 0700 and every file 0600, because the database holds
# feedback contacts and truncated IPs.
#
# Install as a systemd timer or cron job, e.g. every 6 hours:
#
#   # /etc/cron.d/regatta-backup
#   0 */6 * * * root /usr/local/sbin/regatta-backup-sqlite >> /var/log/regatta-backup.log 2>&1
#
# Root runs a root-owned, reviewed COPY of this script, never the file in the
# repository checkout (that would let a repository change run as root):
#   sudo install -o root -g root -m 0755 scripts/backup-sqlite.sh /usr/local/sbin/regatta-backup-sqlite
#
# Or via systemd timer (preferred - better log handling):
#
#   /etc/systemd/system/regatta-backup.service:
#     [Unit]
#     Description=Regatta SQLite backup
#     [Service]
#     Type=oneshot
#     ExecStart=/usr/local/sbin/regatta-backup-sqlite
#
#   /etc/systemd/system/regatta-backup.timer:
#     [Unit]
#     Description=Run regatta-backup every 6h
#     [Timer]
#     OnBootSec=15min
#     OnUnitActiveSec=6h
#     Persistent=true
#     [Install]
#     WantedBy=timers.target
#
#   sudo systemctl enable --now regatta-backup.timer
#
# Settings (all optional) live in /etc/default/regatta-backup, owned by root
# with mode 0600 because it holds the storage keys. The file is read first,
# with every variable exported, so the aws CLI sees the AWS_* keys. The script
# refuses a settings file that is not owned by the user running it or that
# group or others can write, since sourcing it runs it as root.
#   REGATTA_BACKUP_REMOTE=s3://my-bucket/regatta/
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   AWS_ENDPOINT_URL=https://hel1.your-objectstorage.com   # Hetzner etc
#   REGATTA_BACKUP_DIR=/var/backups/regatta
#   REGATTA_BACKUP_RETENTION_DAYS=14
# With REGATTA_BACKUP_REMOTE set and no aws CLI the run keeps the local copy
# and exits 1, so a missing off-site copy is a failed job, not a quiet "Done".
#
# To restore (administrator with a root shell on the VPS, attended, with the
# result checked from outside within 10 minutes). Prod runs from the
# root-owned /etc/regatta-deploy/compose.yml (ops/deploy/README.md), so never
# run `docker compose` from a repository checkout for this:
#   1. docker stop regatta
#   2. VOL="$(docker volume inspect regatta_regatta_data --format '{{ .Mountpoint }}')"
#   3. keep the current files: KEEP="/root/regatta-before-restore-$(date +%Y%m%d-%H%M%S)"
#      mkdir -m 700 "$KEEP" && cp -a "$VOL"/regatta-stats.db* "$KEEP"/
#   4. gunzip -c /var/backups/regatta/regatta-stats-YYYYMMDD-HHMMSS.db.gz > "$VOL/regatta-stats.db.restore"
#   5. rm -f "$VOL/regatta-stats.db-wal" "$VOL/regatta-stats.db-shm"
#      (a WAL left from the old database would be replayed onto the restored one)
#   6. mv "$VOL/regatta-stats.db.restore" "$VOL/regatta-stats.db"
#   7. chown 1001:1001 "$VOL/regatta-stats.db" && chmod 600 "$VOL/regatta-stats.db"
#   8. docker start regatta
#   9. from the Mac: curl -fsS https://weektoregatta.com/api/health and open /stats

set -euo pipefail
umask 077

# Optional settings for the cron context. Read them BEFORE computing the
# defaults below, and export them for the aws CLI.
ENV_FILE="${REGATTA_BACKUP_ENV_FILE:-/etc/default/regatta-backup}"
if [ -f "$ENV_FILE" ]; then
  if [ ! -O "$ENV_FILE" ] || [ -n "$(find "$ENV_FILE" -maxdepth 0 \( -perm -020 -o -perm -002 \) -print)" ]; then
    echo "[$(date -Iseconds)] ERROR: $ENV_FILE must be owned by $(id -un) and not writable by group or others"
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

DB_PATH="${REGATTA_DB_PATH:-/data/regatta-stats.db}"
BACKUP_DIR="${REGATTA_BACKUP_DIR:-/var/backups/regatta}"
RETENTION_DAYS="${REGATTA_BACKUP_RETENTION_DAYS:-14}"
REMOTE="${REGATTA_BACKUP_REMOTE:-}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ] && ! docker inspect regatta >/dev/null 2>&1; then
  echo "[$(date -Iseconds)] ERROR: DB not found at $DB_PATH and no regatta container"
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/regatta-stats-$TS.db"
OUT_GZ="$OUT.gz"

echo "[$(date -Iseconds)] Starting online backup -> $OUT"

# Online backup via sqlite3 itself (safe while the app is running).
# Without sqlite3 on the host, or when the DB is only reachable inside the
# container's named volume, back up inside the container instead. The runtime
# image has no sqlite3 binary, so that path uses better-sqlite3's online
# backup API (same page-level copy as `.backup`).
if command -v sqlite3 >/dev/null 2>&1 && [ -f "$DB_PATH" ]; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
else
  # Fallback: exec in container. Assumes the container is named "regatta".
  docker exec regatta node -e "require('better-sqlite3')('/data/regatta-stats.db', { fileMustExist: true }).backup('/data/_tmp_backup.db').then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); })"
  docker cp regatta:/data/_tmp_backup.db "$OUT"
  docker exec regatta rm -f /data/_tmp_backup.db
fi

# docker cp keeps the container file's mode and ignores the umask.
chmod 600 "$OUT"
gzip --force "$OUT"
chmod 600 "$OUT_GZ"
SIZE="$(du -h "$OUT_GZ" | awk '{print $1}')"
echo "[$(date -Iseconds)] Backup complete: $OUT_GZ ($SIZE)"

# Prune old local backups
find "$BACKUP_DIR" -name 'regatta-stats-*.db.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Iseconds)] Pruned local backups older than $RETENTION_DAYS days"

# Optional remote upload
if [ -n "$REMOTE" ]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "[$(date -Iseconds)] ERROR: REGATTA_BACKUP_REMOTE is set but the aws CLI is not installed - the local copy is kept, nothing was uploaded"
    exit 1
  fi
  REMOTE_OBJ="${REMOTE%/}/regatta-stats-$TS.db.gz"
  echo "[$(date -Iseconds)] Uploading to $REMOTE_OBJ"
  aws s3 cp "$OUT_GZ" "$REMOTE_OBJ" --only-show-errors
  echo "[$(date -Iseconds)] Remote upload complete"
fi

echo "[$(date -Iseconds)] Done"
