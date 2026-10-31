# Project progress

Last updated: 2026-11-01 · Version 0.2.1

## Status

| Phase | Name                            | Status                                                        |
| ----- | ------------------------------- | ------------------------------------------------------------- |
| 1     | Repository inspection           | ✅ Done                                                       |
| 2     | System design                   | ✅ Done                                                       |
| 3     | Foundation and design system    | ✅ Done                                                       |
| 4     | Authentication and admin shell  | ✅ Done                                                       |
| 5     | Content (all sections)          | ✅ Done                                                       |
| 6     | Media                           | ✅ Done (local-disk storage)                                  |
| 7     | Search, SEO and discovery       | ✅ Done                                                       |
| 8     | Security and performance review | 🟡 Security tested; Lighthouse / Core Web Vitals not measured |
| 9     | Testing and quality             | ✅ Done                                                       |
| 10    | Deployment                      | 🟡 Prepared and smoke-tested in CI; **not deployed**          |

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

| Suite                             | Result         | Covers                                                                                                                                                                                                                                                                              |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)                     | **106 passed** | Config validation, field schemas, unsafe URLs, impossible dates, Markdown XSS sanitizing, file signatures, client-IP parsing, form tokens, components                                                                                                                               |
| Integration (Vitest)              | **105 passed** | Schema constraints, least-privilege DB role, login/lockout/sessions/password change, 401 + CSRF 403 on all 13 admin route files, content lifecycle for every section, media, contact                                                                                                |
| End-to-end (Playwright)           | **83 passed**  | Owner workflows through the UI for every content type (create, preview, publish, edit, unpublish, visibility, archive, delete, media); anonymous access blocked; axe on 10 dashboard pages and 13 public pages (× phone/tablet/desktop × light/dark); navigation, filters, CSP, SEO |
| Lint / typecheck / format / build | Clean          |                                                                                                                                                                                                                                                                                     |

A deliberate mutation check (removing the "published" condition from the
visibility rule) made the content tests fail, confirming they detect leaks.

The local database for these runs was a temporary portable PostgreSQL 17,
because Docker cannot run on this machine without WSL. CI runs every suite
against PostgreSQL 17 in Docker, plus a production-stack smoke test.

## Known limitations

| Limitation                                   | Impact                                                                 | Follow-up                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Not deployed                                 | No public URL yet                                                      | Needs a server, domain and secrets from the owner (docs/DEPLOYMENT.md)    |
| No two-factor authentication                 | Account protected by password, rate limits and revocable sessions only | Add TOTP                                                                  |
| No email notification for contact messages   | Messages are only visible in the dashboard inbox                       | Add SMTP (choose provider)                                                |
| Media stored on local disk only              | Managed/serverless hosting not supported yet                           | Add S3/R2 storage adapter                                                 |
| No error-monitoring service                  | Errors are only in structured logs                                     | Add Sentry or GlitchTip                                                   |
| Performance budgets not measured             | LCP/CLS/INP unverified (pages render per request)                      | Run Lighthouse on the deployed site; add a data cache if needed           |
| Rate limits without a proxy share one bucket | Only matters in local development                                      | In production Caddy supplies the client IP (`TRUST_PROXY_HOPS=1`)         |
| Two development-only audit findings          | None in production dependencies                                        | Re-check on ESLint / drizzle-kit upgrades (docs/AUTH_AND_SECURITY.md §14) |
| No rich-text editor or command palette       | Markdown fields are plain text areas                                   | Optional polish                                                           |

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
