#!/bin/sh
# Nightly backup of the database and uploaded media (docs/DEPLOYMENT.md §7).
#
#   crontab: 30 2 * * *  cd /srv/personal-site && ./infra/backup/backup.sh >> /var/log/site-backup.log 2>&1
#
# Keeps BACKUP_KEEP_DAYS days locally. Copy BACKUP_DIR off the server (rclone,
# restic, or your provider's snapshot service) — a backup on the same disk is not a backup.
set -eu

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/personal-site}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
umask 077

# Database: custom format, restorable with pg_restore.
$COMPOSE exec -T db pg_dump -U postgres -d personal_site --format=custom --no-owner \
  > "$BACKUP_DIR/db-$STAMP.dump"

# Media: the whole storage volume (public and private files).
$COMPOSE run --rm --no-deps -v "$BACKUP_DIR:/backup" --entrypoint sh app \
  -c "tar -czf /backup/media-$STAMP.tar.gz -C /data storage"

# Refuse to report success for an empty dump.
test -s "$BACKUP_DIR/db-$STAMP.dump"

find "$BACKUP_DIR" -type f -mtime +"$BACKUP_KEEP_DAYS" -delete
echo "backup $STAMP ok: $(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR"
