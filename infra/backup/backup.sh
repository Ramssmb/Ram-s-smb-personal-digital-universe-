#!/bin/sh
# Nightly backup of the database and uploaded media (docs/DEPLOYMENT.md §8).
#
#   crontab: 30 2 * * *  cd /srv/personal-site && ./infra/backup/backup.sh >> /var/log/site-backup.log 2>&1
#
# Keeps BACKUP_KEEP_DAYS days locally. Copy BACKUP_DIR off the server (rclone,
# restic, or your provider's snapshot service) — a backup on the same disk is not a backup.
# Restore with infra/backup/restore.sh.
set -eu

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/personal-site}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
umask 077

# Database: custom format, restorable with pg_restore. Ownership is applied on
# restore (--role=site_owner), so the dump is portable between servers.
$COMPOSE exec -T db pg_dump -U postgres -d personal_site --format=custom --no-owner \
  > "$BACKUP_DIR/db-$STAMP.dump"
test -s "$BACKUP_DIR/db-$STAMP.dump" || { echo "empty database dump" >&2; exit 1; }

# Media: the whole storage volume (public and private files). With S3 storage the
# files live in the bucket — enable versioning or backups at the provider instead.
if grep -qs '^STORAGE_DRIVER=s3' .env.production; then
  echo "media: stored in the S3 bucket, not archived here"
else
  # Run as this host user so tar can write into BACKUP_DIR; the container keeps
  # its read-only filesystem and dropped capabilities.
  $COMPOSE run --rm --no-deps --user "$(id -u):$(id -g)" -v "$BACKUP_DIR:/backup" \
    --entrypoint sh app -c "tar -czf /backup/media-$STAMP.tar.gz -C /data storage"
  test -s "$BACKUP_DIR/media-$STAMP.tar.gz" || { echo "empty media archive" >&2; exit 1; }
fi

find "$BACKUP_DIR" -type f -mtime +"$BACKUP_KEEP_DAYS" -delete
echo "backup $STAMP ok: $(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR"
