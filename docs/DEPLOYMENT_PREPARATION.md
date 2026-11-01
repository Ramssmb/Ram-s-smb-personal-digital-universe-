# Deployment preparation report

Prepared 2026-11-01 for commit `3f819ad` (CI green: lint, unit, integration
incl. S3, end-to-end, production smoke test incl. backup and restore, audit).
Nothing has been purchased, registered or deployed.

This report is the plain-language companion to
[DEPLOYMENT.md](DEPLOYMENT.md) (the exact commands) and
[CONTENT_GUIDE.md](CONTENT_GUIDE.md) (what to write in the dashboard).

> **About prices:** every figure below is an approximate range from public
> price lists as of mid-2026, before tax. Prices, free allowances and exchange
> rates change. Check the provider's own pricing page — including the
> **renewal** price — before you pay for anything.

---

## 1. What you are deploying, in one paragraph

One small Linux server runs four Docker containers: **Caddy** (the web server
that gets free HTTPS certificates automatically), the **app** (the website and
dashboard), **PostgreSQL** (the database) and a one-off **migrate** container
that updates the database structure. Uploaded images live on the server's
disk. The only ongoing costs are the server and the domain; everything else
can stay on free options.

---

## 2. Every remaining task, classified

**Key:** 🛒 = 1. you must purchase or choose it · ✍️ = 2. you must provide
information or content · 🔧 = 3. I can prepare it in the repository ·
🧪 = 4. must be tested after deployment.

| #   | Task                                                                    | Type | Notes                                                                    |
| --- | ----------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| 1   | Choose a VPS provider, plan and region                                  | 🛒   | §3, §4                                                                   |
| 2   | Choose and register a domain name                                       | 🛒   | §5                                                                       |
| 3   | Choose an off-site backup destination                                   | 🛒   | §6 — free options exist                                                  |
| 4   | Decide whether to use email notifications, and which SMTP provider      | 🛒   | Optional — free options exist (§7)                                       |
| 5   | Decide whether to use object storage for uploads                        | 🛒   | Optional — not needed on a VPS (recommended: no)                         |
| 6   | Decide on `www.` (redirect it, or don't use it)                         | 🛒   | Affects DNS (§5)                                                         |
| 7   | Generate the secrets on the server                                      | ✍️   | You run `openssl rand -hex 32`; I never see the values (§8)              |
| 8   | Owner email address and password for the dashboard                      | ✍️   | Typed on the server, never stored in the repository                      |
| 9   | Email for Let's Encrypt certificate notices (optional)                  | ✍️   | Added to the Caddyfile on the server                                     |
| 10  | Website content: profile, about, education years, skills, projects…     | ✍️   | [CONTENT_GUIDE.md](CONTENT_GUIDE.md) — nothing unconfirmed is published  |
| 11  | Profile photo, project screenshots, social-sharing image                | ✍️   | Uploaded through the dashboard                                           |
| 12  | Social/profile links (GitHub, LinkedIn, …)                              | ✍️   | Dashboard → Content → Links                                              |
| 13  | Update the README status line (said v0.2.0)                             | 🔧   | ✅ Done                                                                  |
| 14  | A first-day server setup script or checklist for your chosen provider   | 🔧   | Once you have chosen one (firewall, swap, Docker install)                |
| 15  | An off-site backup sync command for your chosen destination             | 🔧   | Once you have chosen one (rclone/restic config template, no credentials) |
| 16  | Add the media-restore step to the CI smoke test                         | 🔧   | ✅ Done; the documented command was also fixed (file-permission problem) |
| 17  | Optionally add your Let's Encrypt email to the Caddyfile template       | 🔧   | Needs item 9                                                             |
| 18  | HTTPS certificate issued, `http://` redirects, security headers present | 🧪   | §11                                                                      |
| 19  | Owner sign-in, two-factor setup, recovery codes stored offline          | 🧪   | §11                                                                      |
| 20  | Contact form message arrives in the dashboard (and by email, if set up) | 🧪   | §11                                                                      |
| 21  | First backup, off-site copy, and a test restore on the real server      | 🧪   | §11                                                                      |
| 22  | Lighthouse performance re-measured on the real site                     | 🧪   | Local simulated LCP 2.7–2.8 s on image pages; real network may differ    |
| 23  | External uptime monitor on `/api/v1/health`                             | 🧪   | Free (§9, step 14)                                                       |
| 24  | Database port not reachable from the internet                           | 🧪   | §11                                                                      |

---

## 3. Hosting: recommendation and estimated monthly cost

**Recommendation: one small VPS (virtual private server) with 2 GB of RAM**,
from any mainstream provider with a data centre near your visitors (for India:
Mumbai, Bangalore or Singapore).

| Option                                       | Approx. monthly cost  | Good to know                                                                                                                           |
| -------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Hetzner Cloud (smallest shared plans)        | ~US$4–8               | Very good price; data centres in Europe, US and Singapore. Some plans charge extra for an IPv4 address.                                |
| DigitalOcean / Vultr / Linode (Akamai), 2 GB | ~US$10–14             | Beginner-friendly dashboards and docs; Indian regions available.                                                                       |
| Same providers, 1 GB                         | ~US$5–7               | Works only with swap added (§4); building the site will be slow.                                                                       |
| Provider's automatic backups (optional)      | +~20% of server price | Whole-server snapshots; useful in addition to, not instead of, the database backups.                                                   |
| Oracle Cloud "Always Free"                   | US$0                  | Possible, but needs a card, capacity is often unavailable, and free accounts can be reclaimed. Not recommended for a first deployment. |

**Expected total:** roughly **US$5–15 per month** for the server, plus the
domain (§5). Everything else in the recommended setup is free.

Managed platforms (Vercel, Render, Railway…) are possible but need object
storage and a managed database as well — more accounts, more moving parts, and
that path is not tested. Stay with the VPS.

---

## 4. Minimum production server specification

| Resource | Minimum                                                     | Recommended | Why                                                                                                         |
| -------- | ----------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| CPU      | 1 vCPU                                                      | 2 vCPU      | Image processing on upload; the build                                                                       |
| RAM      | 1 GB **plus 2 GB swap**                                     | 2 GB        | The Docker images are **built on the server** (`up --build`); a Next.js build can run out of memory on 1 GB |
| Disk     | 20 GB SSD                                                   | 40 GB SSD   | Docker images (~2–3 GB), database, uploads, 14 days of local backups                                        |
| OS       | Ubuntu 24.04 LTS or Debian 12                               | same        | Docker's official packages support both                                                                     |
| Network  | Public IPv4 address, ports 80 and 443 open                  | + IPv6      | Let's Encrypt must reach port 80/443 to issue the certificate                                               |
| Software | Docker Engine 24+ with the Compose plugin, `git`, `openssl` | same        | Installed in the first-day setup                                                                            |

---

## 5. Domain registration

**What you need:**

- A domain name you control, e.g. `yourname.dev`, `yourname.in`, `yourname.com`.
- Access to its **DNS settings** (at the registrar, or at Cloudflare's free DNS).
- Two DNS records once you have the server's IP address:

  | Type   | Name  | Value               | When                                |
  | ------ | ----- | ------------------- | ----------------------------------- |
  | `A`    | `@`   | server IPv4 address | Always                              |
  | `AAAA` | `@`   | server IPv6 address | If the server has IPv6              |
  | `A`    | `www` | server IPv4 address | Only if you want `www.` to redirect |

**Approximate yearly cost (first year / renewal often higher):**

| Ending | Approx. per year | Notes                                                          |
| ------ | ---------------- | -------------------------------------------------------------- |
| `.com` | ~US$10–15        | Most recognised                                                |
| `.in`  | ~₹500–1,000      | Indian domain; good for an India-based profile                 |
| `.dev` | ~US$12–20        | HTTPS-only by design (fine — this site is HTTPS-only)          |
| `.me`  | ~US$5–20         | Cheap first year at some registrars, renewal often much higher |

Registrars that sell close to cost and include free WHOIS privacy include
Cloudflare Registrar, Porkbun and Namecheap. Turn on **auto-renew** and
**two-factor authentication** at the registrar: losing the domain loses the
site.

**About `www.`:** the Caddy configuration redirects `www.yourdomain` to
`yourdomain`. If you do **not** create the `www` DNS record, Caddy will keep
trying (and failing) to get a certificate for it, which fills the logs. Either
create the record, or ask me to remove the `www` block (item 6).

---

## 6. Off-site backups

The server already makes a nightly backup (database + uploads) on its own
disk, keeps 14 days, and the restore procedure is tested in CI. What is
missing is a **copy somewhere else**, so that losing the server does not lose
the site.

| Option                                        | Approx. cost for this site      | Effort | Notes                                                                |
| --------------------------------------------- | ------------------------------- | ------ | -------------------------------------------------------------------- |
| **Backblaze B2** + `restic` or `rclone`       | Free up to 10 GB, then cents/GB | Low    | **Recommended.** S3-compatible; encrypted with restic.               |
| **Cloudflare R2** + `rclone`                  | Free up to 10 GB                | Low    | No download fees; needs a card on the account.                       |
| **Google Drive / OneDrive** + `rclone`        | Free within your existing quota | Medium | Uses a personal account; fine for a personal site; encrypt the copy. |
| Provider snapshots (Hetzner/DO/Vultr backups) | ~20% of server price            | None   | Same company as the server; a good extra layer, not the only one.    |
| Download to your own PC regularly (`scp`)     | Free                            | Manual | Easy to forget; better than nothing.                                 |

A personal site's backups are tiny (a few MB of database plus your images), so
the free tiers are very unlikely to be exceeded. **Encrypt** the off-site copy
(restic does this by default) — the database dump contains your password hash
and contact messages.

---

## 7. Optional services (all have free options)

- **Email notifications for contact messages** — any SMTP service. Free
  options: your Gmail/Outlook account with an **app password** (low daily
  limits, From must be that mailbox), or a transactional service's free tier
  (Brevo, Mailgun, Resend, Amazon SES…). Without it, messages still appear in
  the dashboard.
- **Object storage for uploads** — not needed on a VPS. Recommended: keep the
  default (`local`).
- **Error alerting** — not built in. Logs are kept on the server. Optional
  later: self-hosted GlitchTip or Sentry's free tier.

---

## 8. Environment variables you must configure

All go in `/srv/personal-site/.env.production` **on the server only**
(`chmod 600`, never committed — `.gitignore` already excludes it). Generate each
secret on the server with `openssl rand -hex 32` and store a copy in a password
manager.

### Required

| Variable                      | What to put                      | Rules                                                                                                        |
| ----------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DOMAIN`                      | Your domain, e.g. `yourname.dev` | No `https://`, no `www.`, no trailing slash                                                                  |
| `POSTGRES_SUPERUSER_PASSWORD` | Generated secret                 | Hex only                                                                                                     |
| `DB_OWNER_PASSWORD`           | Generated secret                 | Hex only. **Fixed when the database is first created** — changing it later in the file breaks the connection |
| `DB_APP_PASSWORD`             | Generated secret                 | Hex only. Same rule as above                                                                                 |
| `APP_SECRET`                  | Generated secret                 | 64 hex characters. Keep it stable: changing it stops authenticator-app codes (recovery codes still work)     |

### Optional (leave empty to keep the default)

| Variable                                                                                              | Default / when empty  | Use                                       |
| ----------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------- |
| `LOG_LEVEL`                                                                                           | `info`                | `warn` for quieter logs                   |
| `SMTP_URL`, `SMTP_FROM`, `CONTACT_NOTIFY_TO`                                                          | Email off             | Contact notifications; all three together |
| `STORAGE_DRIVER`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Uploads on the server | Only if you choose object storage         |

Set automatically by `docker-compose.prod.yml` — **do not add**: `SITE_URL`,
`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `TRUST_PROXY_HOPS`, `STORAGE_DIR`,
`NODE_ENV`. If something is missing or invalid the app refuses to start and
lists the variable **names** (never the values) in its log.

### Typed at the console, not stored in a file

- Owner email and password: asked by `npm run admin:create`.

---

## 9. Deployment steps, in order

Exact commands are in [DEPLOYMENT.md](DEPLOYMENT.md) §4. Do not skip ahead:
the HTTPS certificate can only be issued after DNS points at the server.

1. **Decide** everything in §13.
2. **Register the domain** and turn on auto-renew and registrar 2FA.
3. **Create the server** (Ubuntu 24.04, 2 GB RAM) with an SSH key, not a password.
4. **Secure the server:** create a non-root user with `sudo`, disable root and
   password SSH login, enable the firewall (allow 22, 80, 443 only), enable
   automatic security updates, add 2 GB swap if the server has 1 GB RAM.
5. **Install Docker** Engine and the Compose plugin (Docker's official guide).
6. **Point DNS** at the server (§5) and wait until `ping yourdomain` shows the
   server's address (minutes to a few hours).
7. **Clone the repository** to `/srv/personal-site`.
8. **Create `.env.production`** from the example, generate the secrets (§8),
   `chmod 600`.
9. **Start the stack:** `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`
   (the first build takes several minutes). Watch the logs until `migrate`
   exits with code 0 and Caddy reports a certificate.
10. **Create the owner account** (`run --rm tools npm run admin:create`) and
    **seed the structure** (`run --rm tools npm run db:seed`).
11. **Sign in** at `https://yourdomain/admin`, **turn on two-factor
    authentication**, and store the recovery codes offline.
12. **Run the post-deployment checks** (§11).
13. **Set up backups:** cron job for `infra/backup/backup.sh` (in the crontab of
    a user who can run Docker and write to `/var/backups/personal-site`), the off-site
    copy, and one test restore.
14. **Add an uptime monitor** (UptimeRobot, Better Stack free tier, or similar)
    on `https://yourdomain/api/v1/health`.
15. **Enter your content** (CONTENT_GUIDE.md), review each page on phone and
    desktop, then publish.
16. **Optional:** submit `https://yourdomain/sitemap.xml` to Google Search Console.

---

## 10. Rollback procedure

**Before every update**, take a backup: `./infra/backup/backup.sh`.

**If a new version misbehaves** (site is up but wrong):

1. `git log --oneline` — find the last version that worked.
2. `git checkout <that-commit>`
3. `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build app`
4. Check `https://yourdomain/api/v1/health` and sign in.

**If the update changed the database and that must be undone:** restore the
backup taken before the update (this loses anything written since):

```bash
RESTORE_OVERWRITE=yes ./infra/backup/restore.sh /var/backups/personal-site/db-<timestamp>.dump personal_site
```

**If the whole server is lost:** create a new server (steps 3–8, using the
**same** `.env.production` values from your password manager), copy the latest
backup files back from off-site, start the stack, restore the database as
above and the media as in DEPLOYMENT.md §8, then point DNS at the new server.

Database and media restore — both tested in CI on every push (production
smoke test).

---

## 11. Post-deployment security and backup verification

Do these once after the first deployment, and the backup ones monthly.

**Security**

- [ ] `https://yourdomain` shows a valid padlock; `http://yourdomain` redirects to `https://`.
- [ ] `curl -I https://yourdomain` shows `strict-transport-security`, `content-security-policy` and `x-frame-options: DENY`, and no `x-powered-by`.
- [ ] `https://yourdomain/api/v1/admin/collections/projects` returns **401** when signed out.
- [ ] From your own computer, the database port is closed: `nc -zv yourdomain 5432` fails.
- [ ] The firewall allows only 22, 80 and 443 (`sudo ufw status`).
- [ ] SSH password login is disabled; root login is disabled.
- [ ] Two-factor authentication is on; signing in asks for a code.
- [ ] Recovery codes are stored offline (printed or in a password manager).
- [ ] `.env.production` is `-rw-------` (`ls -l`), and a copy of its values is in your password manager.
- [ ] Nothing unconfirmed is published (CONTENT_GUIDE.md "Before launch").

**Backups**

- [ ] `./infra/backup/backup.sh` succeeds and creates a `db-*.dump` and `media-*.tar.gz`.
- [ ] `./infra/backup/restore.sh <latest db dump>` prints "Restore check passed".
- [ ] The cron job runs (check `/var/log/site-backup.log` the next day).
- [ ] The off-site copy contains the latest files, and you can download one back.
- [ ] Your password manager holds the backup encryption password (restic), if used.

**Operations**

- [ ] Uptime monitor shows "up" and sends you an email when you stop the app for a minute.
- [ ] A test message sent through the contact form appears in Admin → Messages.
- [ ] Lighthouse on the real site (mobile) — record the numbers in PROJECT_PROGRESS.md.

---

## 12. Actions that could cause charges

None of these has been done.

| Action                                               | Charge                                          | How to avoid surprises                                                           |
| ---------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Creating a VPS                                       | Monthly, often billed hourly from creation      | Delete test servers you no longer use — a stopped server is usually still billed |
| Choosing a larger plan, extra volumes, or extra IPv4 | Monthly                                         | Start with the smallest plan that meets §4                                       |
| Enabling provider backups or snapshots               | ~20% of server price / per GB                   | Optional                                                                         |
| Registering a domain                                 | Yearly; **renewal can cost more than year one** | Check the renewal price before buying                                            |
| Domain add-ons (premium DNS, email hosting, "SSL")   | Yearly                                          | Not needed: DNS is included and HTTPS is free via Caddy                          |
| Object storage / backup storage above the free tier  | Per GB stored, per request                      | Set a billing alert; this site stays far below free limits                       |
| Transactional email above the free tier              | Per email or monthly plan                       | Free tiers are far above a personal site's volume                                |
| Paid monitoring / error tracking plans               | Monthly                                         | Free tiers or self-hosted are enough                                             |
| Bandwidth above the plan's included transfer         | Per GB                                          | Included transfer (usually 1 TB+) is far above this site's needs                 |

Set a **billing alert** (most providers offer one) at a few dollars above the
expected monthly total.

---

## 13. Decisions to make before deployment

- [ ] **Hosting provider and plan** — recommended: a 2 GB VPS near your visitors (~US$5–15/month).
- [ ] **Server region** — e.g. Mumbai/Bangalore/Singapore for visitors in India.
- [ ] **Domain name and ending** — and which registrar; confirm the renewal price.
- [ ] **`www.`** — redirect it to the main domain (add the DNS record) or don't use it (I remove the redirect).
- [ ] **Off-site backup destination** — recommended: Backblaze B2 with restic (free at this size).
- [ ] **Provider snapshots** — yes (extra ~20%) or no.
- [ ] **Email notifications** — no / Gmail or Outlook app password / a transactional service.
- [ ] **Media storage** — recommended: keep uploads on the server (no object storage).
- [ ] **Uptime monitor** — which free service, and which email receives alerts.
- [ ] **Let's Encrypt notice email** — which address, or none.
- [ ] **Owner sign-in email** for the dashboard.
- [ ] **Password manager** to hold the secrets, owner password and recovery codes.
- [ ] **What content is ready to publish at launch**, and what stays as a draft.
- [ ] **Which repository items (§2, 🔧) you want me to prepare** — server setup checklist, backup sync template, Caddyfile email (each needs one of the decisions above).
