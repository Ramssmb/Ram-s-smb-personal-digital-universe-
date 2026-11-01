#!/bin/sh
# Restores a database dump made by backup.sh (docs/DEPLOYMENT.md §8).
#
#   infra/backup/restore.sh <db-dump-file>
#       Restores into a separate database, personal_site_restore_check, and
#       compares row counts with the live database. Safe at any time: the live
#       site is not touched. Use it to test your backups regularly.
#
#   RESTORE_OVERWRITE=yes infra/backup/restore.sh <db-dump-file> personal_site
#       Replaces the LIVE database. The app is stopped during the restore.
#
# Objects are created as site_owner (as migrations expect) and the dump's
# grants give site_app the same row-level access as before.
set -eu

DUMP="${1:?usage: restore.sh <db-dump-file> [target-database]}"
TARGET="${2:-personal_site_restore_check}"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

case "$TARGET" in
  *[!a-z0-9_]*) echo "invalid database name: $TARGET" >&2; exit 1 ;;
esac
test -s "$DUMP" || { echo "dump not found or empty: $DUMP" >&2; exit 1; }

if [ "$TARGET" = "personal_site" ]; then
  if [ "${RESTORE_OVERWRITE:-}" != "yes" ]; then
    echo "Refusing to replace the live database. Set RESTORE_OVERWRITE=yes to confirm." >&2
    exit 1
  fi
  echo "Stopping the app..."
  $COMPOSE stop app
fi

psql() { $COMPOSE exec -T db psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

psql -d postgres -c "DROP DATABASE IF EXISTS $TARGET WITH (FORCE)" -c "CREATE DATABASE $TARGET OWNER site_owner"
psql -d "$TARGET" \
  -c "REVOKE ALL ON DATABASE $TARGET FROM PUBLIC" \
  -c "GRANT CONNECT ON DATABASE $TARGET TO site_app" \
  -c "ALTER SCHEMA public OWNER TO site_owner" \
  -c "REVOKE ALL ON SCHEMA public FROM PUBLIC" \
  -c "GRANT USAGE ON SCHEMA public TO site_app"

$COMPOSE exec -T db pg_restore -U postgres -d "$TARGET" --role=site_owner --no-owner --exit-on-error < "$DUMP"

if [ "$TARGET" = "personal_site" ]; then
  echo "Starting the app..."
  $COMPOSE start app
  echo "Live database restored from $DUMP."
  exit 0
fi

# Verification: the restored copy must match the live database row for row.
count() {
  $COMPOSE exec -T db psql -U postgres -d "$1" -At -c "SELECT
    (SELECT count(*) FROM users) || ' ' || (SELECT count(*) FROM media_assets) || ' ' ||
    (SELECT count(*) FROM projects) || ' ' || (SELECT count(*) FROM journal_entries) || ' ' ||
    (SELECT count(*) FROM contact_messages) || ' ' || (SELECT count(*) FROM drizzle.__drizzle_migrations)"
}
live="$(count personal_site)"
copy="$(count "$TARGET")"
echo "row counts (users media projects journal messages migrations): live=[$live] restored=[$copy]"
owner="$($COMPOSE exec -T db psql -U postgres -d "$TARGET" -At -c "SELECT tableowner FROM pg_tables WHERE tablename = 'users'")"
echo "table owner: $owner"
test "$owner" = "site_owner" || { echo "restored tables are not owned by site_owner" >&2; exit 1; }
test "$live" = "$copy" || { echo "restored copy differs from the live database (fine if the site changed since the backup)" >&2; exit 2; }
echo "Restore check passed: $TARGET matches the live database."
