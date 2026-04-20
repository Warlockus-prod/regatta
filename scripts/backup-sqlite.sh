#!/usr/bin/env bash
# Regatta SQLite backup script.
#
# Runs on the VPS. Takes an online backup of /data/regatta-stats.db (the
# event log / feedback / leaderboard / replays store), gzips it, keeps
# the 14 most recent locally, and optionally uploads to S3-compatible
# remote if REGATTA_BACKUP_REMOTE is set.
#
# Install as a systemd timer or cron job, e.g. every 6 hours:
#
#   # /etc/cron.d/regatta-backup
#   0 */6 * * * root /opt/repos/regatta/scripts/backup-sqlite.sh >> /var/log/regatta-backup.log 2>&1
#
# Or via systemd timer (preferred - better log handling):
#
#   /etc/systemd/system/regatta-backup.service:
#     [Unit]
#     Description=Regatta SQLite backup
#     [Service]
#     Type=oneshot
#     ExecStart=/opt/repos/regatta/scripts/backup-sqlite.sh
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
# To restore:
#   gunzip -c /var/backups/regatta/regatta-stats-YYYYMMDD-HHMMSS.db.gz > /data/regatta-stats.db
#   docker compose restart regatta
#
# Remote upload (optional): set these env vars in /etc/default/regatta-backup:
#   REGATTA_BACKUP_REMOTE=s3://my-bucket/regatta/
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   AWS_ENDPOINT_URL=https://hel1.your-objectstorage.com   # Hetzner etc

set -euo pipefail

DB_PATH="${REGATTA_DB_PATH:-/data/regatta-stats.db}"
BACKUP_DIR="${REGATTA_BACKUP_DIR:-/var/backups/regatta}"
RETENTION_DAYS="${REGATTA_BACKUP_RETENTION_DAYS:-14}"
REMOTE="${REGATTA_BACKUP_REMOTE:-}"

# Load optional env file for cron context
if [ -f /etc/default/regatta-backup ]; then
  # shellcheck disable=SC1091
  . /etc/default/regatta-backup
fi

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "[$(date -Iseconds)] ERROR: DB not found at $DB_PATH"
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/regatta-stats-$TS.db"
OUT_GZ="$OUT.gz"

echo "[$(date -Iseconds)] Starting online backup -> $OUT"

# Online backup via sqlite3 itself (safe while the app is running).
# Runs inside the regatta container if sqlite3 isn't on the host.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
else
  # Fallback: exec in container. Assumes the container is named "regatta".
  docker exec regatta sh -c "sqlite3 /data/regatta-stats.db \".backup '/data/_tmp_backup.db'\""
  docker cp regatta:/data/_tmp_backup.db "$OUT"
  docker exec regatta rm -f /data/_tmp_backup.db
fi

gzip --force "$OUT"
SIZE="$(du -h "$OUT_GZ" | awk '{print $1}')"
echo "[$(date -Iseconds)] Backup complete: $OUT_GZ ($SIZE)"

# Prune old local backups
find "$BACKUP_DIR" -name 'regatta-stats-*.db.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Iseconds)] Pruned local backups older than $RETENTION_DAYS days"

# Optional remote upload
if [ -n "$REMOTE" ]; then
  if command -v aws >/dev/null 2>&1; then
    REMOTE_OBJ="${REMOTE%/}/regatta-stats-$TS.db.gz"
    echo "[$(date -Iseconds)] Uploading to $REMOTE_OBJ"
    aws s3 cp "$OUT_GZ" "$REMOTE_OBJ" --only-show-errors
    echo "[$(date -Iseconds)] Remote upload complete"
  else
    echo "[$(date -Iseconds)] WARN: REGATTA_BACKUP_REMOTE set but aws CLI not installed - skipping remote upload"
  fi
fi

echo "[$(date -Iseconds)] Done"
