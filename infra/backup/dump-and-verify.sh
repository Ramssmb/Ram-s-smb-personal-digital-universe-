#!/usr/bin/env bash
# Dumps a database and proves the dump restores (docs/DEPLOYMENT_VERCEL.md §6).
#
#   infra/backup/dump-and-verify.sh <source-url> <empty-restore-url> <output-dir>
#
# Writes <output-dir>/database.dump (custom format, no owners or grants, so it
# restores into any database) and <output-dir>/restored-counts.txt. Restores
# into <empty-restore-url> and fails unless every content table has the same
# number of rows as the source. Used by .github/workflows/backup.yml and
# tested in CI. Needs Docker (pg_dump 17 must match the PostgreSQL 17 server).
set -euo pipefail

source_url=${1:?source database URL}
restore_url=${2:?empty restore database URL}
out=${3:?output directory}

mkdir -p "$out"
out=$(cd "$out" && pwd)
pg() { docker run --rm --network host -v "$out:/work" postgres:17 "$@"; }

# Row counts of every table, in a stable order. Tables that change without the
# owner doing anything (sign-ins, rate limits, uploads in progress, the audit
# log, visitors' contact messages) can differ between the dump and the count,
# so only the owner's content is compared.
counts() {
  pg psql "$1" -v ON_ERROR_STOP=1 -At -c "
    SELECT table_schema || '.' || table_name || ' ' ||
      (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I',
        table_schema, table_name), false, true, '')))[1]::text
    FROM information_schema.tables
    WHERE table_schema IN ('public', 'drizzle') AND table_type = 'BASE TABLE'
      AND table_name NOT IN
        ('rate_limits', 'sessions', 'upload_intents', 'audit_log', 'contact_messages')
    ORDER BY 1"
}

# The whole database: restricting it with --schema would also dump
# "CREATE SCHEMA public", which fails against any database that has one.
pg pg_dump --format=custom --no-owner --no-privileges --file=/work/database.dump "$source_url"
pg pg_restore --no-owner --no-privileges --exit-on-error --dbname="$restore_url" /work/database.dump

counts "$source_url" > "$out/source-counts.txt"
counts "$restore_url" > "$out/restored-counts.txt"
if ! diff -u "$out/source-counts.txt" "$out/restored-counts.txt"; then
  echo "Restored row counts differ from the source database." >&2
  exit 1
fi
if [ ! -s "$out/restored-counts.txt" ]; then
  echo "No tables found in the restored database." >&2
  exit 1
fi
echo "Restore check passed for $(wc -l < "$out/restored-counts.txt") tables."
