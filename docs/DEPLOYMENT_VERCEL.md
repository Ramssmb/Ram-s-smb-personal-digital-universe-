# Deploying to Vercel + Neon

Step-by-step set-up for the approved architecture (docs/VERCEL_ARCHITECTURE.md):
Vercel Hobby in Singapore (`sin1`), Neon Free in Singapore
(`aws-ap-southeast-1`) for the database and media, and an encrypted daily
off-site backup. Everything here is free and needs no card.

The Docker deployment (docs/DEPLOYMENT.md) is unchanged and still supported.

> **Status:** written before any account exists. Nothing has been deployed.
> Steps marked **(you)** need your own sign-in; never paste secrets into chat,
> issues or commits.

---

## 1. What changes on Vercel

| Concern              | Docker                       | Vercel                                                                |
| -------------------- | ---------------------------- | --------------------------------------------------------------------- |
| Uploads              | Posted to the app (15 MB)    | Browser → bucket with a signed URL, then processed by the app (15 MB) |
| Media storage        | Local volume or S3           | Neon Object Storage (`STORAGE_DRIVER=s3`)                             |
| Clean-up job         | Hourly, in the process       | Daily Vercel Cron → `/api/cron/maintenance`                           |
| Database connections | Pool of 10                   | Pooled Neon URL, pool of 1–3 per function instance                    |
| Backups              | `infra/backup/backup.sh`     | `.github/workflows/backup.yml` (encrypted, off-site)                  |
| Client IP            | `TRUST_PROXY_HOPS=1` (Caddy) | `TRUST_PROXY_HOPS=1` (Vercel overwrites `X-Forwarded-For`)            |
| Preview sign-in      | —                            | Each preview's own URL is accepted as an origin (preview only)        |

---

## 2. Accounts and privacy settings (you)

1. **GitHub:** turn on two-factor authentication.
2. **Vercel:** sign up with GitHub (Hobby). Turn on two-factor authentication.
3. **Vercel → Team Settings → Data Preferences → Opt-Out** of AI model
   training. Do this **before the first deployment**.
4. **Neon:** sign up with GitHub (Free). Turn on two-factor authentication.

---

## 3. Neon: projects, roles and buckets (you)

Create **three** projects, all in **AWS Asia Pacific (Singapore)**:

| Project                | Used for                                         |
| ---------------------- | ------------------------------------------------ |
| `ramsdevspace-prod`    | The live site                                    |
| `ramsdevspace-preview` | Vercel preview deployments — generated test data |
| `ramsdevspace-backup`  | Only the encrypted backup files (bucket only)    |

Do **not** make preview a branch of production: branches inherit the
parent's rows and files.

### 3.1 Roles (prod and preview)

In each database project open the SQL Editor (as the default owner role) and
run, with your own generated passwords
(`node -e "console.log(crypto.randomBytes(24).toString('hex'))"`):

```sql
CREATE ROLE site_owner LOGIN PASSWORD '<owner password>';
CREATE ROLE site_app LOGIN PASSWORD '<app password>';
CREATE ROLE site_backup LOGIN PASSWORD '<backup password>';   -- prod only

GRANT ALL ON SCHEMA public TO site_owner;
GRANT USAGE ON SCHEMA public TO site_app;
ALTER DEFAULT PRIVILEGES FOR ROLE site_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO site_app;
ALTER DEFAULT PRIVILEGES FOR ROLE site_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO site_app;

-- prod only: read-only access for the backup job
GRANT USAGE ON SCHEMA public TO site_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE site_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO site_backup;
```

After the first migration (§5), also run in prod:

```sql
GRANT USAGE ON SCHEMA drizzle TO site_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA drizzle TO site_backup;
```

### 3.2 Connection strings

From **Connect** in each project copy two URLs (both with `sslmode=require`):

- **Pooled** (host contains `-pooler`) as `site_app` → `DATABASE_URL`
- **Direct** as `site_owner` → `MIGRATION_DATABASE_URL` (migrations only, kept on your PC)
- **Direct** as `site_backup` (prod) → `BACKUP_DATABASE_URL` (GitHub secret)

### 3.3 Buckets

| Project                | Bucket    | Access    |
| ---------------------- | --------- | --------- |
| `ramsdevspace-prod`    | `media`   | `private` |
| `ramsdevspace-preview` | `media`   | `private` |
| `ramsdevspace-backup`  | `backups` | `private` |

Credentials (Neon CLI `neon credentials create` or the API):

| Use                        | Project | Scopes                          |
| -------------------------- | ------- | ------------------------------- |
| Site (Vercel Production)   | prod    | `storage:read`, `storage:write` |
| Site (Vercel Preview)      | preview | `storage:read`, `storage:write` |
| Backup job — read media    | prod    | `storage:read`                  |
| Backup job — write backups | backup  | `storage:read`, `storage:write` |
| Your PC — fetch backups    | backup  | `storage:read`                  |

The secret is shown once; put it straight into Vercel / GitHub, not a file.

### 3.4 Bucket CORS (prod and preview media buckets)

The browser uploads directly, so each media bucket must allow `PUT` from the
site. With the AWS CLI (`--endpoint-url <s3_endpoint>`), `put-bucket-cors` with:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://ramsdevspace.com", "https://<project>.vercel.app"],
      "AllowedMethods": ["PUT"],
      "AllowedHeaders": ["content-type"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

For the preview bucket use the preview URLs (`https://<project>-git-<branch>-<team>.vercel.app`).

---

## 4. Vercel project (you, with the checklist)

1. **Add New → Project**, import the GitHub repository. Framework: Next.js
   (detected). Build command and output: defaults.
2. **Settings → Functions → Function Regions:** Singapore (`sin1`) — also set
   in `vercel.json`.
3. **Settings → Deployment Protection:** Vercel Authentication **on** for
   Preview deployments.
4. **Settings → Environment Variables** (mark secrets **Sensitive**):

| Variable                                    | Production                                                                   | Preview                                |
| ------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| `SITE_URL`                                  | `https://ramsdevspace.com` (or the `vercel.app` URL until the domain exists) | the branch preview URL                 |
| `DATABASE_URL`                              | prod pooled URL, `site_app`                                                  | preview pooled URL, `site_app`         |
| `DATABASE_POOL_MAX`                         | `3`                                                                          | `3`                                    |
| `APP_SECRET`                                | new random value                                                             | a **different** random value           |
| `TRUST_PROXY_HOPS`                          | `1`                                                                          | `1`                                    |
| `STORAGE_DRIVER`                            | `s3`                                                                         | `s3`                                   |
| `UPLOAD_MODE`                               | `direct`                                                                     | `direct`                               |
| `S3_ENDPOINT`                               | prod `s3_endpoint`                                                           | preview `s3_endpoint`                  |
| `S3_REGION`                                 | `ap-southeast-1`                                                             | `ap-southeast-1`                       |
| `S3_BUCKET`                                 | `media`                                                                      | `media`                                |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | prod site credentials                                                        | preview site credentials               |
| `CRON_SECRET`                               | random, ≥ 16 characters                                                      | (unset — cron runs on production only) |
| `LOG_LEVEL`                                 | `info`                                                                       | `info`                                 |

Leave `SMTP_URL` unset (email notifications stay off). Vercel sets
`VERCEL_ENV`, `VERCEL_URL` and `VERCEL_BRANCH_URL` itself.

If the database ever rejects prepared statements through the pooler, add
`DATABASE_PREPARE=false`.

---

## 5. Migrations and the owner account (your PC)

Migrations never run during the build or in a function. On your PC, with the
**direct** `site_owner` URL in a terminal variable (not in `.env` committed
anywhere):

```bash
MIGRATION_DATABASE_URL='<direct site_owner URL>' npm run db:migrate
```

Order for every release with a new migration: backup (§6) → migrate preview →
test the preview → migrate production → promote the deployment.

Create the owner account once per database, with a **new** password (never the
one used locally), then enable two-factor authentication on the Account page
and store the recovery codes offline:

```bash
DATABASE_URL='<direct site_app URL>' SITE_URL='https://ramsdevspace.com' APP_SECRET='<prod APP_SECRET>' npm run admin:create
```

---

## 6. Backups

### 6.1 Encryption key (you, once)

Install [age](https://github.com/FiloSottile/age) on your PC and run:

```bash
age-keygen -o site-backup-key.txt
```

Keep `site-backup-key.txt` **offline** (and a second copy, e.g. on a USB
drive). The line `# public key: age1…` is the public key.

### 6.2 GitHub settings (you)

Repository → Settings → Environments → **New environment** `production`
(no required reviewers, so the schedule is not blocked). Add:

- Variable `BACKUP_AGE_RECIPIENT` = the `age1…` public key.
- Secrets: `BACKUP_DATABASE_URL`, `MEDIA_S3_ENDPOINT`, `MEDIA_S3_REGION`,
  `MEDIA_S3_BUCKET`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`,
  `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`,
  `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`.

The workflow runs daily at 03:00 IST (and on demand from the Actions tab). It
dumps the database, copies the media, **restores the dump into a fresh
PostgreSQL and compares row counts**, then encrypts and uploads one file and
keeps the newest 14. Nothing is uploaded as a workflow artifact — the
repository is public. Until the settings exist it skips with a notice.

The dump and restore check is `infra/backup/dump-and-verify.sh`; CI runs the
same script against its test database on every pull request. Row counts are
compared for your content tables; sign-ins, rate limits, unfinished uploads,
the audit log and contact messages can change while the job runs and are not
compared.

> **Risk:** the backup job's write key can also delete files in the backup
> bucket (it removes backups older than the newest 14), and Neon Object
> Storage has no deletion lock. Someone who obtained that key could delete
> every off-site backup. Keep it only in the GitHub `production` environment,
> never on your PC (use the read-only key there), replace it if it may have
> leaked, and keep the weekly copy on your PC (§6.3) — that copy is the one
> the key cannot reach.

### 6.3 Weekly copy on your PC

With the read-only backup credentials in your local `.env`
(`BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`,
`BACKUP_S3_SECRET_ACCESS_KEY`, optional `BACKUP_S3_REGION`):

```bash
npm run backup:fetch
```

It saves the newest file into `backups/` (ignored by Git). It stays encrypted.

### 6.4 Restore

```bash
age --decrypt -i site-backup-key.txt -o backup.tar.gz backups/site-backup-<time>.tar.gz.age
tar -xzf backup.tar.gz
```

The archive contains `database.dump` (restore with `pg_restore --no-owner
--no-privileges --dbname=<direct site_owner URL of an EMPTY database>`),
`media/` (upload back with `aws s3 sync media/ s3://media/ --endpoint-url …`),
`media.sha256` (verify with `sha256sum -c`) and `manifest.txt`. Restore into a
new Neon project or branch first; never over production unless production
is lost.

Neon also keeps 6 hours of instant restore history on the Free plan
(Console → Branches → Restore) for mistakes noticed quickly.

---

## 7. Preview, then production

1. Push a branch → Vercel builds a protected preview.
2. Run the test plan in docs/VERCEL_ARCHITECTURE.md §8 against the preview.
3. Merge to `main` → production deployment.
4. Settings → Cron Jobs: confirm `/api/cron/maintenance` is listed; after the
   first night, its log shows `maintenance finished`.
5. Settings → Domains (after the domain is bought): add `ramsdevspace.com`
   and `www.ramsdevspace.com` (redirect to the apex); update `SITE_URL` and
   the bucket CORS origins; redeploy.

---

## 8. Limits to keep in mind

- Hobby: personal, non-commercial use only; runtime logs kept 1 hour; cron
  once a day (may run any time in the chosen hour).
- Neon Free: 1 GB database, 5 GB media, **5 GB network transfer per month —
  exceeding it suspends the database until next month**. Public images are
  served with a one-year immutable cache so Vercel's CDN absorbs repeat views;
  check the Neon usage page in the first weeks.
