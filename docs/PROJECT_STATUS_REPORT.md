# Master project status report

Date: 2026-11-02 (revision 3). `main` = GitHub = `cb2cdbf`, CI run
41428268134 green (5/5 jobs). Vercel support is implemented on the local
branch `vercel-support` — **not committed, not pushed, CI not run**.
`docs/HOSTING_RESEARCH.md` (Lightsail-era) is superseded and untracked.

**The project is not finished.** The software is built and tested, but it has
no personal content, is not deployed, has no domain, and the owner account's
password was exposed and has not been changed.

Confirmed branding: display name **Ram**, brand **Ram's Dev Space**, tagline
**Your Personal Digital Universe**, preferred domain **ramsdevspace.com**.

Legend — **Claude?**: can Claude complete it alone. **Approval?**: does it
need your explicit approval.

---

## 1. Completed milestones

| Item                                                                           | Evidence                                                               |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Public site (13 sections, search, RSS) and private CMS                         | CHANGELOG 0.2.0–0.4.0; e2e suite 118 tests                             |
| Auth: Argon2id, DB sessions, rate limits, TOTP 2FA, recovery codes             | integration tests; docs/AUTH_AND_SECURITY.md                           |
| Media: validation, WebP variants, private files, S3 driver                     | integration tests incl. S3 (SeaweedFS in CI)                           |
| Docker production stack, backup and restore tested in CI                       | CI "production smoke" job incl. media checksum restore                 |
| SEO: metadata, OG images 1200×630, sitemap, robots, JSON-LD, RSS               | commit `bc66ad8`; tests/integration/seo.test.ts                        |
| Accessibility fixes + automated checks (axe, 200 % text, forced colours)       | commits `d790537`, `7975982`; docs/ACCESSIBILITY_TESTING.md            |
| Cross-browser automated runs: Chrome, Edge (all pass), WebKit (mostly)         | docs/ACCESSIBILITY_TESTING.md §2                                       |
| README, deployment, content and audit documentation                            | `685ae75`, `42c5d2c`, `3a27c67`, `cb2cdbf`                             |
| Hidden password entry for `admin:create` on Windows                            | `f448b63`; tests/unit/prompt.test.ts                                   |
| Vercel compatibility report rev. 2: terms/AI training, Neon, uploads, payments | docs/VERCEL_ARCHITECTURE.md (uncommitted), sources accessed 2026-11-02 |
| Branding decisions confirmed                                                   | Your message, 2026-11-02                                               |
| Vercel architecture approved ("Approve all")                                   | docs/VERCEL_ARCHITECTURE.md §10                                        |

## 2. Remaining tasks

| Task                                                                    | Dependencies                | Claude?                              | Approval?                           |
| ----------------------------------------------------------------------- | --------------------------- | ------------------------------------ | ----------------------------------- |
| Personal content (worksheet, 10 sections)                               | Your answers, one at a time | Writes only what you confirm         | Yes, per section                    |
| Branding: photo, favicon, default OG image                              | Content; your photo if any  | Favicon/OG from text yes; photo no   | Yes                                 |
| Commit and push `vercel-support`; let CI run the S3 direct-upload tests | Your approval               | Yes                                  | **Yes** (commit and push)           |
| Configure backup secrets and the age key                                | Accounts                    | **No** (your keys and accounts)      | —                                   |
| Create Vercel / Neon accounts; Vercel AI-training opt-out               | Your decisions              | **No** (account creation is yours)   | —                                   |
| Preview (staging) deployment + full tests                               | Accounts, code changes      | Tests yes; deploy needs your login   | Yes                                 |
| Domain purchase and DNS                                                 | Preview working             | **No** (purchase); DNS guidance yes  | Yes                                 |
| SMTP setup (optional)                                                   | Provider choice             | Config yes; account no               | Yes; no real email without approval |
| Search Console / Bing                                                   | Live domain                 | **No** (your Google/Microsoft login) | Yes                                 |
| Performance recheck on deployment                                       | Deployment                  | Yes                                  | No                                  |
| Public launch                                                           | Everything above            | —                                    | **Yes, explicit**                   |
| Update PROJECT_PROGRESS.md (still says 0.4.0)                           | —                           | Yes                                  | Commit approval                     |

## 3. Partially completed work

| Item                                | Done                                | Missing                                                                                                  |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Accessibility testing               | Automated + emulated checks         | Real NVDA run (guide written, nothing recorded); Firefox; Safari/VoiceOver; real phones                  |
| Content worksheet                   | Template in repo and private copy   | No answers entered; only education facts confirmed                                                       |
| SEO                                 | All code                            | Real domain in `SITE_URL`, real name/description, default OG image                                       |
| Security hardening of owner account | 2FA feature built and tested        | Password rotation; 2FA not enabled on the owner account                                                  |
| Hosting research                    | Vercel report rev. 3, approved      | Open questions in §9 of that report (Neon egress counting, presigned size enforcement, R2 payment, SMTP) |
| Vercel support code                 | Implemented and tested locally (§1) | Direct-upload S3 tests run only in CI (Docker could not start here); not yet tried against Neon itself   |

## 4. Technical blockers

1. Vercel 4.5 MB request limit — **solved in code** (direct uploads, 15 MB kept); needs proof against Neon on a preview.
2. No persistent disk on Vercel — S3 driver + Neon Object Storage; needs the Neon account.
3. Hourly maintenance — **solved in code** (daily cron route); security does not depend on it (verified in code).
4. Preview URLs and the CSRF origin check — **solved in code** (preview-only origins, unit-tested). 5. Docker Desktop will not start on this PC ("unable to start") — S3 tests rely on CI.
5. Firefox will not start on this PC (missing VC++ runtime, likely) — blocks Firefox testing here only.
6. Dynamic-route 404 shell: reviewed earlier; no meaningful fix identified, not reinvestigated.

## 5. Decisions required (in order)

Architecture decisions 1–8 were approved on 2026-11-02 (backup option (a)).
Still open:

1. Commit and push the `vercel-support` branch (diff shown first).
2. Merge into `main` after CI passes.
3. Domain purchase timing (after the preview works).

## 6. Personal information required

Short introduction (display name confirmed: Ram); about text; academic year/graduation date;
skills and levels; projects (titles, descriptions, links); experience;
certifications and achievements (with proof you own); public links (GitHub,
LinkedIn); contact email to publish (or none); photo (optional).
Nothing is published until you approve each section.

## 7. Expected costs

| Item                                                        | Cost                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Vercel Hobby, Neon Free (DB + 5 GB storage), GitHub Actions | ₹0/month — no payment method required (official pages)                                                         |
| Domain `.com` (Hostinger India, UPI)                        | about ₹800–1,100 first year; renewal higher — check before buying                                              |
| Optional paid tiers (not needed now)                        | Vercel Pro $20/month — card only, RuPay/UPI not accepted; Neon Launch ~$15/month (payment methods unpublished) |
| Cloudflare R2 (not recommended)                             | Free tier, but a payment method is needed to enable it                                                         |

## 8. Security risks

| Risk                                                      | Severity                 | Action                                                                |
| --------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| Local owner password was shown in a terminal              | High before launch       | Change it (Dashboard → Account); use a new one in production          |
| 2FA off on the owner account                              | High in production       | Enable in production; store recovery codes offline                    |
| Vercel Hobby may use content for AI training (default on) | High before first deploy | Opt out: Team Settings → Data Preferences, before deploying           |
| Neon 5 GB/month transfer cap suspends the database        | Medium                   | Serve media via the CDN cache; watch usage                            |
| Neon Free keeps 6 h of restore history only               | Medium                   | Scheduled encrypted off-site backup (never as a public-repo artifact) |
| Hobby logs kept 1 hour                                    | Medium                   | Accept, or add a free log drain later                                 |
| Hobby "non-commercial" interpretation for a job portfolio | Low–medium               | No ads, sales or paid offers; ask Vercel Support if unsure            |
| Preview deployments exposing test data                    | Low                      | Keep Vercel Authentication on previews; test data only                |
| Secrets in environment variables                          | Low                      | Production-only scope; never in Git                                   |

## 9. Deployment blockers

Accounts not created; Vercel code not yet committed or CI-verified; no
content; owner password not rotated; no domain (not required for the preview).

## 10. Exact next actions, in priority order

1. **You:** approve committing and pushing `vercel-support`; **Claude:** commit, push, check CI (S3 direct-upload tests).
2. **You:** change the local owner password (Dashboard → Account).
3. **You:** answer the content questions, one at a time (introduction first).
4. **You:** create Vercel (Hobby) and Neon accounts with GitHub sign-in; **opt out of AI training before the first deploy**; follow docs/DEPLOYMENT_VERCEL.md §2–§6.
5. **Claude + you:** preview deployment, run the test plan in docs/VERCEL_ARCHITECTURE.md §8.
6. **You:** run the NVDA guide once (about 30 minutes) and record results.
7. **You:** buy the domain (after approval of cost); **Claude:** DNS and canonical settings.
8. **You:** set the production owner password, enable 2FA, store recovery codes offline.
9. **You:** approve public launch; **Claude:** final launch report, Search Console steps.
