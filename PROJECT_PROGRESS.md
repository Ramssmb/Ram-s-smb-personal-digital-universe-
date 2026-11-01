# Project progress

Last updated: 2026-11-01 · Version 0.3.0

## Is the website complete?

**The software is feature-complete against the master task. The website itself
is not finished.** It contains no real personal content yet (only seeded
structure and the confirmed facts), and it is not deployed to a public domain.
Both need the owner. Passing CI says the code works; it does not say the site
is ready for visitors.

### Requirement checklist (master execution task)

| Requirement                                                                                                                       | Status                       | Notes                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Home: intro, hero, bio, education, interests, featured projects, skills, recent learning, achievements, contact CTA, social links | ✅ Built, tested             | Every section hides itself until it has published content               |
| About: introduction, background, education, interests, direction, philosophy, focus                                               | ✅ Built, tested             | Nine draft sections seeded **empty**; owner writes them                 |
| Education: institution, degree, branch, period, status, courses, achievements                                                     | ✅ Built, tested             | Seeded entry is a draft; year of study left empty (not confirmed)       |
| Skills: categories, descriptions, proficiency labels, featured, related projects and certificates                                 | ✅ Built, tested             | Levels only if the owner sets them                                      |
| Projects: all listed fields, screenshots, detail page, search, filters, categories                                                | ✅ Built, tested             |                                                                         |
| Experience: all listed fields                                                                                                     | ✅ Built, tested             |                                                                         |
| Achievements & certifications: all listed kinds, issuers, dates, verification links, images/PDFs                                  | ✅ Built, tested             | Private certificate files require a verification link before publishing |
| Learning journal: entries, tags, drafts, search, filters, archive, images, attachments                                            | ✅ Built, tested             |                                                                         |
| Resources: all listed types, notes                                                                                                | ✅ Built, tested             |                                                                         |
| Contact: form, email, social links, validation, spam protection, server-side, states                                              | ✅ Built, tested             | Messages go to the dashboard inbox; no email notification               |
| Links page incl. email                                                                                                            | ✅ Built, tested             | `mailto:` without extra parameters                                      |
| Admin: login/logout, protected routes, owner-only role, overview                                                                  | ✅ Built, tested             | No two-factor authentication                                            |
| CMS: CRUD, draft/publish/unpublish/archive, preview, visibility, featured, ordering                                               | ✅ Built, tested             | Every public section is managed from the dashboard                      |
| Media: uploads, library, metadata, replace, delete unused, image optimisation, private files                                      | ✅ Built, tested             | Local-disk storage only                                                 |
| Categories, tags, profile, social links, site metadata/SEO, messages, account                                                     | ✅ Built, tested             |                                                                         |
| Database: schema, migrations, FKs, indexes, validation, transactions, search                                                      | ✅ Built, tested             |                                                                         |
| Security: hashing, sessions, server-side authorisation, CSRF, XSS, SQLi, headers, CSP, rate limits, upload validation, secrets    | ✅ Built, tested             | See docs/AUTH_AND_SECURITY.md                                           |
| SEO & performance: metadata, OG, sitemap, robots, canonical, JSON-LD, images, lazy loading                                        | ✅ Built, measured           | Simulated LCP 2.6–3.1 s on three image-led pages                        |
| Responsive, light/dark, keyboard, accessible states                                                                               | ✅ Built, tested             | axe at three viewport sizes in both themes                              |
| Deployment preparation and documentation                                                                                          | ✅ Prepared, CI smoke-tested |                                                                         |
| **Real personal content entered and published**                                                                                   | ❌ Not started               | Owner action — nothing may be invented                                  |
| **Deployed to a public domain over HTTPS**                                                                                        | ❌ Not done                  | Owner action — needs server, domain, secrets                            |

## Status

| Phase | Name                            | Status                                                           |
| ----- | ------------------------------- | ---------------------------------------------------------------- |
| 1     | Repository inspection           | ✅ Done                                                          |
| 2     | System design                   | ✅ Done                                                          |
| 3     | Foundation and design system    | ✅ Done                                                          |
| 4     | Authentication and admin shell  | ✅ Done                                                          |
| 5     | Content (all sections)          | ✅ Done                                                          |
| 6     | Media                           | ✅ Done (local-disk storage)                                     |
| 7     | Search, SEO and discovery       | ✅ Done                                                          |
| 8     | Security and performance review | ✅ Done locally (see Lighthouse below); re-measure once deployed |
| 9     | Testing and quality             | ✅ Done                                                          |
| 10    | Deployment                      | 🟡 Prepared and smoke-tested in CI; **not deployed**             |

Phase order and exit criteria: [docs/ROADMAP.md](docs/ROADMAP.md). Release
notes: [CHANGELOG.md](CHANGELOG.md).

## What exists

**Public pages:** home, about, education, skills, projects + project pages,
experience, achievements and certifications, journal + entry pages + monthly
archive + RSS, resources, links, contact, search, 404/error pages, sitemap,
robots.txt. All read from the database; nothing personal is hard-coded.

**Dashboard (`/admin`):** sign-in, overview, profile, about sections,
education, skills, projects, experience, certifications, achievements,
journal, resources, links, categories, tags, media library, messages, settings
and per-page SEO, account (password change, sessions), component gallery.

**Content operations:** create, edit, delete (with confirmation), draft,
publish, unpublish, archive, public/private, featured, manual ordering,
preview of unpublished content, search and status filters, pagination,
optimistic-concurrency protection, unsaved-change warning, audit log.

**Starter data (`npm run db:seed`):** categories from the brief, nine empty
draft About sections, one draft education entry (B.Tech., Computer Science and
Engineering, Dr. B. R. Ambedkar National Institute of Technology Jalandhar),
and the confirmed interests. No year of study, grades or other unconfirmed
facts.

## Test results (2026-11-01, run locally on PostgreSQL 17)

| Suite                             | Result         | Covers                                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)                     | **122 passed** | Config validation, field schemas, unsafe URLs, impossible dates, Markdown XSS sanitizing, file signatures, client-IP parsing, form tokens, components                                                                                                                                                                   |
| Integration (Vitest)              | **110 passed** | Schema constraints, least-privilege DB role, login/lockout/sessions/password change, 401 + CSRF 403 on all 13 admin route files, content lifecycle for every section, media, contact                                                                                                                                    |
| End-to-end (Playwright)           | **89 passed**  | Owner workflows through the UI for every content type (create, preview, publish, edit, unpublish, visibility, archive, delete, media); anonymous access blocked; axe (WCAG 2.2 AA + best-practice rules) on 10 dashboard pages and 13 public pages (× phone/tablet/desktop × light/dark); navigation, filters, CSP, SEO |
| Lint / typecheck / format / build | Clean          |                                                                                                                                                                                                                                                                                                                         |

A deliberate mutation check (removing the "published" condition from the
visibility rule) made the content tests fail, confirming they detect leaks.

### Lighthouse (2026-11-01, production build on localhost, mobile emulation with simulated slow 4G)

| Page                                                                                                            | Perf | A11y | Best practices | SEO                             | LCP       | CLS | TBT      |
| --------------------------------------------------------------------------------------------------------------- | ---- | ---- | -------------- | ------------------------------- | --------- | --- | -------- |
| `/`                                                                                                             | 94   | 100  | 100            | 100                             | 3.1 s     | 0   | 50 ms    |
| `/projects`                                                                                                     | 94   | 100  | 100            | 100                             | 3.0 s     | 0   | 40 ms    |
| `/projects/uptime-monitor`                                                                                      | 97   | 100  | 100            | 100                             | 2.6 s     | 0   | 40 ms    |
| `/journal`                                                                                                      | 90   | 100  | 100            | 100                             | 0.6 s     | 0   | 80 ms    |
| `/journal/<entry>`, `/about`, `/skills`, `/education`, `/experience`, `/achievements`, `/resources`, `/contact` | 100  | 100  | 100            | 100 (after the description fix) | 0.6–0.7 s | 0   | 20–90 ms |

The three pages above 2.5 s LCP have a project cover image as their largest
element. The image is preloaded, about 2 KB, and loads in roughly 0.4 s
unthrottled; the 2.6–3.1 s figure is Lighthouse's slow-4G simulation. Re-check
on the deployed site with real network conditions before tuning further.

The local database for these runs was a temporary portable PostgreSQL 17,
because Docker cannot run on this machine without WSL. CI runs every suite
against PostgreSQL 17 in Docker, plus a production-stack smoke test.

## Known limitations

| Limitation                                   | Impact                                                                 | Follow-up                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Not deployed                                 | No public URL yet                                                      | Needs a server, domain and secrets from the owner (docs/DEPLOYMENT.md)           |
| No two-factor authentication                 | Account protected by password, rate limits and revocable sessions only | Add TOTP                                                                         |
| No email notification for contact messages   | Messages are only visible in the dashboard inbox                       | Add SMTP (choose provider)                                                       |
| Media stored on local disk only              | Managed/serverless hosting not supported yet                           | Add S3/R2 storage adapter                                                        |
| No error-monitoring service                  | Errors are only in structured logs                                     | Add Sentry or GlitchTip                                                          |
| Simulated LCP 2.6–3.1 s on image-led pages   | Three pages exceed the 2.5 s budget under Lighthouse's slow-4G model   | Re-measure on the deployed site; consider smaller first variants or a data cache |
| Rate limits without a proxy share one bucket | Only matters in local development                                      | In production Caddy supplies the client IP (`TRUST_PROXY_HOPS=1`)                |
| Two development-only audit findings          | None in production dependencies                                        | Re-check on ESLint / drizzle-kit upgrades (docs/AUTH_AND_SECURITY.md §14)        |
| No rich-text editor or command palette       | Markdown fields are plain text areas                                   | Optional polish                                                                  |

## Actions needed from the owner

1. **Content:** sign in and fill in Profile (name, headline, bio, photo), the
   About sections, education years and status, skills with honest statuses,
   projects, experience, certificates and links. Publish each when ready.
2. **Enable WSL 2** (`wsl --install` as administrator, then restart) so Docker
   Desktop can run the local database (`docker compose up -d db`).
3. **Deployment:** choose a VPS provider and a domain, point DNS at the server,
   fill in `.env.production`, and follow docs/DEPLOYMENT.md.
4. **Decide later:** SMTP provider (for message emails), whether to add 2FA.

## History

- Phase 1 found that `Desktop\cc` is DevPulse; this repository was created at
  `C:\dev\personal-site` (outside OneDrive) and pushed to
  `github.com/Ramssmb/Ram-s-smb-personal-digital-universe-`.
- Phases 2–3 (design, foundation) — v0.1.0.
- Phases 4–10 (application, tests, deployment preparation) — v0.2.0.
