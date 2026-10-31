# Changelog

All notable changes to this project. Dates are UTC.

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
