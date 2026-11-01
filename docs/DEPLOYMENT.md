# Deployment

> Status: **prepared, not yet deployed.** The production stack is built and
> smoke-tested in CI on every push (`docker` job, `infra/smoke/prod-smoke.sh`):
> HTTPS through Caddy, security headers, 401 on admin APIs, database not
> exposed, owner creation, sign-in, image upload, persistence across a restart,
> **backup, restore into a separate database, full disaster-recovery restore**,
> and graceful shutdown. It has not been deployed to a real server or domain —
> that needs a server, a domain and secrets that only the owner has, and
> choosing them may cost money, so it waits for the owner's decision (§11).

## 1. What runs in production

```
Internet ──443/80──► Caddy (HTTPS, Let's Encrypt, HTTP/3)
                        │  frontend network
                        ▼
                     app (Next.js standalone, non-root, read-only filesystem)
                        │  backend network (internal: no internet access)
                        ▼
                     db (PostgreSQL 17)        media volume (uploads) or S3 bucket
```

| Service   | Image                        | Notes                                                                                                     |
| --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `caddy`   | `caddy:2.10-alpine`          | Only service with published ports. Automatic certificates, HSTS comes from the app.                       |
| `app`     | `Dockerfile` target `runner` | `node server.js`; health check on `/api/v1/health`; `cap_drop: ALL`, `no-new-privileges`, read-only root. |
| `migrate` | target `tools`               | Runs `npm run db:migrate` as `site_owner`, then exits. `app` starts only if it succeeded.                 |
| `tools`   | target `tools`               | One-off commands (owner account, seed). Profile `tools`, never started by `up`.                           |
| `db`      | `postgres:17-alpine`         | Not published. Roles from `infra/postgres/prod-init/01-roles.sh` with passwords from the environment.     |

Every service logs to Docker's `json-file` driver with rotation (10 MB × 5 files),
so logs cannot fill the disk. `app`, `db` and `caddy` restart automatically
(`unless-stopped`).

## 2. Requirements

- A Linux VPS (1 vCPU, 1–2 GB RAM is enough) with Docker Engine 24+ and the Compose plugin.
- A domain with an `A` (and optionally `AAAA`) record pointing to the server, plus `www` if wanted.
- Ports 80 and 443 open in the provider firewall; port 22 restricted to your IP if possible.
- Somewhere off the server to copy backups to (§8).

## 3. Environment variables

`.env.production` (start from `.env.production.example`, `chmod 600`). The app
refuses to start with a clear list of missing or invalid **names** (never values).

| Variable                                                              | Required | Notes                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOMAIN`                                                              | yes      | `SITE_URL` becomes `https://DOMAIN`. Production refuses a non-HTTPS `SITE_URL` (except localhost for testing).                                                                                                                                              |
| `POSTGRES_SUPERUSER_PASSWORD`, `DB_OWNER_PASSWORD`, `DB_APP_PASSWORD` | yes      | `openssl rand -hex 32`. Hex only: base64 can contain `/ + =`, which break the database URLs.                                                                                                                                                                |
| `APP_SECRET`                                                          | yes      | `openssl rand -hex 32`. Signs contact-form tokens and sign-in tickets and encrypts 2FA secrets: **keep it stable.** After a change, authenticator-app codes stop working; sign in with a recovery code (or reset with `admin:create`) and set 2FA up again. |
| `LOG_LEVEL`                                                           | no       | `info` (default), `warn`, `error`, `debug`.                                                                                                                                                                                                                 |
| `STORAGE_DRIVER`, `S3_*`                                              | no       | Object storage for uploads (§7). Empty = the `media` volume.                                                                                                                                                                                                |
| `SMTP_URL`, `SMTP_FROM`, `CONTACT_NOTIFY_TO`                          | no       | Email for new contact messages (§9). Empty = off.                                                                                                                                                                                                           |

## 4. First deployment

```bash
git clone https://github.com/Ramssmb/Ram-s-smb-personal-digital-universe-.git /srv/personal-site
cd /srv/personal-site
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production            # DOMAIN and the four secrets (openssl rand -hex 32)

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f migrate app caddy
```

Then create the owner account and the starter structure:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm tools npm run admin:create
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm tools npm run db:seed
```

Sign in at `https://YOUR-DOMAIN/admin`, **turn on two-factor authentication**
(Account page), then fill in content following [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

Before pointing DNS at a fresh server you can run the same checks CI runs:
with `DOMAIN=localhost` in `.env.production`, `infra/smoke/prod-smoke.sh`
(it creates a test owner account and test data — run it on a throwaway
`.env.production`, then `down -v`).

## 5. Updates

```bash
cd /srv/personal-site
./infra/backup/backup.sh        # always before an update
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

`migrate` runs before the new `app` container starts; if a migration fails, the
old container keeps serving and `docker compose logs migrate` shows why.

## 6. Rollback

Migrations are forward-only. To roll back the application:

```bash
git log --oneline              # find the last good commit
git checkout <good-commit>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build app
```

If the bad release included a migration that must be undone, restore the
database from the backup taken before the release (§8).

## 7. Media storage

Two drivers, chosen with `STORAGE_DRIVER`:

- **`local` (default)** — files in the `media` Docker volume on the server.
  Free, simple, included in `backup.sh`. Fine for a single VPS.
- **`s3`** — any S3-compatible bucket (path-style requests, SigV4). Needed on
  hosts without a persistent disk, or to keep files off the server. Public
  files are still served through `/media/...` by the app (the bucket stays
  private); private files are only served to the signed-in owner.

```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<endpoint>       # HTTPS required in production
S3_REGION=auto                       # or the provider's region, e.g. eu-central-1
S3_BUCKET=<bucket>
S3_ACCESS_KEY_ID=<key with read/write on this bucket only>
S3_SECRET_ACCESS_KEY=<secret>
```

Tested in CI against a real S3-compatible server (SeaweedFS, with signature
checking): upload, variants, serving, replace, delete, and private files.
Not tested against a commercial provider — no account was created.

Switching drivers does not move existing files. Switch before uploading, or
copy the `media` volume's `storage/` tree into the bucket with the same keys.

**Provider options — not chosen; needs the owner's approval.** Prices and free
allowances change; check each provider's current pricing page before deciding.

| Option                                          | Cost model (verify before choosing)                | Notes                                                                    |
| ----------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Keep `local` on the VPS                         | Included in the server price                       | Recommended to start. Back up off-server (§8).                           |
| Cloudflare R2                                   | Free allowance, then per GB stored; no egress fees | `S3_REGION=auto`, endpoint `https://<account>.r2.cloudflarestorage.com`. |
| Backblaze B2                                    | Per GB stored, low; some free egress               | S3-compatible endpoint per region.                                       |
| AWS S3                                          | Per GB stored + per request + egress               | Most widely documented; usually the most expensive here.                 |
| Self-hosted (MinIO/SeaweedFS/Garage on the VPS) | Server cost only                                   | More to operate; little benefit over `local` on one server.              |

## 8. Backups and restore

### What is backed up

`infra/backup/backup.sh` writes to `BACKUP_DIR` (default `/var/backups/personal-site`):

- `db-<UTC timestamp>.dump` — `pg_dump` custom format of the whole database.
- `media-<UTC timestamp>.tar.gz` — the `media` volume (public and private
  uploads). Skipped with `STORAGE_DRIVER=s3`: enable versioning or backups at
  the bucket provider instead.

It keeps `BACKUP_KEEP_DAYS` days (default 14). Schedule it with cron:

```cron
30 2 * * *  cd /srv/personal-site && ./infra/backup/backup.sh >> /var/log/site-backup.log 2>&1
```

**Copy `BACKUP_DIR` off the server** (`rclone sync` to a bucket, `restic`, or
the provider's snapshot service). A backup on the same disk as the database is
not a backup. Choosing where costs money in most cases — owner's decision.

### Test a backup (safe at any time)

```bash
./infra/backup/restore.sh /var/backups/personal-site/db-YYYYMMDDTHHMMSSZ.dump
```

Restores into a **separate** database, `personal_site_restore_check`, without
touching the live site, then compares row counts (users, media, projects,
journal, messages, migrations) with the live database and checks that the
tables are owned by `site_owner`. Exit code 0 = identical; 2 = the copy differs
(expected if the site changed since the backup). Do this monthly.

### Disaster recovery (replaces the live database)

```bash
RESTORE_OVERWRITE=yes ./infra/backup/restore.sh /var/backups/personal-site/db-YYYYMMDDTHHMMSSZ.dump personal_site
# Media (only with the local driver). The archive is streamed in, so this works
# whichever host user owns the backup file:
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --no-deps -T \
  --entrypoint sh app -c "tar -xzf - -C /data" \
  < /var/backups/personal-site/media-YYYYMMDDTHHMMSSZ.tar.gz
```

Restoring media adds the files from the archive back; it does not delete files
uploaded after the backup.

The script stops the app, recreates the database, restores it as
`site_owner` (so later migrations still work) with `site_app`'s row-level
grants, and starts the app again. Anything written after the backup is lost.
Use the same `APP_SECRET` as before, or authenticator codes stop working
(recovery codes still do; then set two-factor authentication up again).

### How this was verified

Every CI run of the `docker` job, on the real production images: upload an
image → back up → check the media archive contains it → restore into the
separate check database (row counts match, `site_app` can read it) → add a
contact message → restore over the live database → the message is gone, the
site is healthy, sign-in works, the image is served, and `migrate` runs on the
restored database → delete the image from the media volume → restore it with
the media command above → it is served again. Database steps first passed on
commit `5fb7d4b` (2026-11-01); the media step was added afterwards (see
CHANGELOG.md).

## 9. Contact form email notifications

Off unless configured. Every message is always stored and shown under
Admin → Messages; email is only a notification and contains a link there.

```
SMTP_URL=smtps://USER:PASSWORD@smtp.provider.example:465   # or smtp://...:587 (STARTTLS)
SMTP_FROM=Website <site@your-domain>
CONTACT_NOTIFY_TO=you@your-inbox
```

URL-encode special characters in the password. The visitor's address is set as
Reply-To, never as From (so SPF/DKIM pass for your domain). Spam (honeypot or
too-fast submissions) never triggers an email. Failures are logged as
`contact notification failed` without the message content and never affect the
visitor. The Messages page shows whether notifications are on.

**Provider — not chosen; needs the owner's approval.** Any SMTP service works:
your mailbox provider's SMTP with an app password (for example Gmail or
Outlook — no extra cost, but sending limits apply and the From address should
be that mailbox), or a transactional email service (Brevo, Mailgun, Postmark,
Amazon SES, Resend…; most have a free tier — check current terms). For a
custom-domain From address, add the provider's SPF and DKIM DNS records.

Tested with a real SMTP server in the integration tests (delivery, Reply-To,
header-injection-safe subject, failure handling); not tested with a real provider.

## 10. Logging, errors and monitoring

- **Logs:** one JSON line per request (request id, method, path, status,
  duration) and errors with the same request id. Passwords, cookies, tokens,
  message bodies and SQL parameters are redacted; database errors are logged
  without the query. `docker compose logs -f app`; rotated automatically.
- **Error pages:** visitors see a plain error page with a short reference code;
  no stack traces or internals are sent to the browser. API errors return a
  generic message and the request id, which matches the log line.
- **Health:** `GET /api/v1/health` → `{"status":"ok"}` (200) or
  `"unavailable"` (503, database unreachable). Docker uses it to mark `app`
  unhealthy. Point a free external uptime monitor at
  `https://DOMAIN/api/v1/health` (e.g. UptimeRobot or Better Stack free tiers,
  or a self-hosted Uptime Kuma) to get an email when the site is down.
- **Maintenance:** the app prunes expired sessions and rate-limit rows, audit
  log entries older than 365 days and spam older than 30 days, hourly. It can
  also be run by hand: `docker compose ... run --rm tools npm run maintenance`.
- **Error alerting:** not built in, and no paid service was added. Options if
  wanted: self-hosted GlitchTip (Sentry-compatible, free, more to run) or
  Sentry's free tier — needs the owner's approval.
- **Disk:** `docker system df -v` for the `media` and `db-data` volumes; `df -h`
  for the backup directory.

## 11. Launch checklist

Decisions and purchases — **owner only; nothing here has been bought or registered**:

- [ ] Choose a VPS provider and size (§2) — monthly cost.
- [ ] Register or choose a domain — yearly cost.
- [ ] Choose where off-server backups go (§8).
- [ ] Optional: choose an SMTP provider (§9) and object storage (§7).

Server:

- [ ] SSH: key-only login, root login disabled, `ufw` allows 22/80/443 only.
- [ ] Unattended security updates enabled.
- [ ] Docker Engine and Compose plugin installed.

DNS and HTTPS:

- [ ] `A`/`AAAA` records for `DOMAIN` (and `www`) point at the server.
- [ ] After `up`, `curl -I https://DOMAIN` shows a valid certificate and the
      CSP, HSTS and `X-Frame-Options` headers; `http://` redirects to `https://`.

Application:

- [ ] `.env.production` has unique generated secrets and `chmod 600`.
- [ ] `migrate` exited with code 0; `/api/v1/health` returns `ok`.
- [ ] Owner account created; password long and unique, kept in a password manager.
- [ ] Two-factor authentication turned on and **recovery codes stored offline**.
- [ ] Profile and Settings filled in; every section reviewed against
      [CONTENT_GUIDE.md](CONTENT_GUIDE.md); nothing unconfirmed is published.
- [ ] Contact form sends a test message that appears in Admin → Messages
      (and arrives by email, if configured).

Operations:

- [ ] Backup cron installed; first backup copied off the server.
- [ ] `restore.sh <dump>` run once on the server and passed.
- [ ] External uptime monitor on `/api/v1/health`.
- [ ] Search engines: submit `https://DOMAIN/sitemap.xml` (optional).

## 12. Managed hosting alternative

The application also runs on managed platforms (any host that runs a Docker
image or a Node.js 24 server): use `STORAGE_DRIVER=s3` for media (§7), a
managed PostgreSQL 17 (run `npm run db:migrate` with the owner role as a
release step; the runtime uses the `site_app` role), and set `TRUST_PROXY_HOPS`
to the number of proxies in front of the app. This path is documented but not
tested; the VPS setup above is the tested deployment.
