# Project progress

Last updated: 2026-11-01

## Status

| Phase | Name                            | Status                         |
| ----- | ------------------------------- | ------------------------------ |
| 1     | Repository inspection           | ✅ Done (2026-11-01)           |
| 2     | System design                   | ✅ Done (2026-11-01), approved |
| 3     | Foundation and design system    | ✅ Done (2026-11-01)           |
| 4     | Authentication and admin shell  | Not started                    |
| 5     | Content vertical slices         | Not started                    |
| 6     | Media                           | Not started                    |
| 7     | Search, SEO and discovery       | Not started                    |
| 8     | Security and performance review | Not started                    |
| 9     | Testing and quality             | Not started                    |
| 10    | Deployment                      | Not started                    |

Phase order and exit criteria: [docs/ROADMAP.md](docs/ROADMAP.md).

## Phase 1 — Repository inspection

- The working folder `Desktop\cc` is **DevPulse** (API monitoring platform,
  `Ramssmb/DevPulse`), not a personal site. It was left untouched; DevPulse will
  be a featured project on this site.
- This repository lives at `C:\dev\personal-site`, outside OneDrive, and is
  pushed to `github.com/Ramssmb/Ram-s-smb-personal-digital-universe-`.

## Phase 2 — System design

`ARCHITECTURE.md` and `docs/*`: architecture decisions D1–D13, schema, REST API,
auth and security controls, design system, roadmap.

## Phase 3 — Foundation and design system

**Built**

- Next.js 16.4 + React 19.3 + TypeScript 6 (strict, `noUncheckedIndexedAccess`),
  typed routes, standalone output, ESLint, Prettier.
- Environment validation (`src/server/env.ts`): lazy, lists invalid variable
  names without their values.
- Structured JSON logging (pino) with redaction of passwords, tokens, cookies
  and bodies.
- API conventions: `apiHandler` wrapper (request id, one log line per request,
  documented error shape, `no-store`), JSON 404 for unknown `/api` paths,
  `/api/v1/health`.
- Security headers: nonce-based CSP per request (`src/proxy.ts`), nosniff,
  frame denial, referrer and permissions policies, COOP, HSTS in production,
  no `X-Powered-By`.
- Database: Drizzle schema, first migration (all 12 shared enums and
  `site_settings`), migration script, Docker Compose PostgreSQL 17, two roles
  (`site_owner` owns the schema, `site_app` can only read and write rows).
- Design system: color tokens for light/dark (OS-driven or forced by a
  cookie, no flash), type scale, radius, motion, reduced-motion support; Inter
  and JetBrains Mono self-hosted via `next/font`.
- Components: Button, IconButton, ButtonLink, TextLink, ExternalLink (rejects
  unsafe URLs), Field, Input, Textarea, Select, Checkbox, Switch, Badge, Tag,
  Card, EmptyState, Skeleton, Alert, Dialog, ConfirmDialog, Container,
  PageHeader, Section; site header, desktop and mobile navigation, footer, skip
  link, theme toggle.
- Pages: home (honest empty state), 404, error, global error, and the
  component gallery `/admin/design` (404 unless `DESIGN_GALLERY=1`; noindex).
- Tests: 60 unit tests; integration tests for migrations, constraints, role
  privileges, settings service and health; Playwright end-to-end tests at
  phone/tablet/desktop with axe (WCAG 2.2 AA) in both themes, CSP nonce checks,
  theme persistence, skip link, 404s and the confirm dialog.
- CI (`.github/workflows/ci.yml`): format, lint, typecheck, unit tests,
  schema-vs-migration drift check, integration tests on PostgreSQL 17, build,
  end-to-end tests, dependency audit.

**Decisions**

- D10 revised: pages render per request (needed for the CSP nonce and the
  server-read theme cookie); content will be cached at the data layer.
- postgres.js pinned to 3.4.9 (4.0.0 was 3 days old); TypeScript 6.0.3 rather
  than 7 (Next.js type-checking relies on the TypeScript JS API).
- Dependency audit policy: production dependencies must be clean (they are);
  two development-only findings are documented as accepted
  (docs/AUTH_AND_SECURITY.md §14).
- Components not yet needed (Tabs, Combobox, Toast, Markdown editor, command
  palette, ...) are built in the phase that first uses them, so nothing is
  unused or untested.

**Verification (2026-11-01)**

- Local: lint, typecheck, 60 unit tests, production build, 8 integration tests
  and 45 end-to-end tests (15 scenarios × phone, tablet, desktop). The database
  tests ran on a temporary portable PostgreSQL 17, because Docker cannot run on
  this machine yet (no WSL).
- The first CI run failed one end-to-end check (an ARIA attribute on the
  gallery's skeleton example). It was reproduced locally, fixed in `d2e24b0`, and
  the axe helper now names the offending elements.
- Manual check in a browser: light and dark themes, component gallery, no
  console errors or CSP violations.

## Open decisions

| Decision                                                      | Needed by                                      |
| ------------------------------------------------------------- | ---------------------------------------------- |
| Enable WSL 2 so Docker works locally (owner action)           | Phase 4 (local database work)                  |
| Hosting: VPS (Docker + Caddy) or managed (Vercel + Neon + R2) | Phase 10 (storage adapter supports both)       |
| Display name and identity details                             | Phase 5.1 (content stays draft until provided) |
| Whether to draft content from an existing resume              | Phase 5                                        |
| Domain name                                                   | Phase 10                                       |

## Known issues

- `docker compose up -d db` does not work on this machine until WSL 2 is
  enabled (see above).
- `/admin/design` is protected only by the `DESIGN_GALLERY` flag until Phase 4
  adds `requireAdmin`. It contains no data.

## Next action

Phase 4: authentication and the admin shell.
