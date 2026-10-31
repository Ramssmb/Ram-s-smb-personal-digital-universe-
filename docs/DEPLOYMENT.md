# Deployment

> Status: **prepared, not yet deployed.** The production stack is built and
> smoke-tested in CI (`docker` job: HTTPS through Caddy, security headers, 401
> on admin APIs, database not exposed, owner creation). It has not been
> deployed to a real server or domain yet — that needs a server, a domain and
> secrets that only the owner has.

## 1. What runs in production

```
Internet ──443/80──► Caddy (HTTPS, Let's Encrypt, HTTP/3)
                        │  frontend network
                        ▼
                     app (Next.js standalone, non-root, read-only filesystem)
                        │  backend network (internal: no internet access)
                        ▼
                     db (PostgreSQL 17)        media volume (uploads)
```

| Service   | Image                        | Notes                                                                                                     |
| --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `caddy`   | `caddy:2.10-alpine`          | Only service with published ports. Automatic certificates, HSTS comes from the app.                       |
| `app`     | `Dockerfile` target `runner` | `node server.js`; health check on `/api/v1/health`; `cap_drop: ALL`, `no-new-privileges`, read-only root. |
| `migrate` | target `tools`               | Runs `npm run db:migrate` as `site_owner`, then exits. `app` starts only if it succeeded.                 |
| `tools`   | target `tools`               | One-off commands (owner account, seed). Profile `tools`, never started by `up`.                           |
| `db`      | `postgres:17-alpine`         | Not published. Roles from `infra/postgres/prod-init/01-roles.sh` with passwords from the environment.     |

## 2. Requirements

- A Linux VPS (1 vCPU, 1–2 GB RAM is enough) with Docker Engine 24+ and the Compose plugin.
- A domain with an `A` (and optionally `AAAA`) record pointing to the server, plus `www` if wanted.
- Ports 80 and 443 open in the provider firewall; port 22 restricted to your IP if possible.

## 3. First deployment

```bash
git clone https://github.com/Ramssmb/Ram-s-smb-personal-digital-universe-.git /srv/personal-site
cd /srv/personal-site
cp .env.production.example .env.production
chmod 600 .env.production
# Fill in DOMAIN and generate every secret with: openssl rand -base64 32
nano .env.production

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f migrate app caddy
```

Then create the owner account and the starter structure:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm tools npm run admin:create
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm tools npm run db:seed
```

Sign in at `https://YOUR-DOMAIN/admin`, then fill in Profile, Settings and your first content.

## 4. Updates

```bash
cd /srv/personal-site
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

`migrate` runs before the new `app` container starts; if a migration fails, the
old container keeps serving and `docker compose logs migrate` shows why.

## 5. Rollback

Migrations are forward-only. To roll back the application:

```bash
git log --oneline              # find the last good commit
git checkout <good-commit>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build app
```

If the bad release included a migration that must be undone, restore the
database from the backup taken before the release (§7) — take one manually
before any release that changes the schema:

```bash
./infra/backup/backup.sh
```

## 6. Domain and HTTPS

- Caddy obtains and renews certificates automatically once DNS points at the
  server. `www.DOMAIN` redirects to `DOMAIN`.
- The app sends `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
  Add `preload` only once you are sure every subdomain will always use HTTPS.
- `SITE_URL` is derived from `DOMAIN` and is used for canonical URLs, the sitemap
  and the CSRF origin check: requests from any other origin are rejected.

## 7. Backups and restore

`infra/backup/backup.sh` writes a `pg_dump` (custom format) and a tarball of the
media volume to `BACKUP_DIR`, keeping 14 days. Schedule it with cron:

```cron
30 2 * * *  cd /srv/personal-site && ./infra/backup/backup.sh >> /var/log/site-backup.log 2>&1
```

**Copy the backup directory off the server** (e.g. `rclone sync` to object
storage, or `restic`). Test a restore at least once:

```bash
# Database
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  pg_restore -U postgres -d personal_site --clean --if-exists --no-owner < db-YYYYMMDDTHHMMSSZ.dump
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  psql -U postgres -d personal_site -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO site_app"
# Media
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --no-deps \
  -v "$PWD:/backup" --entrypoint sh app -c "tar -xzf /backup/media-YYYYMMDDTHHMMSSZ.tar.gz -C /data"
```

## 8. Logging and monitoring

- The app logs one JSON line per request (request id, method, path, status,
  duration) and errors with the same request id. Passwords, cookies, tokens and
  message bodies are redacted. View with `docker compose logs -f app`.
- Uptime: point an external monitor (for example your own DevPulse instance, or
  any free uptime checker) at `https://DOMAIN/api/v1/health`.
- Error alerting: not built in. The structured logs can be shipped to any log
  service; Sentry or GlitchTip can be added later (see PROJECT_PROGRESS.md).
- Disk: watch the `media` and `db-data` volumes (`docker system df -v`).

## 9. Security checklist before going live

- [ ] `.env.production` has unique, generated secrets and `chmod 600`.
- [ ] SSH: key-only login, root login disabled, `ufw` allows 22/80/443 only.
- [ ] Unattended security updates enabled on the server.
- [ ] Owner password is long and unique; it is never stored anywhere in the repo.
- [ ] A backup has been taken **and restored** successfully.
- [ ] `curl -I https://DOMAIN` shows the CSP, HSTS and `X-Frame-Options` headers.

## 10. Managed hosting alternative

The application also runs on managed platforms, with two changes: media must
move to object storage (an S3 adapter is not implemented yet — see
PROJECT_PROGRESS.md), and the database must be a managed PostgreSQL 17 with a
pooled connection URL. Until the S3 adapter exists, the VPS setup above is the
supported deployment.
