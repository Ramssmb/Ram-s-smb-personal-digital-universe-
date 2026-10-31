# Changelog

All notable changes to this project. Dates are UTC.

## [0.2.1] — 2026-11-01

### Fixed

- **Caddy failed to start** when `ACME_EMAIL` was empty (the global `email`
  option had no argument). The option is now an opt-in comment.
- **Logs could contain personal data:** database errors embed the failed query
  and its parameters; errors are now logged through a serializer that drops both.
- **Database URLs broke with base64 secrets** containing `/`, `+` or `=`; the docs
  now generate hex secrets.
- **Dashboard overflowed sideways on phones** (top bar labels); compact labels on
  small screens with unchanged accessible names.
- **Colour-only link** (sender email on the Messages page) failed WCAG 1.4.1; now underlined.

### Added

- Draft previews for every content type show all filled-in fields (dates,
  links, lists), not just Markdown.
- App container runs with an init process and stop grace periods.
- Production smoke test (`infra/smoke/prod-smoke.sh`): Caddyfile validation, HTTP→HTTPS
  redirect, sign-in over HTTPS, image upload, persistence across a full restart,
  graceful shutdown.
- End-to-end coverage for every content type, unpublish, visibility, permanent
  delete, cover image via the picker, draft previews, anonymous access to private
  content, axe checks on 10 dashboard pages in both themes, and the dashboard on a phone.

## [0.2.0] — 2026-11-01

The complete application: database-backed public site, private CMS, media,
search, SEO, tests and deployment setup.

### Added

- **Public site:** home, about, education, skills, projects (list and detail),
  experience, achievements and certifications, learning journal (timeline,
  monthly archive, entry pages, RSS feed), resources, links, contact and global
  search. Filters and search are plain GET forms with shareable URLs.
- **Admin dashboard** at `/admin`: overview with real counts, profile, settings
  and per-page SEO, and create/edit/delete for about sections, education,
  skills, projects, experience, certifications, achievements, journal,
  resources, links, categories and tags. Draft → publish → unpublish → archive,
  public/private visibility, featured flags, manual ordering, preview of
  unpublished content, unsaved-change warnings.
- **Media library:** uploads checked by file signature, images re-encoded to
  WebP in several sizes with EXIF/GPS removed, private files served only to the
  owner, files in use cannot be deleted.
- **Authentication:** owner account created from the command line only,
  Argon2id passwords, database sessions (only token hashes stored), rate-limited
  sign-in, password change that signs out other sessions, Origin-checked writes.
- **Contact form:** server-side validation, honeypot and timing checks, rate
  limits, inbox with read/archive/spam states.
- **SEO:** per-page metadata with owner overrides, canonical URLs, Open Graph,
  JSON-LD (Person, CreativeWork, BlogPosting), sitemap, robots.txt.
- **Database:** full schema with foreign keys, check constraints, generated
  full-text search columns and GIN indexes; seed script with categories and
  verified facts only.
- **Tests:** unit, integration (real PostgreSQL, including authorization of
  every admin route) and Playwright end-to-end workflows with axe checks at three
  viewports in both themes.
- **Deployment:** multi-stage Dockerfile, production Compose stack with Caddy,
  production role setup, backup script, deployment guide; CI smoke-tests the
  production stack.

### Changed

- Public and admin areas use separate layouts (`(site)` route group).
- The component gallery `/admin/design` now requires the owner session; the
  `DESIGN_GALLERY` flag was removed.

## [0.1.0] — 2026-11-01

- Phase 3 foundation: Next.js shell, environment validation, logging, error
  handling, security headers and nonce-based CSP, first migration, design
  tokens and core components, CI.
- Phases 1–2: repository inspection and system design documents.
