# Changelog

All notable changes to this project. Dates are UTC.

## [Unreleased]

### Added

- **Vercel + Neon support** (docs/DEPLOYMENT_VERCEL.md), off by default so the
  Docker deployment is unchanged:
  - **Direct uploads** (`UPLOAD_MODE=direct`): the browser puts the file into
    the bucket with a 5-minute signed URL for one random `incoming/` key, size
    and type included in the signature; the app then checks the stored size,
    runs the usual validation and image processing and deletes the incoming
    object. Single use, owner only, 15 MB limit kept. New `upload_intents`
    table (migration `0003`).
  - `GET /api/cron/maintenance` for Vercel Cron (bearer `CRON_SECRET`), daily
    in `vercel.json`; the in-process hourly timer is skipped on Vercel.
    Maintenance also removes unfinished direct uploads.
  - Vercel preview deployments accept their own URLs as request origins
    (preview only).
  - `DATABASE_PREPARE` for transaction-mode poolers; the CSP allows the
    storage origin only when direct uploads are on.
  - Encrypted daily off-site backup workflow (`.github/workflows/backup.yml`):
    database dump with a restore check, media copy with checksums, age
    encryption, upload to a separate bucket, 14 kept; never a public artifact.
    `npm run backup:fetch` downloads the newest one.
    The dump and restore check (`infra/backup/dump-and-verify.sh`) dumps the
    whole database and is run by CI on every pull request.

### Fixed

- **404 pages keep the site navigation:** unknown public addresses (and
  missing projects or journal entries) now show the 404 message inside the
  site layout, with the header, footer and a "Search the site" link, instead
  of a bare page. The status code is still 404 and the page is `noindex`.
- **Dashboard pages line up:** Account, Messages and the content lists were
  centred at narrower widths than the other pages, so the page title jumped
  sideways when moving between them. All dashboard pages now share the same
  left edge; narrow content keeps its width.
- The dashboard overview says the profile is "Complete" instead of "Set up",
  which read like an instruction.
- The browser icon is an "R" monogram for Ram's Dev Space (was a plain dot).
- **Windows High Contrast:** primary, borderless and danger buttons have a
  transparent border, which forced-colours mode paints, so they keep a visible
  outline.
- **Large text on phones:** the header's Contact button (and the dashboard's
  "View site" link) were meant to be hidden on small screens but never were —
  `hidden` lost to the button's built-in `inline-flex`; now `max-lg:hidden` /
  `max-sm:hidden`. Section headings, skill and achievement card rows and the
  filter bar now wrap, and headings break over-long words, so pages fit at
  200 % text with the menu reachable.
- A unit test that tampers with encrypted 2FA secrets failed about once in 64
  runs (the replacement character could equal the original); it now always
  changes it.
- **Accessibility:** form field borders now contrast at least 3:1 in both themes
  (were 1.44:1 light and 1.59:1 dark; new `--line-input` token).
- The media library's Save, Replace file and Delete controls include the file
  name in their accessible names, and the delete confirmation names the file.
- Confirmation dialogs are announced as alert dialogs and open with focus on
  Cancel.
- A thin progress bar (announced as "Loading page…") appears when a page takes
  more than 150 ms to load after clicking a link.
- After the contact form is sent, focus moves to the confirmation.
- The current page is underlined in the navigation, not shown by colour only.
- Larger tap areas for footer links on phones, "All projects"-style links and
  checkbox labels; the dashboard's content table is named by its heading.

- **Social sharing:** pages set their own Open Graph data, which Next.js uses
  instead of the layout's, so `og:site_name`, `og:type` and the default sharing
  image were missing on every page. All pages now build the full set
  (`socialMetadata` in `src/server/seo.ts`), including the RSS `<link>`, which
  was missing for the same reason.
- Sharing images are served as 1200 × 630 JPEG (`/media/og/<key>.jpg`); pages
  with an image use the large X card; journal entries share their first image,
  otherwise the default one.
- Page titles include the site name until a title template is saved.
- RSS items have a description (summary or first section) and the feed has a
  real description and `lastBuildDate`.
- The sitemap lists a section only when it has published content.
- JSON-LD: projects and journal entries include `image`, `mainEntityOfPage` and
  the author's URL; the home page's `sameAs` lists only links marked as yours.
- The dashboard and API send `X-Robots-Tag: noindex, nofollow`.
- `admin:create` showed the typed password on Windows terminals; it is now read
  in raw mode and shown as `*`.
- The documented media restore failed when the backup file belonged to a
  different host user than the container's (backups are mode 600). The archive
  is now streamed into the container.

### Added

- The production smoke test deletes every stored media file, restores the media
  backup, and requires identical SHA-256 checksums for every file and a
  byte-identical served image, so media recovery is tested in CI like the
  database. The result is published as a CI annotation.
- docs/DEPLOYMENT_PREPARATION.md: costs, decisions and order of work before
  deploying.

## [0.4.0] — 2026-11-01

Production readiness. Nothing was deployed, bought or registered.

### Added

- **Two-factor authentication (TOTP)** with 10 single-use recovery codes, replay
  protection, a 5-attempt lockout, encrypted secrets, and sign-in activity on
  the Account page. The password step no longer creates a session when 2FA is
  on; a signed 5-minute ticket carries it to the code step.
- **S3-compatible media storage** (`STORAGE_DRIVER=s3`), tested in CI against
  SeaweedFS with signature checking. Local disk stays the default.
- **Contact email notifications** over any SMTP provider (`SMTP_URL`), off by
  default. Messages are stored first; failures are logged and never reach the
  visitor; spam never sends mail.
- **Database restore script** (`infra/backup/restore.sh`): test restores into a
  separate database with a row-count comparison, or disaster recovery over the
  live database (with `RESTORE_OVERWRITE=yes`).
- **Backup and restore in CI:** the production smoke test now backs up,
  restores into a separate database and performs a full disaster recovery.
- **Hourly data retention:** expired sessions and rate-limit rows, audit log
  entries over 365 days and spam over 30 days are deleted (`npm run maintenance`).
- docs/CONTENT_GUIDE.md (what the owner must enter), and in
  docs/DEPLOYMENT.md a launch checklist, storage/email/monitoring options and
  the tested recovery procedure.

### Fixed

- `backup.sh` could not write the media archive (the container user had no
  access to the host directory).
- The documented restore made the tables owned by `postgres`, so later
  migrations would have failed. Restores now create objects as `site_owner`.
- Production accepted a plain-http `SITE_URL`.
- Empty environment variables from Compose (`VAR=`) failed validation instead
  of meaning "not set".
- If `APP_SECRET` changed, an authenticator code caused a server error; it is
  now rejected cleanly and recovery codes still work.
- Docker logs had no size limit; every service now rotates at 10 MB × 5.

### Changed

- Monospace text uses the system monospace font instead of downloading
  JetBrains Mono: simulated mobile LCP on /skills and /search fell from about
  3.0 s to 0.64 s, and on the home page from 3.16 s to 2.84 s.
- nodemailer 10.1.4 (address-parser advisories fixed); the test SMTP server
  is pinned to the same version through an override.
- CI's S3 tests use SeaweedFS (LocalStack's image no longer starts without an
  account token).

## [0.3.0] — 2026-11-01

### Added

- **Journal attachments:** a journal entry's file list accepts PDFs as well as
  images; images render in the entry, PDFs are listed under "Attachments".
  Publishing is refused if any listed file is private.
- **Related certificates on the Skills page:** each skill lists the published
  certifications linked to it, next to the projects that use it.
- **Email links on the Links page:** a link can be `mailto:address`. Extra
  `mailto` parameters (`?cc=`, `?body=`, …) are rejected; email links do not
  open a new tab and show the address.
- **Replace a media file** (`PUT /api/v1/admin/media/:id/file`, "Replace file"
  in the library): the item keeps its id, alt text and access, so every page
  using it shows the new file; new storage keys bust the immutable cache and
  the old files are deleted. Images can only be replaced by images and PDFs by
  PDFs, with the same validation as uploads.

### Fixed

- Inline links inside sentences ("Used in …", "Subscribe via RSS") are
  underlined so they are not distinguished by colour alone (WCAG 1.4.1).
- Skill category sections were unlabelled for screen readers when the category
  name contained a space (`aria-labelledby` ids cannot contain spaces).
- Creating a category or tag no longer says "Draft created … publish it": those
  are live immediately, and the button now reads "Create".

### Changed

- CI uploads Playwright reports with `actions/upload-artifact@v7` (Node.js 24).
- Upload and replace share one validation path (`readUploadForm`, `storeFile`).

## [0.2.2] — 2026-11-01

### Fixed

- **Metadata was streamed into `<body>`** for browsers and crawlers that
  Next.js does not recognise as bots, so some link previews and audit tools saw
  no description or Open Graph tags. Metadata is now always in `<head>`.
- **Journal entries without a summary had no meta description;** a plain-text
  excerpt of the first written section is used instead.
- **Heading order on `/projects`** skipped from h1 to h3; project cards there are h2.
- **Dashboard landmarks:** the sidebar is now a single named navigation
  landmark, and the publishing panel is a named region.

### Changed

- Priority images are preloaded in `<head>`; the first featured project image on
  the home page loads eagerly when there is no profile photo; the monospace font
  is no longer preloaded.
- End-to-end accessibility checks now include axe's best-practice rules.

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
