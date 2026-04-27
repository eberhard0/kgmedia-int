#!/usr/bin/env bash
# Nightly Postgres backup. Wired into kgmedia-backup.timer.
#
# Reads DATABASE_URL from the env loaded by systemd EnvironmentFile.
# Writes /var/backups/kgmedia/kgmedia-YYYY-MM-DD.sql.gz, keeps 14 days.
# Optional: if RCLONE_REMOTE is set, copies the latest dump there.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set" >&2
  exit 1
fi

BACKUP_DIR=/var/backups/kgmedia
KEEP_DAYS=14
DATE=$(date -u +%Y-%m-%d)
DUMP_FILE="$BACKUP_DIR/kgmedia-$DATE.sql.gz"

# /var/backups/kgmedia must exist and be writable by `kgmedia`.
# In the systemd unit we use ReadWritePaths to allow it; on first install run:
#   sudo mkdir -p /var/backups/kgmedia
#   sudo chown kgmedia:kgmedia /var/backups/kgmedia
mkdir -p "$BACKUP_DIR"

echo "[$(date -u)] starting backup → $DUMP_FILE"
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -9 > "$DUMP_FILE.tmp"
mv "$DUMP_FILE.tmp" "$DUMP_FILE"
echo "[$(date -u)] dump complete: $(du -h "$DUMP_FILE" | cut -f1)"

# Rotate
find "$BACKUP_DIR" -name 'kgmedia-*.sql.gz' -mtime +$KEEP_DAYS -delete

# Optional offsite copy
if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[$(date -u)] uploading to $RCLONE_REMOTE"
  rclone copy "$DUMP_FILE" "$RCLONE_REMOTE" --copy-links
fi

echo "[$(date -u)] backup done"
