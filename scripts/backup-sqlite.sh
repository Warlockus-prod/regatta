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
#   REGATTA_BACKUP_MAX_MB=2048      # cap on one uncompressed backup
#   REGATTA_CONTAINER=regatta
# With REGATTA_BACKUP_REMOTE set and no aws CLI the run keeps the local copy
# and exits 1, so a missing off-site copy is a failed job, not a quiet "Done".
#
# Root never acts on a path the app container can write. The prod database
# lives in a volume owned by the app's uid 1001, so the backup is taken inside
# the container and streamed out through `docker exec` stdout: a symlink
# planted there resolves (and is refused) only inside the container, and root
# writes only regular files it creates itself in the 0700 backup directory.
# The output must start with the SQLite header before it is compressed or
# uploaded. The host `sqlite3` path is used only for a database whose file and
# directory belong to the user running this script and nobody else can write.
#
# To restore (administrator with a root shell on the VPS, attended, with the
# result checked from outside within 10 minutes). Prod runs from the
# root-owned /etc/regatta-deploy/compose.yml (ops/deploy/README.md), so never
# run `docker compose` from a repository checkout for this. The volume
# directory is writable by uid 1001, so root never writes or chowns a fixed
# name there (a name planted earlier as a symlink would redirect the write to
# a host file): the new file is a fresh mktemp file, renamed into place.
#   0. hold the deploy lock for the whole restore, so a CI deploy fails fast
#      instead of starting the container in the middle of the swap:
#      flock -n /var/lib/regatta-deploy-state/deploy.lock bash
#      (run steps 1-7 in that shell; it fails at once while a deploy runs)
#   1. docker stop regatta
#   2. VOL="$(docker volume inspect regatta_regatta_data --format '{{ .Mountpoint }}')"
#   3. keep the current files: KEEP="/root/regatta-before-restore-$(date +%Y%m%d-%H%M%S)"
#      mkdir -m 700 "$KEEP" && cp -a "$VOL"/regatta-stats.db* "$KEEP"/
#   4. TMP="$(mktemp "$VOL/restore.XXXXXX")"   (new 0600 file, never follows a link)
#      gunzip -c /var/backups/regatta/regatta-stats-YYYYMMDD-HHMMSS.db.gz > "$TMP"
#      chmod 600 "$TMP" && chown -h 1001:1001 "$TMP"
#   5. rm -f "$VOL/regatta-stats.db-wal" "$VOL/regatta-stats.db-shm"
#      (a WAL left from the old database would be replayed onto the restored one)
#   6. mv -T "$TMP" "$VOL/regatta-stats.db"    (replaces a link, never follows it)
#   7. docker start regatta, then `exit` to release the deploy lock
#   8. from the Mac: curl -fsS https://weektoregatta.com/api/health and open /stats

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
CONTAINER="${REGATTA_CONTAINER:-regatta}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/regatta-stats-$TS.db"
OUT_GZ="$OUT.gz"

# On any failure leave no half-written file behind: neither the raw copy nor
# a partial .gz. A finished .gz is kept even when the upload fails.
trap 'rm -f "$OUT" "$OUT_GZ.part"' EXIT

# The host path is safe only when no other account can change the database
# or its directory: sqlite3 running as root follows a planted symlink (the
# database itself or its -wal/-shm files). The prod volume belongs to the
# app's uid 1001, so on the VPS this is false and the container path runs.
host_db_is_safe() {
  local dir
  dir="$(dirname -- "$DB_PATH")"
  command -v sqlite3 >/dev/null 2>&1 \
    && [ -f "$DB_PATH" ] && [ ! -L "$DB_PATH" ] && [ -O "$DB_PATH" ] \
    && [ -d "$dir" ] && [ ! -L "$dir" ] && [ -O "$dir" ] \
    && [ -z "$(find "$dir" -maxdepth 0 \( -perm -020 -o -perm -002 \) -print)" ]
}

echo "[$(date -Iseconds)] Starting online backup -> $OUT"

# Online backup via sqlite3 itself (safe while the app is running).
if host_db_is_safe; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
elif docker inspect "$CONTAINER" >/dev/null 2>&1; then
  # Inside the container. The runtime image has no sqlite3 binary, so this
  # uses better-sqlite3's online backup API (same page-level copy as
  # `.backup`) into a temporary file in /data, then streams the bytes to
  # stdout from that same process. Never `docker cp` here: it copies a
  # symlink as a symlink, and the next host command would follow it to a
  # host file as root. The read opens the temporary file with O_NOFOLLOW and
  # O_NONBLOCK and accepts only a regular file, so a link (to /dev/zero, say)
  # or a FIFO swapped in by the app fails instead of streaming forever or
  # hanging; the file is unlinked as soon as it is open. On the host, the
  # shell redirect creates "$OUT" as a new regular file under umask 077
  # (0600) and head caps its size.
  MAX_BYTES=$(( ${REGATTA_BACKUP_MAX_MB:-2048} * 1024 * 1024 ))
  STREAM_JS='
const fs = require("fs");
const tmp = process.argv[1];
const fail = (e) => { try { fs.unlinkSync(tmp); } catch {} console.error(String((e && e.message) || e)); process.exit(1); };
require("better-sqlite3")("/data/regatta-stats.db", { fileMustExist: true }).backup(tmp).then(() => {
  const fd = fs.openSync(tmp, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  fs.unlinkSync(tmp);
  if (!fs.fstatSync(fd).isFile()) throw new Error("the backup copy is not a regular file");
  fs.createReadStream("", { fd }).on("error", fail).pipe(process.stdout);
}).catch(fail);
'
  if ! docker exec "$CONTAINER" node -e "$STREAM_JS" "/data/_tmp_backup-$TS.db" \
      | head -c "$((MAX_BYTES + 1))" > "$OUT"; then
    echo "[$(date -Iseconds)] ERROR: the in-container backup failed or exceeded ${REGATTA_BACKUP_MAX_MB:-2048} MB, nothing was kept or uploaded"
    exit 1
  fi
  if [ "$(wc -c < "$OUT")" -gt "$MAX_BYTES" ]; then
    echo "[$(date -Iseconds)] ERROR: the backup exceeded ${REGATTA_BACKUP_MAX_MB:-2048} MB, nothing was kept or uploaded"
    exit 1
  fi
else
  echo "[$(date -Iseconds)] ERROR: no usable database: $DB_PATH is missing or writable by another account, and there is no $CONTAINER container"
  exit 1
fi

# Keep and upload only a regular file that starts with the 16-byte SQLite
# header ("SQLite format 3" and a NUL byte).
SQLITE_MAGIC="53514c69746520666f726d6174203300"
if [ ! -f "$OUT" ] || [ -L "$OUT" ] \
  || [ "$(head -c 16 "$OUT" | od -An -tx1 | tr -d ' \n')" != "$SQLITE_MAGIC" ]; then
  echo "[$(date -Iseconds)] ERROR: the backup is not a SQLite database, nothing was kept or uploaded"
  exit 1
fi

gzip -c "$OUT" > "$OUT_GZ.part"
mv -f "$OUT_GZ.part" "$OUT_GZ"
rm -f "$OUT"
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
