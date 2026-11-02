# Vercel compatibility and architecture

Status: **approved by the owner on 2026-11-02 (all decisions in §10) and
implemented on the `vercel-support` branch** — see §8. No provider account,
deployment or production database exists yet. Revision 3, 2026-11-02.
Set-up steps: [DEPLOYMENT_VERCEL.md](DEPLOYMENT_VERCEL.md).

All facts below come from official provider pages, accessed **2026-11-02**
(links in §11). Prices and terms change; re-check them on the day you sign up.

The Docker Compose deployment (docs/DEPLOYMENT.md) stays supported. Every
change proposed here is additive and off by default.

Confirmed branding: display name **Ram**, brand **Ram's Dev Space**, tagline
**Your Personal Digital Universe**, preferred domain **ramsdevspace.com**
(not purchased).

---

## 1. Recommendation (revised)

| Layer            | Choice                                                        | Cost   | Payment method needed                        |
| ---------------- | ------------------------------------------------------------- | ------ | -------------------------------------------- |
| Hosting          | **Vercel Hobby**, function region **`sin1` (Singapore)**      | ₹0     | None for Hobby (Pro would need a card — §7)  |
| Database         | **Neon Free**, region **`aws-ap-southeast-1` (Singapore)**    | ₹0     | Neon states no card is required for Free     |
| Media storage    | **Neon Object Storage** (5 GB per project, Free)              | ₹0     | Same Neon account                            |
| Preview data     | **Separate Neon project** (not a branch of production)        | ₹0     | —                                            |
| Backups          | GitHub Actions → encrypted archive → separate store + your PC | ₹0     | — (decision §10 item 6)                      |
| Email (optional) | Off at launch                                                 | ₹0     | Not researched to a conclusion (§9)          |
| Domain           | ramsdevspace.com (Hostinger India, UPI)                       | yearly | UPI (earlier research; re-check at purchase) |

Why Singapore: Neon has no India region; Singapore is Neon's closest region
and Vercel has `sin1` there, so the function and database sit side by side.
Vercel also has `bom1` (Mumbai), but placing functions in Mumbai with the
database in Singapore adds a round trip to every query.

Cloudflare R2 is **not** recommended: its getting-started page requires an
"R2 subscription" through a checkout flow before use, and Cloudflare's status
history shows R2 enablement depends on a payment method on file (§7).

Main risks of this design (details in §2–§6):

1. Vercel Hobby content may be used for **AI model training unless you opt
   out** — opt out before the first deployment.
2. Neon Free **5 GB/month network transfer**; going over **suspends compute**
   (the site goes down) until the next month. Images must be served through
   Vercel's CDN cache, not straight from Neon on every view.
3. Neon Object Storage became generally available only in **September 2026**,
   and its S3 interface is a subset; the direct-upload design must be proven
   on a preview first.
4. Backups: Neon Free keeps only **6 hours** of restore history; the off-site
   backup job is required, not optional.

---

## 2. Architecture

```
                 Visitor / owner browser
                   │                 │
                   │ HTTPS           │ (owner only) presigned PUT, ≤15 MB,
                   ▼                 │  5-minute URL, one exact object key
┌──────────────── Vercel Hobby ──────┼────────────────────────────────────┐
│ CDN (126 PoPs): static assets;     │                                    │
│   caches /media/* public responses │                                    │
│ Proxy: CSP nonce, noindex headers  │                                    │
│ Node functions in sin1:            │                                    │
│   pages, /admin, /api/v1/*         │                                    │
│   /api/v1/admin/media/uploads  ────┼─ creates intent + presigned URL    │
│   /api/v1/admin/media/uploads/:id/complete ─ validates, sharp, stores   │
│   /media/* (public prefix only)    │                                    │
│   /api/cron/maintenance ◄── Vercel Cron, daily, Bearer CRON_SECRET      │
└──────┬─────────────────────────────┼──────────────────┬─────────────────┘
       │ TLS, pooled URL (PgBouncer) │                  │ SigV4 (server-only keys)
       ▼                             ▼                  ▼
┌─────────────── Neon project "ramsdevspace-prod" (aws-ap-southeast-1) ────┐
│ Postgres branch main            Object Storage bucket (private)          │
│  roles: site_owner (migrate)      incoming/<random>   ← browser PUT      │
│         site_app (runtime)        public/…, private/… ← function only    │
└──────────────┬───────────────────────────────────────────────────────────┘
               │ direct (unpooled) URL: pg_dump; S3 GET: media copy
               ▼
┌──── GitHub Actions (scheduled) ─────┐      ┌──────────────────────────────┐
│ encrypt with age public key         │ ───► │ separate store (decision)    │
│ never uploaded as a workflow        │      │ + periodic copy on owner PC  │
│ artifact (the repository is public) │      └──────────────────────────────┘
└─────────────────────────────────────┘

Neon project "ramsdevspace-preview" (separate project, test data only)
   ◄── Vercel Preview deployments (protected by Vercel Authentication)
Local PostgreSQL + ./storage  ◄── development on the owner's PC
```

---

## 3. Vercel terms, privacy and AI training

Sources: Terms of Service (last updated **19 October 2026**), Fair Use
Guidelines (updated 2026-09-14), Terms update changelog (March 2026), Runtime
Logs docs.

### 3.1 Hobby: personal / non-commercial

- Terms §4: "You shall only use the Services under a Hobby plan for your
  personal or non-commercial use."
- Fair Use Guidelines define commercial usage as a deployment used "for the
  purpose of financial gain of **anyone** involved in **any part of the
  production**", with examples: taking payments, advertising a product or
  service for sale, being paid to build or host the site, affiliate links as
  the main purpose, ads such as AdSense. Donations are not commercial.

**A personal portfolio used for job and internship applications** is not on
the list of examples: it takes no payments, sells nothing, shows no ads and
nobody is paid to build or host it. On that reading it is personal use.
However, Vercel does not address job-seeking portfolios explicitly, and the
definition is broad ("financial gain of anyone"). **This is an interpretation,
not a ruling.** Safest course: keep the site free of ads, paid services,
affiliate links and "hire me for paid work" offers, and, if you want
certainty, ask Vercel Support (the guidelines invite this). If you later offer
paid freelance services on the site, Hobby no longer fits.

### 3.2 Content licence and AI model training

- Terms §3 "Your Content": software, code, data, text and other materials you
  "upload, post, deliver, provide or otherwise transmit or store" in
  connection with the Services.
- Hobby (and trial Pro): "we may use Your Content to train our artificial
  intelligence … models, and we may share Your Content with third parties"
  for their products, including AI training ("Model Training"). Paid Pro is
  off by default; Enterprise is excluded.
- Changelog (March 2026): training data named as **code and Vercel agent
  chats, build and deployment telemetry and build errors, and aggregate
  traffic statistics**. "Personal information, account details, environment
  variables, API keys" are stated to be anonymised and redacted first.
- **Opt-out:** Team Settings (not Account Settings) → **Data Preferences** →
  switch from Opt-In to Opt-Out; per-project control is also possible.
  Opting out stops future use; "Data that may have been shared before you
  opted out can't be unshared retroactively."

### 3.3 What this means for this site

| Data                                                               | Where it lives in the recommended design   | Exposure to Vercel                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Source code (public GitHub repo)                                   | GitHub; built by Vercel                    | Already public; Vercel receives it at build time — in "Your Content" scope                                             |
| Public pages and public media                                      | Neon DB / Neon storage; rendered by Vercel | Public anyway; passes through and is cached by Vercel's CDN                                                            |
| **Drafts, private media, contact messages, sessions, 2FA secrets** | **Neon** (not Vercel storage)              | Processed in memory by functions per request; **not stored by Vercel** except what the app logs or what the CDN caches |
| Environment variables (secrets)                                    | Vercel project settings                    | Stored by Vercel; stated to be excluded/redacted from training                                                         |
| Runtime logs                                                       | Vercel                                     | Request path, query string, user agent, host and app log lines; **Hobby keeps 1 hour**                                 |

Whether data a function merely _processes_ (drafts, contact messages) counts
as "Your Content" is **not stated** in the Terms or the changelog. Treat it as
possibly in scope and minimise what reaches Vercel's persistent systems:

- API responses default to `Cache-Control: no-store` (`src/server/http/handler.ts`)
  and private files to `private, no-store`, so the CDN should not store them — **verify on preview**
  (`x-vercel-cache` must not be `HIT` for private URLs).
- The logger already drops query text and parameters from database errors
  (CHANGELOG 0.2.1); keep it from logging message bodies or emails.
- Search terms appear in request query strings in Vercel's logs (1 hour).

### 3.4 Safest account configuration

1. Create the Vercel account by signing in with GitHub; keep it a personal Hobby team.
2. **Before the first deployment:** Team Settings → Data Preferences → **Opt-Out**.
3. Enable two-factor authentication on the Vercel and GitHub accounts.
4. Deployment Protection: **Vercel Authentication on for Preview** deployments.
5. Environment variables: production secrets only in the **Production**
   scope; preview gets its own values; mark secrets **Sensitive**.
6. Do not install Marketplace integrations that copy data (e.g. log drains) unless needed.
7. Function region `sin1`; leave Fluid compute default.
8. Keep the site non-commercial (§3.1).

---

## 4. Neon (database and object storage)

| Item                          | Official finding                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Postgres storage              | 1 GB per project (20 GB across projects); writes that grow storage fail at the cap; data is not deleted                                                                                                                              |
| Compute                       | **100 CU-hours per project per month**, autoscale up to 2 CU; scales to zero after 5 min idle (cannot be disabled)                                                                                                                   |
| Branches / projects           | 10 branches per project; up to 100 projects                                                                                                                                                                                          |
| Restore window                | 6 hours of history (1 GB cap)                                                                                                                                                                                                        |
| Network transfer              | **5 GB per project per month**; when exceeded **compute is suspended** until the next period or an upgrade                                                                                                                           |
| Object Storage free allowance | **5 GB per project**                                                                                                                                                                                                                 |
| Object Storage status         | Beta from 15 July 2026; Neon's blog update says the backend is **generally available since September 2026**                                                                                                                          |
| Object Storage regions        | us-east-2, us-east-1, eu-central-1, **ap-southeast-1 (Singapore)**                                                                                                                                                                   |
| S3 API                        | Path-style only. Put/Get/Head/Delete, ListObjectsV2, CopyObject, multipart, **presigned PUT/GET** (SigV4, `X-Amz-Expires`), POST form uploads, **bucket CORS** supported. Bucket policies/ACLs not supported (access is set in Neon) |
| Bucket access                 | `private` (default) or `public_read`                                                                                                                                                                                                 |
| Credentials                   | Per branch, scopes `storage:read` / `storage:write`; secret shown once                                                                                                                                                               |
| Branching of objects          | A child branch inherits the parent's objects (copy-on-write) — **a preview branch of production would contain production files**                                                                                                     |
| DeleteObject                  | Soft delete on the current branch                                                                                                                                                                                                    |
| Card for Free                 | Pricing page: not required; Free is permanent, not a trial                                                                                                                                                                           |
| Paid plan (Launch)            | Usage-based: $0.106 per CU-hour, $0.35 per GB-month; Neon estimates ~$15/month for a small DB. Payment methods not listed                                                                                                            |
| Regions                       | Singapore available; **no India region**; no plan restriction stated                                                                                                                                                                 |

### 4.1 Data transfer — the important limit

5 GB/month is shared by the project. If public images were downloaded from
Neon on every page view, a few thousand views of image-heavy pages could use
it up and **suspend the database — taking the site offline**. Mitigation
(design requirement):

- Public media stays behind `/media/*`, which already sends
  `Cache-Control: public, max-age=31536000, immutable` with content-addressed
  keys, so Vercel's CDN serves repeats without touching Neon.
- Whether Neon counts object-storage egress in the 5 GB is **not stated**;
  assume it does.
- Watch usage in the Neon console during the first weeks.

### 4.2 Neon versus Cloudflare R2

|                           | Neon Object Storage (Free)                 | Cloudflare R2                                                                                 |
| ------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Free storage              | 5 GB per project                           | 10 GB-month (Standard class)                                                                  |
| Operations                | Not stated                                 | 1M Class A, 10M Class B per month                                                             |
| Egress                    | Counted in 5 GB project transfer (assumed) | **Free**                                                                                      |
| S3 API / presigned / CORS | Yes (subset)                               | Yes (mature)                                                                                  |
| Maturity                  | GA since Sept 2026                         | GA for years                                                                                  |
| Payment                   | No card stated for Free                    | **Requires an R2 subscription via checkout; a payment method on file is needed to enable R2** |
| Fits UPI/RuPay?           | Yes                                        | **Not verified — likely no**                                                                  |

R2 would be technically better (free egress, maturity) but cannot be
recommended until you confirm Cloudflare accepts your RuPay card or UPI at
the R2 checkout. Do not enter card details to test it.

---

## 5. Direct-to-storage upload design (keeps the 15 MB limit)

Vercel functions accept at most **4.5 MB** per request or response. The
function never receives the file: the browser sends it straight to the
bucket, and the function fetches it from storage (outgoing fetches from a
function are not subject to the 4.5 MB body limit).

### 5.1 Flow

1. **Request an upload** — `POST /api/v1/admin/media/uploads`
   `{ filename, size, contentType, access, altText }` (or `mediaId` to replace).
   The server checks: owner session, same-origin (`assertSameOrigin`),
   rate limit (`uploadsPerUser`), `size` 1 B–15 MB (10 MB for images),
   `contentType` in the allow-list. It inserts an **upload intent** row
   (`id`, `userId`, random key `incoming/<uuid>`, declared size and type,
   target media id for replacement, `expires_at = now + 10 min`, `used_at`).
   It returns a **presigned PUT** URL for exactly that key, valid 5 minutes,
   with `Content-Type` and `Content-Length` included in the signed headers.
2. **Upload** — the browser `PUT`s the bytes to the URL. Bucket CORS allows
   `PUT` only from the site origin.
3. **Complete** — `POST /api/v1/admin/media/uploads/:id/complete`. The server
   checks owner session, same-origin, intent belongs to this user, not
   expired, not used; marks it used (single use, in one `UPDATE … WHERE used_at
IS NULL`). It `HEAD`s the object: size must be ≤ limit and equal the
   declared size. It downloads the object and runs the **existing**
   `storeFile` logic unchanged: signature sniffing, sharp decode with
   `limitInputPixels`, EXIF/GPS removal, WebP re-encode, resize to variant
   widths, PDF pass-through. Results go to `public/` or `private/` keys
   exactly as today; the media row is inserted (new) or updated
   (replacement: same kind check, old keys deleted after the row update).
4. **Clean-up** — the `incoming/` object is deleted on success and on every
   failure. The daily cron also deletes `incoming/` objects and intents older
   than 1 hour (covers abandoned uploads).

### 5.2 Why unauthorised users cannot upload

- Bucket credentials exist only in server environment variables; the browser
  never receives them.
- A presigned URL is issued only to a signed-in owner session after the
  Origin check and rate limit; it allows **one PUT to one random key** for
  5 minutes and nothing else (no list, no read, no other key).
- Anything put into `incoming/` is **never served**: `/media/*` reads only the
  `public/` prefix, private files are streamed only to the owner by
  `/api/v1/admin/media/:id/file` (`private, no-store`), and the bucket is private.
- A file only becomes media after `complete`, which re-validates everything;
  an attacker who obtains a URL can at most place one ≤15 MB object that is
  deleted within a day.
- Signed `Content-Length` should make the store reject other sizes. Neon does
  not document this enforcement, so the `HEAD` size check in step 3 is the
  authoritative check either way.

### 5.3 What is preserved

File type validation (magic bytes, server-side), size limits (15 MB / 10 MB),
private permissions (`private/` prefix, owner-only file route), image processing
and resizing (same sharp code), replacement (same kind rule, new keys, old
keys removed), deletion rules (files in use cannot be deleted — unchanged),
database references (same `media_assets` rows and usages).

### 5.4 Docker and local development

Unchanged. The current multipart upload stays the default
(`UPLOAD_MODE=form`). The direct flow is enabled only with
`STORAGE_DRIVER=s3` and `UPLOAD_MODE=direct`. CI keeps testing both, the
direct flow against SeaweedFS (which supports presigned URLs).

### 5.5 Remaining unknowns to prove on preview

- Neon presigned PUT with signed `Content-Length` and `Content-Type`.
- Neon bucket CORS for `PUT` from the site origin.
- sharp memory/time on a 10 MB image in a 2 GB Hobby function (expected fine).

---

## 6. Database, regions, migrations and scheduled tasks

### 6.1 Connection pooling with postgres.js and Drizzle

- Neon's pooled endpoint is PgBouncer in **transaction mode**. Not supported
  there: session `SET`, `LISTEN/NOTIFY`, SQL-level `PREPARE`, session advisory
  locks, `WITH HOLD` cursors. **Protocol-level** prepared statements are
  supported (PgBouncer ≥ 1.22).
- This code base: no `LISTEN/NOTIFY`, no advisory locks, no session `SET`
  (searched `src/`). postgres.js uses protocol-level prepared statements, so
  the pooled URL should work as is.
- Proposed: `DATABASE_POOL_MAX=1`–`3` on Vercel, and an optional
  `DATABASE_PREPARE=false` switch as a fallback if the pooler misbehaves.
  Default stays as today for Docker.
- `ssl: require` (Neon requires TLS — the URL carries `sslmode=require`).
- **Direct (unpooled) URL** for migrations and `pg_dump`, as Neon advises.

### 6.2 Region

Vercel Hobby: **one** function region. Default `iad1` (USA) — must be changed
to `sin1` in Project Settings → Functions (or `"regions": ["sin1"]` in
`vercel.json`) to sit beside Neon `aws-ap-southeast-1`.

### 6.3 Preview and production separation

- Two **separate Neon projects**: `ramsdevspace-prod` and
  `ramsdevspace-preview`. A branch of production would inherit production
  rows **and files** (copy-on-write), so branches are not used for preview.
- Vercel env vars: production `DATABASE_URL`/storage keys only in the
  Production scope; preview values only in Preview.
- Preview deployments behind Vercel Authentication; preview data is
  generated test data only.

### 6.4 Safe migrations

- Run `npm run db:migrate` from your PC with the `site_owner` role and the
  **direct** URL (DEPLOYMENT_VERCEL.md §5). Never at build time and never
  inside a function. The owner credential therefore never sits in Vercel or
  GitHub.
- Order: back up → migrate preview → test → migrate production → promote the
  deployment. Migrations stay additive (Drizzle migration files reviewed in PRs).
- `site_app` (runtime) has no DDL rights; only it is given to Vercel.

### 6.5 Clean-up job and session security

Verified in code:

- Sessions are valid only when `expires_at > now` and not revoked
  (`src/server/auth/session.ts:75`) — expiry is enforced on every request,
  independent of clean-up.
- Rate limits use fixed windows keyed by window start
  (`src/server/security/rate-limit.ts:25`) — old rows simply stop matching;
  pruning only saves space.
- 2FA tickets are signed with their own expiry.

So daily instead of hourly clean-up affects **only table size**, not
security. Plan: `GET /api/cron/maintenance` (Bearer `CRON_SECRET`, compared in
constant time), `vercel.json` cron `0 20 * * *` (≈ 01:30–02:29 IST; Hobby may
run any time within the hour). Vercel does not retry failed runs and may
deliver twice — `runMaintenance` is already idempotent (deletes by age).
The in-process `setInterval` stays for Docker and is skipped when
`process.env.VERCEL` is set.

---

## 7. Payment compatibility (UPI and RuPay only)

| Provider / service           | Free tier needs a payment method?                                                         | To upgrade                                                                                                                     | Works with UPI/RuPay?                       |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **Vercel Hobby**             | **No**                                                                                    | Pro: "Credit/Debit card only" — Amex, UnionPay, Discover/Diners, JCB, Mastercard, Visa; prepaid and some virtual cards invalid | **No** for Pro (RuPay and UPI not listed)   |
| **Neon Free**                | **No** (stated on pricing page)                                                           | Payment methods not published                                                                                                  | Unknown for paid — not needed now           |
| Neon Object Storage          | Included in Neon Free (5 GB)                                                              | Billed with Neon                                                                                                               | Same as Neon                                |
| **Cloudflare R2**            | **Yes in practice** — R2 subscription checkout; enablement needs a payment method on file | Usage billing                                                                                                                  | Not verified; assume **no**                 |
| GitHub Actions (public repo) | No                                                                                        | —                                                                                                                              | —                                           |
| Hostinger India (domain)     | n/a                                                                                       | One-time yearly purchase                                                                                                       | UPI (earlier research; confirm at checkout) |
| SMTP providers               | Not verified                                                                              | —                                                                                                                              | Not verified                                |

Categories:

- **No payment method needed:** Vercel Hobby, Neon Free (incl. Object Storage), GitHub Actions.
- **Card needed even for free use:** Cloudflare R2.
- **Payment only when upgrading:** Vercel (Pro, card only — not usable for you), Neon (Launch, method unknown).

---

## 8. Code changes (implemented on branch `vercel-support`)

All are off by default; Docker behaviour is unchanged. Files:
`src/server/media/direct-upload.ts`, `src/app/api/v1/admin/media/uploads/**`,
`src/app/api/cron/maintenance/route.ts`, `src/components/admin/upload.ts`,
`drizzle/0003_direct_uploads.sql`, `vercel.json`,
`.github/workflows/backup.yml`, `scripts/backup-fetch.ts`.
Verification status is in PROJECT_STATUS_REPORT.md. Migrations run from the
owner's PC (§6.4) rather than a workflow.

1. Direct uploads (§5): two routes, `upload_intents` table (migration),
   presign helper in the S3 driver, client upload component switch, tests.
2. Cron route + `vercel.json` (§6.5); skip `setInterval` on Vercel.
3. `DATABASE_PREPARE` option; documented `DATABASE_POOL_MAX` for Vercel.
4. Preview origins: derive the allowed origin for Preview from
   `VERCEL_BRANCH_URL`/`VERCEL_URL`; production keeps one `SITE_URL`.
5. `TRUST_PROXY_HOPS=1` on Vercel (Vercel overwrites `X-Forwarded-For` with
   the client IP) — configuration only.
6. Backup workflow: scheduled `pg_dump` (direct URL) + media copy, encrypted
   with an **age public key** (private key only on your PC); never uploaded
   as an Actions artifact because the repository is **public**; plus a
   monthly restore test into the preview project.

Everything else (auth, 2FA, CSP, SEO, rendering, media rules) is unchanged.

### Test plan on a preview deployment

1. Build succeeds; argon2 and sharp load (no native-module errors).
2. Migrations applied to the preview project via the direct URL.
3. Headers: CSP nonce, `X-Robots-Tag` on /admin and /api; private responses not cached (`x-vercel-cache` ≠ HIT).
4. Sign-in, lockout after 5 failures, stored IP equals the tester's public IP.
5. 2FA enable / code / recovery code / disable.
6. Direct upload: 14 MB PDF, 9 MB JPEG → variants created; 16 MB → refused; wrong type → refused; expired URL → refused; second `complete` → refused; anonymous `POST /uploads` → 401.
7. Replace image with image (old keys gone); replace with PDF → refused; delete in-use file → refused.
8. Private file → 404 anonymously, 200 for owner.
9. Cron route: 401 without secret; with secret → counts logged; abandoned `incoming/` objects removed.
10. Backup job → restore into a scratch DB → row counts and media SHA-256 match.
11. E2E suite and Lighthouse against the preview URL; compare with localhost.
12. Cold start after 10 min idle (Neon scale-to-zero): measure first-request delay.
13. Neon usage page: transfer per 100 page views with images.

---

## 9. Unresolved questions

1. Does Vercel treat a job-seeking portfolio as personal use? (Interpretation in §3.1; ask Vercel Support for certainty.)
2. Does "Your Content" include data functions only process (drafts, messages)? Not stated.
3. Does Neon count object-storage egress in the 5 GB transfer limit? Not stated.
4. Neon presigned URLs: is signed `Content-Length` enforced? Not documented.
5. Neon paid-plan payment methods (only matters if you outgrow Free).
6. Cloudflare R2 with RuPay/UPI — unverified, likely not possible.
7. SMTP provider free limits and payment rules — not verified (email stays off).
8. Off-site backup destination (§10 item 6).

---

## 10. Decisions (approved 2026-11-02, "Approve all")

1. **Host:** Vercel Hobby, non-commercial, with AI-training opt-out.
2. **Database and storage:** Neon Free, Singapore, with Neon Object Storage.
3. **Region:** Vercel `sin1` + Neon `aws-ap-southeast-1`.
4. **Uploads:** direct-to-storage design in §5, keeping 15 MB.
5. **Preview data:** separate Neon project with test data only.
6. **Backup destination:** option (a), the recommended one — encrypted file
   to a separate Neon project's storage plus a weekly copy on your PC.
7. **Email notifications:** off at launch.
8. **Implementation:** code changes in §8 on a branch; diff shown before any commit.

---

## 11. Sources (all accessed 2026-11-02)

Vercel

- Terms of Service (last updated 19 Oct 2026) — <https://vercel.com/legal/terms>
- Fair Use Guidelines — <https://vercel.com/docs/limits/fair-use-guidelines>
- Terms update, March 2026 (AI training) — <https://vercel.com/changelog/updates-to-terms-of-service-march-2026>
- Runtime logs — <https://vercel.com/docs/logs/runtime>
- Functions limits — <https://vercel.com/docs/functions/limitations>
- Hobby plan — <https://vercel.com/docs/plans/hobby>
- Pro plan — <https://vercel.com/docs/plans/pro-plan>
- Pro billing FAQ (payment methods) — <https://vercel.com/docs/plans/pro-plan/billing>
- Cron jobs: usage and pricing — <https://vercel.com/docs/cron-jobs/usage-and-pricing>
- Managing cron jobs — <https://vercel.com/docs/cron-jobs/manage-cron-jobs>
- Function regions — <https://vercel.com/docs/functions/configuring-functions/region>
- Region list — <https://vercel.com/docs/regions>
- Request headers — <https://vercel.com/docs/headers/request-headers>

Neon

- Pricing — <https://neon.com/pricing>
- Plans — <https://neon.com/docs/introduction/plans>
- Regions — <https://neon.com/docs/introduction/regions>
- Connection pooling — <https://neon.com/docs/connect/connection-pooling>
- Object Storage overview — <https://neon.com/docs/storage/overview>
- Object Storage get started — <https://neon.com/docs/storage/get-started>
- S3 compatibility — <https://neon.com/docs/storage/s3-compatibility>
- Backend beta announcement (with GA update) — <https://neon.com/blog/neon-backend-is-beta>

Cloudflare

- R2 pricing (updated 30 Oct 2026) — <https://developers.cloudflare.com/r2/pricing/>
- R2 get started (updated 21 Apr 2026) — <https://developers.cloudflare.com/r2/get-started/>

Supabase (alternative, not recommended now)

- Pricing — <https://supabase.com/pricing>
- Storage S3 compatibility — <https://supabase.com/docs/guides/storage/s3/compatibility>
