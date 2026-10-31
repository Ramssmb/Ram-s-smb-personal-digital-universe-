# Roadmap

> The original brief ordered "Public website" (Phase 4) before "Backend"
> (Phase 5). That would force hardcoded placeholder content, which the brief
> forbids. Approved change: lay the backend foundation first, then build each
> content type **end to end** (database → API → admin form → public page →
> tests). Phase numbers below are the ones used in `PROJECT_PROGRESS.md`.

Each phase ends with the report format from the brief (features, files, database
changes, decisions, tests and results, known bugs, remaining work, next action)
and an update to `PROJECT_PROGRESS.md`.

## Phase 1 — Repository inspection ✅

Existing environment analysed; new repository created outside OneDrive.

## Phase 2 — System design ✅

`ARCHITECTURE.md` and `docs/*`.

## Phase 3 — Foundation and design system

- Scaffold Next.js + TypeScript (strict), ESLint, Prettier, Vitest, Playwright.
- Docker Compose for local PostgreSQL 17 (dev and test databases).
- Drizzle setup, first migration (enums, system tables), database roles.
- Environment validation, structured logging, error handling, security headers.
- Design tokens, fonts, theme switching, core components, layouts, `/admin/design`.
- CI: typecheck, lint, unit, integration (real Postgres), build, audit.

**Exit:** `npm run dev` serves an empty themed shell; CI green.

## Phase 4 — Authentication and admin shell

- `users`, `sessions`, `rate_limits`, `audit_log`; admin create/reset scripts.
- Login, logout, session handling, `requireAdmin`, `Origin` check.
- Dashboard layout, navigation, overview page skeleton, account page
  (change password, sessions).
- Tests: unauthenticated access to every admin route, rate limiting, session
  expiry and revocation, CSRF rejection.

**Exit:** owner can sign in; every admin route is proven protected.

## Phase 5 — Content, one vertical slice at a time

Each slice: schema + migration, services with the visibility rule, admin API,
admin list/form, public page(s), revalidation, tests.

1. Profile, about sections, website settings → **Home** and **About**
2. **Journal** (timeline, entry pages, monthly archive, tags, fast-entry form)
3. **Projects** (categories, detail pages, filters, sort)
4. **Skills** (categories, filters, related projects)
5. **Education** (timeline, courses, milestones)
6. **Experience**
7. **Certifications and achievements**
8. **Resources**
9. **Important links**
10. **Contact** (form, spam protection, admin inbox, email notification)

**Exit per slice:** create → preview → publish → visible publicly → unpublish →
gone publicly, proven by an end-to-end test.

## Phase 6 — Media

Storage adapters, uploads, image variants, EXIF stripping, private documents,
media library UI, attachment pickers in every form.

## Phase 7 — Search, SEO and discovery

Global search and command palette, sitemap, robots, canonical URLs, per-page
metadata, SEO overrides UI, Open Graph images, JSON-LD (`Person`, `WebSite`,
`Article` for journal entries, `CreativeWork` for projects), RSS feed.

## Phase 8 — Security and performance review

Full review against `docs/AUTH_AND_SECURITY.md`; dependency audit; CSP
verification; Lighthouse and Core Web Vitals budgets (LCP < 2.5 s, CLS < 0.1,
INP < 200 ms on a mid-range phone profile); query plans for list pages.

## Phase 9 — Testing and quality

Coverage gaps closed; responsive checks at 375, 768, 1024 and 1440 px in both
themes; axe on every page; error-path tests; manual keyboard walkthrough.

## Phase 10 — Deployment

Hosting decision (VPS or managed), production build, migrations in the release
step, domain and HTTPS, backups (nightly `pg_dump` + media, off-site copy,
restore test), error monitoring, uptime monitoring, `docs/DEPLOYMENT.md`.

## Content needed from the owner (any time before launch)

Display name, headline, short bio, profile photo, about sections, education
details (years), skills with honest statuses, projects, experiences,
certificates, links. Nothing is invented; anything missing stays unpublished.
