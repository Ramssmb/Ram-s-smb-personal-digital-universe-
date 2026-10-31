# Project progress

Last updated: 2026-11-01

## Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Repository inspection | ✅ Done (2026-11-01) |
| 2 | System design | ✅ Done (2026-11-01) — awaiting owner review |
| 3 | Foundation and design system | Not started |
| 4 | Authentication and admin shell | Not started |
| 5 | Content vertical slices | Not started |
| 6 | Media | Not started |
| 7 | Search, SEO and discovery | Not started |
| 8 | Security and performance review | Not started |
| 9 | Testing and quality | Not started |
| 10 | Deployment | Not started |

Phase order and exit criteria: [docs/ROADMAP.md](docs/ROADMAP.md).

## Phase 1 — Repository inspection

- The working folder `Desktop\cc` is **DevPulse** (API monitoring platform,
  `Ramssmb/DevPulse`), not a personal site. It was left untouched; DevPulse will
  be a featured project on this site.
- `Desktop\Ram's website` was empty.
- This repository was created at `C:\dev\personal-site`, outside OneDrive, to
  avoid sync conflicts and slow installs.
- Environment: Node 24.22, npm 11.19, Docker 29.8, Git 2.56, Python 3.13.
  Not on PATH: `gh`, `pnpm`, `psql` (PostgreSQL will run in Docker).

## Phase 2 — System design

Created: `ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/API_DESIGN.md`,
`docs/AUTH_AND_SECURITY.md`, `docs/DESIGN_SYSTEM.md`, `docs/ROADMAP.md`,
`README.md`, `.gitignore`. No application code, no database yet.

Key decisions (details in `ARCHITECTURE.md` §3): Next.js full-stack TypeScript
with server rendering; PostgreSQL 17 + Drizzle; REST for all writes; database
sessions with Argon2id and no public registration; sanitized Markdown; storage
adapter with private files never public; Postgres full-text search; tag-based
revalidation; Tailwind v4 design tokens.

## Open decisions

| Decision | Needed by |
|----------|-----------|
| Hosting: VPS (Docker + Caddy) or managed (Vercel + Neon + R2) | Phase 10 (storage adapter supports both) |
| Display name and identity details | Phase 5.1 (content stays draft until provided) |
| Whether to draft content from an existing resume | Phase 5 |
| Domain name | Phase 10 |
| GitHub repository name and visibility | Before first push |

## Known issues

None (no code yet).

## Next action

Phase 3: scaffold the application, local PostgreSQL, migrations tooling, CI and
the design system.
