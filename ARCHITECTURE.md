# Architecture

> Status: **Implemented (v0.2.0).** This document records the design and every
> significant decision. §7 lists where the implementation refined the design.
> Detailed designs live in [`docs/`](docs/).

| Document                                               | Contents                                              |
| ------------------------------------------------------ | ----------------------------------------------------- |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)     | Tables, columns, constraints, indexes, search         |
| [docs/API_DESIGN.md](docs/API_DESIGN.md)               | REST endpoints, conventions, errors, pagination       |
| [docs/AUTH_AND_SECURITY.md](docs/AUTH_AND_SECURITY.md) | Authentication, authorization, threat model, controls |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)         | Tokens, typography, components, layout, themes        |
| [docs/ROADMAP.md](docs/ROADMAP.md)                     | Phases, milestones and exit criteria                  |

## 1. Product summary

A personal platform that presents one person's identity, education, skills,
projects, experience, credentials, daily learning journal, resources and links,
managed entirely from a private admin dashboard. One owner writes; anyone can read
what the owner has published.

Two properties drive most decisions:

1. **Public pages must be discoverable and fast.** Search engines and link-preview
   bots must receive complete HTML.
2. **The owner must never need to touch code to change content.** Every piece of
   personal information lives in the database, behind validated admin forms.

## 2. System overview

```
                   ┌──────────────────────────────────────────────┐
  Visitor ───────► │ Next.js application (one Node.js process)    │
  Search bots      │                                              │
                   │  Public pages   server-rendered, cached,     │
                   │                 revalidated on publish       │
  Owner ─────────► │  Admin pages    server-rendered, never cached│
  (signed in)      │  /api/v1/*      REST route handlers          │
                   │                                              │
                   │  services → data access (Drizzle) ───────────┼──► PostgreSQL 17
                   │  storage adapter ────────────────────────────┼──► disk volume or
                   └──────────────────────────────────────────────┘     S3-compatible bucket
                          ▲ HTTPS (TLS terminated by Caddy or the host platform)
```

There is one deployable application and one database. No microservices, no
message queue, no cache server: a single-author site does not need them, and each
would add operational cost with no measurable benefit.

## 3. Technology decisions

### D1. Next.js (App Router) full-stack TypeScript, not a React SPA

**Decision.** One Next.js application renders public pages on the server and also
hosts the admin dashboard and the REST API.

**Why.** A client-rendered SPA (as used in DevPulse) sends an empty HTML shell.
Google can render JavaScript late and unreliably; LinkedIn, WhatsApp, X and Slack
preview bots do not render it at all, so shared links would show no title or
image. Server rendering gives complete HTML, correct per-page metadata and good
Largest Contentful Paint. One language (TypeScript) across UI, API and database
access lets validation schemas and types be shared.

**Trade-offs.** Next.js changes quickly and has a larger surface than a plain SPA.
Mitigations: exact version pins, a lockfile, Dependabot, and no reliance on
experimental features. Auth is enforced in handlers and services, never only in
middleware (see D6).

**Rejected.** FastAPI + SPA (poor SEO without a prerender layer, two languages,
two deployments). Astro + separate API (excellent for static pages but the admin
dashboard needs a full application framework anyway).

### D2. PostgreSQL 17

Relational data with many cross-links (skills ↔ projects ↔ certifications ↔
journal entries), integrity constraints, built-in full-text search, and the
owner's existing experience from DevPulse. SQLite was considered: simpler, but
weaker for concurrent writes during uploads, no `tsvector`, and harder to host on
serverless platforms.

### D3. Drizzle ORM with reviewed SQL migrations

Drizzle's schema is TypeScript, its queries read like SQL, it ships no native
query engine, and `drizzle-kit generate` emits plain SQL migration files that are
committed and reviewed. Prisma was considered: more mature tooling but a heavier
runtime and less direct SQL. Raw SQL everywhere was considered: maximum control
but no compile-time types for rows.

Migrations are **forward-only, generated, reviewed, committed**, and applied by a
dedicated command before the app starts — never automatically by the web process.

### D4. REST API for all writes; services shared with server rendering

- Public pages call the **service layer directly** during server rendering (no
  HTTP hop to itself).
- Every **write** (create, update, publish, delete, upload, reorder) goes through
  a versioned REST endpoint under `/api/v1/admin/*`.
- Public JSON endpoints exist only where the browser needs them (search
  suggestions, contact form, journal pagination).

**Why REST over Server Actions for writes.** Server Actions are convenient but
implicit: their endpoints are generated, harder to test in isolation, and easy to
forget to authorize. Explicit REST handlers give one obvious authorization point
per route, are tested with plain HTTP requests, and could serve a future mobile
client. Admin forms submit to them with `fetch`.

### D5. Layering

```
src/app/                 Routes and pages only: parse input, call a service, render
src/server/services/     Business rules: publishing, visibility, ordering, slugs
src/server/db/           Drizzle schema, client, queries
src/server/auth/         Sessions, passwords, requireAdmin()
src/server/storage/      Storage adapters and the image pipeline
src/server/security/     Rate limiting, Origin checks, headers
src/lib/validation/      Zod schemas shared by forms and API
src/components/          ui/ (design system), public/, admin/
```

Rule: **pages and route handlers never contain SQL or business rules.** Every
service function that returns content takes an explicit `viewer` argument
(`public` or the admin session), so "only published + public content for
visitors" is enforced in one place and unit-tested.

### D6. Authentication: database sessions, Argon2id, no public sign-up

Summary (full design in [docs/AUTH_AND_SECURITY.md](docs/AUTH_AND_SECURITY.md)):

- Owner account created only with a command-line script; there is no register page.
- Passwords hashed with Argon2id.
- A random 256-bit session token in an `httpOnly`, `Secure`, `SameSite=Lax`
  cookie; only its SHA-256 hash is stored. Sessions can be listed and revoked.
- Optional TOTP two-factor authentication.
- Every admin route handler and admin service calls `requireAdmin()`. Middleware
  may redirect unauthenticated page views for convenience but is **never** the
  security boundary (CVE-2025-29927 showed Next.js middleware can be bypassed).

**Rejected.** JWTs (cannot be revoked without a server-side list, which makes them
sessions anyway); Auth.js credentials provider (discouraged by its own docs for
password login); third-party hosted auth (cost and an external dependency for a
single user).

### D7. Content format: Markdown, sanitized on the server

Long-form fields (about sections, project write-ups, journal entries) are stored
as Markdown and rendered on the server with remark/rehype and `rehype-sanitize`.
Raw HTML in Markdown is stripped. This gives rich formatting without an XSS path.

### D8. Media: storage adapter, image pipeline, private files never public

- One `Storage` interface with two adapters: local disk (a Docker volume) and
  S3-compatible object storage (e.g. Cloudflare R2). Chosen by environment.
- Uploads are checked by **content signature**, not extension, against an
  allow-list (JPEG, PNG, WebP, AVIF, PDF), and size-limited per kind.
- Images are re-encoded with `sharp` into AVIF/WebP width variants. Re-encoding
  removes EXIF metadata, including GPS location.
- Files are stored under random keys; the original name is metadata only.
- Public assets are served with long-lived immutable caching. **Private assets
  are served only through an authenticated route** that streams the file; they
  never have a public URL.

### D9. Search: PostgreSQL full-text search

Each searchable table has a generated `tsvector` column with a GIN index. Global
search runs one `UNION ALL` query over the published, public rows and ranks with
`ts_rank`. At personal-site scale (thousands of rows), this answers in
milliseconds. No external search service.

### D10. Caching and revalidation

**Revised in Phase 3.** Pages are **rendered per request**, and published content
is **cached at the data layer, revalidated by tag when it changes**: publishing a
project revalidates `projects`, `project:<slug>`, `home`, `sitemap` and `search`.
Admin pages and API responses are never cached.

Why not fully static pages: the nonce-based Content Security Policy (D6 and
docs/AUTH_AND_SECURITY.md §5) needs a fresh nonce in every HTML response, and the
theme cookie must be read on the server to avoid a flash of the wrong theme. A
statically cached page cannot carry either. The alternative, `script-src
'unsafe-inline'`, would remove most of the CSP's protection against XSS.
Rendering a cached page per request costs a few milliseconds of server time,
which is negligible at personal-site traffic; LCP is still met with compressed,
streamed HTML. This is revisited in Phase 8 with measurements.

### D11. Rate limiting stored in PostgreSQL

Login, contact form and upload endpoints are rate-limited per IP (and per account
for login) using a fixed-window counter table — the same approach proven in
DevPulse. It works across multiple instances without Redis.

### D12. Styling: Tailwind CSS v4 with a token-based design system

Semantic design tokens (CSS custom properties) for color, type, spacing, radius
and elevation, exposed to Tailwind. Light and dark themes switch tokens, not
component code. See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

### D13. Testing

| Layer             | Tool       | Runs against                                                             |
| ----------------- | ---------- | ------------------------------------------------------------------------ |
| Unit              | Vitest     | Pure functions: validation, slugs, visibility rules, Markdown sanitizing |
| Integration / API | Vitest     | Route handlers and services against a real PostgreSQL test database      |
| End-to-end        | Playwright | Built app; desktop, tablet and phone viewports; axe accessibility checks |

CI runs typecheck, lint, unit, integration, build, end-to-end and a dependency
audit on every push.

## 4. Hosting

**Open decision** (the design supports both; to be chosen before Phase 10):

| Option                                                                 | Monthly cost                 | Pros                                                                                        | Cons                                                                                                                 |
| ---------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **A. One VPS**: Docker Compose (Next.js standalone, PostgreSQL, Caddy) | ~US$5–6 + domain             | Full control, mirrors the DevPulse production setup, local-disk media, one place to back up | Owner patches the OS and runs backups                                                                                |
| **B. Managed**: Vercel + Neon PostgreSQL + Cloudflare R2               | Free tiers possible + domain | No servers, automatic HTTPS and previews                                                    | Vercel Hobby is non-commercial; serverless needs pooled DB connections; media must use object storage; three vendors |

Both use the same code: the storage adapter and database URL come from the
environment.

## 5. Environment configuration

All configuration comes from environment variables validated at startup with Zod;
the app refuses to start with a missing or malformed value. Secrets are never
prefixed `NEXT_PUBLIC_` and never reach the browser bundle. `.env.example`
documents every variable without real values.

## 6. Decisions log

| #                | Date       | Decision                | Status                                                 |
| ---------------- | ---------- | ----------------------- | ------------------------------------------------------ |
| D1–D13           | 2026-11-01 | As above                | Approved by owner (Phase 1 review)                     |
| D10 revision     | 2026-11-01 | Per-request rendering   | Phase 3: required by the nonce CSP                     |
| Hosting          | 2026-11-01 | VPS + Docker + Caddy    | Supported target; managed hosting needs the S3 adapter |
| Display identity | —          | Name and content source | Open — content stays unpublished until provided        |

## 7. Implementation notes (v0.2.0)

How the build differs from — or makes concrete — the Phase 2 design. Each
point was decided during implementation; the docs in `docs/` carry matching notes.

| Topic               | As built                                                                                                                                                                                                                                                                             | Why                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Content model       | One definition per content type in `src/lib/content/collections.ts` drives the admin form, the API validation (Zod) and which columns a service may write. A generic service (`src/server/content/service.ts`) handles create/update/publish/archive/delete/reorder for all of them. | Twelve content types with identical workflows; one tested implementation instead of twelve.                                                |
| Writes              | REST handlers under `/api/v1/admin/collections/:collection[/:id[/:action]]`, plus profile, settings, SEO, media, messages and account endpoints.                                                                                                                                     | As D4.                                                                                                                                     |
| Reads               | Server components call `src/server/content/public.ts` directly; every query applies the visibility rule.                                                                                                                                                                             | As D4/D5.                                                                                                                                  |
| Caching             | No data cache: pages render per request and read the database directly.                                                                                                                                                                                                              | Simplest correct behaviour (publishing is visible immediately); queries are indexed and small. Revisit with measurements if traffic grows. |
| Preview             | `/admin/preview/:collection/:id`, owner-only, renders the same article components as the public pages.                                                                                                                                                                               | Simpler than signed preview tokens and needs no extra secret.                                                                              |
| Pagination          | Offset (`?page=`) for public and admin lists.                                                                                                                                                                                                                                        | Lists are small; page links are shareable. Cursor pagination is unnecessary at this size.                                                  |
| Education           | Coursework is a list on the education entry; academic milestones are achievements of kind "academic".                                                                                                                                                                                | Avoids two tables with no independent lifecycle.                                                                                           |
| Categories          | One `categories` table with a `scope` (skill, project, resource).                                                                                                                                                                                                                    | One management screen for all groupings.                                                                                                   |
| Media storage       | Local disk only (`STORAGE_DIR`, a Docker volume in production).                                                                                                                                                                                                                      | The VPS deployment is the supported target; the S3 adapter is a documented follow-up.                                                      |
| 2FA (TOTP)          | Not implemented.                                                                                                                                                                                                                                                                     | Password + rate limits + revocable sessions ship first; TOTP is a documented follow-up.                                                    |
| Email notifications | Not implemented; messages are stored and shown in the dashboard inbox.                                                                                                                                                                                                               | Avoids an SMTP dependency until the owner chooses a provider.                                                                              |
| Hosting             | Single VPS with Docker Compose and Caddy (docs/DEPLOYMENT.md).                                                                                                                                                                                                                       | Resolves the open hosting decision in favour of the option the code fully supports.                                                        |
