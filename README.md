# Ram's SMB — Personal Digital Universe

A full-scale personal digital platform showcasing my education, skills,
projects, achievements, experience, daily learning journey and professional
links — managed entirely from a private admin dashboard.

> **Status:** Phase 3 (foundation and design system). The application shell,
> database tooling, design system and CI exist; content features arrive from
> Phase 5. Progress: [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md).

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL 17 · Drizzle ORM · Tailwind CSS v4
· Vitest · Playwright. Rationale: [ARCHITECTURE.md](ARCHITECTURE.md).

## Local setup

Requirements: Node.js 24+ and Docker Desktop. On Windows Home, Docker Desktop
needs WSL 2 (`wsl --install` in an administrator terminal, then restart).

```bash
cp .env.example .env          # local values; set DESIGN_GALLERY=1 to see /admin/design
docker compose up -d db       # PostgreSQL 17 on 127.0.0.1:5433, creates both roles
npm install
npm run db:migrate            # applies ./drizzle as the schema-owner role
npm run dev                   # http://localhost:3000
```

## Commands

| Command                    | What it does                                                         |
| -------------------------- | -------------------------------------------------------------------- |
| `npm run dev`              | Development server                                                   |
| `npm run build`            | Production build (does not need a database)                          |
| `npm start`                | Serve the production build                                           |
| `npm run lint`             | ESLint                                                               |
| `npm run typecheck`        | TypeScript, strict                                                   |
| `npm run format`           | Prettier                                                             |
| `npm test`                 | Unit tests (no database)                                             |
| `npm run test:integration` | Integration tests against the `personal_site_test` database          |
| `npm run test:e2e`         | Playwright against the production build at phone, tablet and desktop |
| `npm run db:generate`      | Create a SQL migration after changing `src/server/db/schema`         |
| `npm run db:migrate`       | Apply pending migrations                                             |

First-time end-to-end setup: `npx playwright install chromium`.

## Project layout

```
src/app/              Routes and pages (public, /admin, /api/v1)
src/components/ui/    Design-system components
src/components/site/  Header, footer, navigation, theme toggle
src/server/           Server-only code: env, db, services, http, security
src/lib/              Shared helpers (safe URLs, theme)
drizzle/              Reviewed SQL migrations
infra/postgres/       Local database roles
tests/                unit/, integration/, e2e/
```

## Documentation

| Document                                               | Contents                      |
| ------------------------------------------------------ | ----------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                     | System design and decisions   |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)     | Schema                        |
| [docs/API_DESIGN.md](docs/API_DESIGN.md)               | REST API                      |
| [docs/AUTH_AND_SECURITY.md](docs/AUTH_AND_SECURITY.md) | Auth and security controls    |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)         | Visual and interaction design |
| [docs/ROADMAP.md](docs/ROADMAP.md)                     | Phases and exit criteria      |
