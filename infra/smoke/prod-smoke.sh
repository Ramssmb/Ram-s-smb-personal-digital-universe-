#!/usr/bin/env bash
# End-to-end smoke test of the production stack (docker-compose.prod.yml).
# Used by CI; can also be run on a fresh server before pointing DNS at it.
#
#   infra/smoke/prod-smoke.sh            (expects .env.production with DOMAIN=localhost)
#
# Checks: Caddy config validity, HTTPS, health, security headers, admin API
# protection, database not exposed, owner account creation, sign-in (database +
# Argon2 in the image), image upload (sharp in the image + media volume),
# persistence across a full restart, and graceful shutdown.
set -euo pipefail

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env.production)
BASE=https://localhost
CURL=(curl -fsS -k --retry 0 --max-time 20)
JAR=$(mktemp)
ADMIN_EMAIL=owner@example.test
ADMIN_PASSWORD="a long smoke test passphrase $(openssl rand -hex 4)"

step() { printf '\n==> %s\n' "$*"; }
fail() { echo "FAILED: $*" >&2; exit 1; }

wait_healthy() {
  for _ in $(seq 1 90); do
    if "${CURL[@]}" "$BASE/api/v1/health" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  fail "the site did not become healthy over HTTPS"
}

login() {
  rm -f "$JAR"
  "${CURL[@]}" -c "$JAR" -H "Origin: $BASE" -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$BASE/api/v1/auth/login" >/dev/null \
    || fail "sign-in failed"
  grep -q "__Host-session" "$JAR" || fail "the session cookie is not a __Host- cookie over HTTPS"
}

step "Caddy configuration is valid"
docker run --rm -e DOMAIN=example.com -v "$PWD/infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.10-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

step "Build and start the stack"
"${COMPOSE[@]}" up -d --build
wait_healthy
test "$("${COMPOSE[@]}" ps -a --format '{{.Service}} {{.ExitCode}}' | awk '$1=="migrate"{print $2}')" = "0" \
  || fail "the migrate container did not exit cleanly"

step "Health, pages and security headers over HTTPS"
"${CURL[@]}" "$BASE/api/v1/health" | grep -q '"ok"' || fail "health is not ok"
"${CURL[@]}" -o /dev/null "$BASE/"
headers=$("${CURL[@]}" -D - -o /dev/null "$BASE/")
grep -qi '^content-security-policy: .*nonce-' <<<"$headers" || fail "missing CSP nonce"
grep -qi '^strict-transport-security:' <<<"$headers" || fail "missing HSTS"
grep -qi '^x-frame-options: DENY' <<<"$headers" || fail "missing X-Frame-Options"
! grep -qi '^x-powered-by' <<<"$headers" || fail "X-Powered-By is exposed"
test "$(curl -sk -o /dev/null -w '%{http_code}' http://localhost/)" = "308" || fail "HTTP does not redirect to HTTPS"

step "Admin API rejects anonymous and cross-site requests"
test "$(curl -sk -o /dev/null -w '%{http_code}' "$BASE/api/v1/admin/collections/projects")" = "401" || fail "admin API is not protected"

step "Database is not reachable from outside"
! nc -z -w 2 127.0.0.1 5432 || fail "PostgreSQL port is published"

step "Create the owner account with the tools image"
"${COMPOSE[@]}" run --rm -e ADMIN_EMAIL="$ADMIN_EMAIL" -e ADMIN_PASSWORD="$ADMIN_PASSWORD" tools npm run admin:create

step "Sign in and upload an image"
login
python3 - <<'PY' > /tmp/smoke.png
import struct, sys, zlib
w, h = 64, 48
raw = b"".join(b"\x00" + bytes([47, 91, 234]) * w for _ in range(h))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
sys.stdout.buffer.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))
PY
upload=$("${CURL[@]}" -b "$JAR" -H "Origin: $BASE" -F "file=@/tmp/smoke.png;type=image/png" -F "altText=Smoke test" "$BASE/api/v1/admin/media")
key=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["item"]["storageKey"])' <<<"$upload")
"${CURL[@]}" -o /dev/null "$BASE/media/$key" || fail "uploaded image is not served"

step "Data and uploads survive a full restart"
"${COMPOSE[@]}" down
"${COMPOSE[@]}" up -d
wait_healthy
login
"${CURL[@]}" -o /dev/null "$BASE/media/$key" || fail "uploaded image was lost on restart"

step "Back up the database and media"
BACKUP_DIR="$PWD/.backup-test"
rm -rf "$BACKUP_DIR"
BACKUP_DIR="$BACKUP_DIR" infra/backup/backup.sh
dump=$(ls "$BACKUP_DIR"/db-*.dump)
media=$(ls "$BACKUP_DIR"/media-*.tar.gz)
tar -tzf "$media" | grep -q "storage/public/$key" || fail "the media archive does not contain the uploaded image"

step "Restore into a separate database and compare it with the live one"
infra/backup/restore.sh "$dump"
"${COMPOSE[@]}" exec -T db psql -U postgres -d personal_site_restore_check -At \
  -c "SET ROLE site_app; SELECT count(*) FROM users" | grep -qx 1 || fail "site_app cannot read the restored copy"

step "Disaster recovery: replace the live database with the backup"
# A change made after the backup must disappear after the restore.
"${COMPOSE[@]}" exec -T db psql -U postgres -d personal_site -q -c \
  "INSERT INTO contact_messages (name, email, body) VALUES ('After backup', 'later@example.test', 'Arrived after the backup.')"
RESTORE_OVERWRITE=yes infra/backup/restore.sh "$dump" personal_site
test "$("${COMPOSE[@]}" exec -T db psql -U postgres -d personal_site -At -c "SELECT count(*) FROM contact_messages WHERE name = 'After backup'")" = "0" \
  || fail "the restore did not return the database to the backup's state"
wait_healthy
login
"${CURL[@]}" -o /dev/null "$BASE/media/$key" || fail "media missing after the database restore"
"${COMPOSE[@]}" run --rm migrate || fail "migrations cannot run on the restored database"
test "$("${COMPOSE[@]}" exec -T db psql -U postgres -d personal_site -At -c "SELECT tableowner FROM pg_tables WHERE tablename = 'users'")" = "site_owner" \
  || fail "restored live tables are not owned by site_owner"
rm -rf "$BACKUP_DIR"

step "The app shuts down gracefully"
started=$(date +%s)
"${COMPOSE[@]}" stop -t 20 app
took=$(( $(date +%s) - started ))
code=$(docker inspect --format '{{.State.ExitCode}}' "$("${COMPOSE[@]}" ps -a -q app)")
# Next.js closes the server on SIGTERM, then exits with 143 (128 + SIGTERM) by
# convention. 137 would mean Docker had to SIGKILL it after the grace period.
case "$code" in
  0 | 143) echo "app stopped cleanly in ${took}s (exit $code)" ;;
  *) fail "app exit code $code on stop after ${took}s (137 = killed after the grace period)" ;;
esac
test "$took" -lt 15 || fail "app took ${took}s to stop; it is not reacting to SIGTERM"

echo
echo "Production smoke test passed."
