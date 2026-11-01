# Project progress

Last updated: 2026-11-01 · Version 0.4.0

## Is the website ready to launch?

**The software is ready for a production deployment; the website is not
launched.** It contains no real personal content yet (only seeded structure
and the confirmed facts), and it is not deployed. Both need the owner — the
remaining blockers are listed at the end. Passing CI says the code works; it
does not say the site is ready for visitors.

### Requirement checklist

| Requirement                                                                                                                       | Status                       | Notes                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| Home: intro, hero, bio, education, interests, featured projects, skills, recent learning, achievements, contact CTA, social links | ✅ Built, tested             | Every section hides itself until it has published content                |
| About: introduction, background, education, interests, direction, philosophy, focus                                               | ✅ Built, tested             | Nine draft sections seeded **empty**; owner writes them                  |
| Education: institution, degree, branch, period, status, courses, achievements                                                     | ✅ Built, tested             | Seeded entry is a draft; year of study left empty (not confirmed)        |
| Skills: categories, descriptions, proficiency labels, featured, related projects and certificates                                 | ✅ Built, tested             | Levels only if the owner sets them                                       |
| Projects: all listed fields, screenshots, detail page, search, filters, categories                                                | ✅ Built, tested             |                                                                          |
| Experience: all listed fields                                                                                                     | ✅ Built, tested             |                                                                          |
| Achievements & certifications: all listed kinds, issuers, dates, verification links, images/PDFs                                  | ✅ Built, tested             | Private certificate files require a verification link before publishing  |
| Learning journal: entries, tags, drafts, search, filters, archive, images, attachments                                            | ✅ Built, tested             |                                                                          |
| Resources: all listed types, notes                                                                                                | ✅ Built, tested             |                                                                          |
| Contact: form, spam protection, rate limits, inbox, retention, email notification                                                 | ✅ Built, tested             | Email needs an SMTP provider chosen by the owner                         |
| Admin: login/logout, protected routes, owner-only role, 2FA, session revocation, sign-in activity                                 | ✅ Built, tested             |                                                                          |
| CMS: CRUD, draft/publish/unpublish/archive, preview, visibility, featured, ordering                                               | ✅ Built, tested             |                                                                          |
| Media: uploads, library, metadata, replace, delete unused, image optimisation, private files, local or S3 storage                 | ✅ Built, tested             | S3 tested against SeaweedFS, not a commercial provider                   |
| Database: schema, migrations, FKs, indexes, validation, transactions, search                                                      | ✅ Built, tested             |                                                                          |
| Backup and restore                                                                                                                | ✅ Built, **tested in CI**   | Off-server copy destination is the owner's choice                        |
| Security: hashing, sessions, authorisation, CSRF, XSS, SQLi, headers, CSP, rate limits, uploads, secrets, log redaction           | ✅ Built, tested             | See docs/AUTH_AND_SECURITY.md                                            |
| SEO & performance                                                                                                                 | ✅ Built, measured           | See Lighthouse below                                                     |
| Responsive, light/dark, keyboard, accessible states                                                                               | ✅ Built, tested             | axe at three viewport sizes in both themes                               |
| Monitoring                                                                                                                        | 🟡 Health endpoint + logs    | External uptime monitor and error alerting need the owner (free options) |
| Deployment preparation and documentation                                                                                          | ✅ Prepared, CI smoke-tested | docs/DEPLOYMENT.md §11 launch checklist                                  |
| **Real personal content entered and published**                                                                                   | ❌ Not started               | Owner action — docs/CONTENT_GUIDE.md                                     |
| **Deployed to a public domain over HTTPS**                                                                                        | ❌ Not done                  | Owner action — needs server, domain, secrets                             |

## Status

| Phase | Name                          | Status                                               |
| ----- | ----------------------------- | ---------------------------------------------------- |
| 1–9   | Inspection to testing         | ✅ Done                                              |
| 10    | Deployment                    | 🟡 Prepared and smoke-tested in CI; **not deployed** |
| —     | Production readiness (v0.4.0) | ✅ Done (this milestone)                             |

Phase order and exit criteria: [docs/ROADMAP.md](docs/ROADMAP.md). Release
notes: [CHANGELOG.md](CHANGELOG.md).

## Production readiness milestone (v0.4.0)

### Security audit — issues found and fixed

| Issue                                                                                     | Fix                                                            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Expired sessions, rate-limit rows, old audit entries and spam were never deleted          | Hourly retention job (`src/server/services/maintenance.ts`)    |
| Docker logs had no size limit (disk could fill)                                           | json-file rotation, 10 MB × 5, on every service                |
| Production accepted a plain-http `SITE_URL` (cookies without `__Host-`/`Secure`)          | Startup validation refuses it (localhost excepted for testing) |
| Empty variables from Compose (`VAR=`) failed validation                                   | Treated as unset                                               |
| `backup.sh` media archive could not be written; documented restore broke later migrations | Fixed and replaced by `restore.sh`, tested in CI               |
| A changed `APP_SECRET` made authenticator codes cause a server error                      | Rejected cleanly; recovery codes still work                    |
| Test-only `smtp-server` pulled a nodemailer with address-parser advisories                | Overridden to 10.1.4                                           |

Checked and found sound: authorisation on every admin route (file-system
enumerated test), CSRF origin check, nonce CSP, upload validation, least-privilege
database role, no secrets in the client bundle, generic error responses. `npm
audit --omit=dev`: 0 vulnerabilities. Nine moderate findings remain in
development tools only (reviewed in docs/AUTH_AND_SECURITY.md §14).

### Backup and restore — tested

The CI `docker` job runs on the real production images: upload an image →
`backup.sh` → the media archive contains the image → `restore.sh` into the
separate database `personal_site_restore_check` (row counts match the live
database, tables owned by `site_owner`, `site_app` can read) → add a message →
restore over the live database → the message is gone, the site is healthy,
sign-in works, the image is served, migrations run → all media files deleted
and restored from the archive with identical SHA-256 checksums. Database steps
first passed on `5fb7d4b`, the media checksum step on `e8fc6c7`. Not yet run on
a real server.

### Lighthouse (2026-11-01, production build on localhost, mobile, simulated slow 4G, headless Edge)

Median of 3 runs (home: 5 more runs to check an outlier).

| Page                                                                            | Perf | A11y | Best practices | SEO | LCP (simulated) | CLS | TBT      |
| ------------------------------------------------------------------------------- | ---- | ---- | -------------- | --- | --------------- | --- | -------- |
| `/`                                                                             | 96   | 100  | 100            | 100 | 2.84 s          | 0   | 20–30 ms |
| `/projects`                                                                     | 96   | —    | —              | —   | 2.82 s          | 0   | —        |
| `/projects/uptime-monitor`                                                      | 97   | 100  | 100            | 100 | 2.68 s          | 0   | 27 ms    |
| `/skills`, `/search`, `/about`                                                  | 100  | —    | —              | —   | 0.63–0.66 s     | 0   | —        |
| `/contact`, `/journal`                                                          | 100  | 100  | 100            | 100 | ≈0.6 s          | 0   | 26–64 ms |
| `/education`, `/experience`, `/achievements`, `/resources` (before font change) | 100  | —    | —              | —   | 0.64–0.67 s     | 0   | —        |

Before this milestone: `/` 94 (3.16 s), `/projects` 94 (3.06 s), `/skills` 95
(2.96 s), `/search` 94 (3.11 s). The change: monospace labels now use the
system font instead of a 48 KB web font. One home-page run scored 86 because
of a 12.2 s Speed Index anomaly; five re-runs all scored 96. "—" = not
measured in that run.

The remaining image-led pages are above the 2.5 s budget only in the
simulation: their LCP image is 2 KB, preloaded with `fetchpriority=high`, and
the observed (unthrottled) LCP was 0.12–0.19 s. Re-measure on the deployed
site. Page weight is 260–310 KB.

## Test results (2026-11-01, run locally on PostgreSQL 17)

| Suite                             | Result                       | Covers                                                                                                                                                     |
| --------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)                     | **133 passed**               | Config validation incl. production rules, TOTP (RFC 6238 vectors), field schemas, URL safety, Markdown sanitizing, file signatures, client IP, form tokens |
| Integration (Vitest)              | **133 passed**, 4 skipped    | Everything before, plus 2FA (12 tests), retention, SMTP notifications against a real SMTP server. The 4 S3 tests run in CI only (need an S3 server)        |
| End-to-end (Playwright)           | **90 passed**                | Owner workflows for every content type, 2FA sign-in, anonymous access blocked, axe on dashboard and public pages × 3 sizes × 2 themes, CSP, SEO            |
| Lint / typecheck / format / build | Clean                        |                                                                                                                                                            |
| CI (GitHub Actions)               | See CHANGELOG / final report | quality, integration (+ S3 on SeaweedFS + retention), e2e, production smoke test (+ backup/restore), audit                                                 |

The local database is a temporary portable PostgreSQL 17, because Docker
cannot run on this machine without WSL. The production-stack and S3 tests run
in CI only.

## Known limitations

| Limitation                                  | Impact                                                    | Follow-up                                                                 |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Not deployed                                | No public URL yet                                         | Owner: server, domain, secrets (docs/DEPLOYMENT.md §11)                   |
| No off-server backup destination            | Backups on the server's own disk are not enough           | Owner: choose a destination (§8)                                          |
| Email notifications off                     | Messages only visible in the dashboard                    | Owner: choose an SMTP provider (§9)                                       |
| No error alerting                           | Errors only in structured logs                            | Optional: GlitchTip (self-hosted) or Sentry free tier — needs approval    |
| S3 not tested against a commercial provider | Provider-specific quirks possible                         | Test after choosing one, if S3 is used at all                             |
| Simulated LCP 2.7–2.8 s on image-led pages  | Above the 2.5 s budget in Lighthouse's slow-4G model only | Re-measure on the deployed site                                           |
| Lost phone and recovery codes               | Owner must reset from the server (`admin:create`)         | By design: no email-based recovery                                        |
| Two development-only audit findings         | None in production dependencies                           | Re-check on ESLint / drizzle-kit upgrades (docs/AUTH_AND_SECURITY.md §14) |
| No rich-text editor or command palette      | Markdown fields are plain text areas                      | Optional polish                                                           |

## Actions needed from the owner (launch blockers)

1. **Decide and pay for hosting:** a VPS and a domain (docs/DEPLOYMENT.md §2, §11).
   Nothing has been bought or registered.
2. **Choose an off-server backup destination** (§8).
3. **Content:** follow docs/CONTENT_GUIDE.md — Profile, About, education years
   and status, skills, projects, experience, certificates, links. Publish each
   when accurate.
4. **After deployment:** create the owner account, turn on 2FA and store the
   recovery codes offline, set up an external uptime monitor, run
   `restore.sh` once on the server.
5. **Optional:** SMTP provider for message emails (§9); object storage (§7).
6. **Local development:** enable WSL 2 (`wsl --install` as administrator) so
   Docker Desktop can run the local database.

## History

- Phase 1 found that `Desktop\cc` is DevPulse; this repository was created at
  `C:\dev\personal-site` (outside OneDrive) and pushed to
  `github.com/Ramssmb/Ram-s-smb-personal-digital-universe-`.
- Phases 2–3 (design, foundation) — v0.1.0.
- Phases 4–10 (application, tests, deployment preparation) — v0.2.0.
- Website and CMS completion — v0.3.0.
- Production readiness — v0.4.0.
