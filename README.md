# Ram's Smb — Personal Digital Universe

A full-scale personal digital platform showcasing my education, skills,
projects, achievements, experience, daily learning journey and professional
links — managed entirely from a private admin dashboard.

> **Status:** v0.4.0, ready for a production deployment and tested locally and
> in CI (including backup and restore). Not yet deployed to a public domain —
> see [docs/DEPLOYMENT_PREPARATION.md](docs/DEPLOYMENT_PREPARATION.md).
> Progress and known limitations: [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md).

## What it does

- **Public site** — home, about, education, skills, projects (with detail
  pages), experience, achievements and certifications, a dated learning
  journal with archive and RSS, resources, links, contact form and site search.
  Light and dark themes, responsive from phone to desktop.
- **Private dashboard** (`/admin`) — create, edit, publish, unpublish, archive,
  reorder, feature and hide every piece of content; preview drafts; upload
  images and PDFs; manage categories, tags, SEO and settings; read contact
  messages. No code changes needed to update the site.
- **Honest by design** — nothing is shown until you publish it, and the
  starter data contains only structure and facts you confirmed.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL 17 · Drizzle ORM ·
Tailwind CSS v4 · Vitest · Playwright · Docker + Caddy.
Rationale for each choice: [ARCHITECTURE.md](ARCHITECTURE.md).

## Run it locally

Requirements: **Node.js 24+** and **PostgreSQL 17**. The easiest way to get
PostgreSQL is Docker Desktop (on Windows Home it needs WSL 2:
`wsl --install` in an administrator terminal, then restart).

```bash
cp .env.example .env
# Set APP_SECRET in .env:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

docker compose up -d db       # PostgreSQL 17 on 127.0.0.1:5433 with dev/test/e2e databases
npm install
npm run db:migrate            # create the schema
npm run db:seed               # categories, empty draft sections, verified facts
npm run admin:create          # your owner account (prompts for email and password)
npm run dev                   # http://localhost:3000  — dashboard at /admin
```

## Commands

| Command                    | What it does                                                    |
| -------------------------- | --------------------------------------------------------------- |
| `npm run dev`              | Development server                                              |
| `npm run build`            | Production build (needs no database)                            |
| `npm run lint`             | ESLint                                                          |
| `npm run typecheck`        | TypeScript (strict)                                             |
| `npm run format`           | Prettier                                                        |
| `npm test`                 | Unit tests                                                      |
| `npm run test:integration` | Integration tests against `personal_site_test`                  |
| `npm run test:e2e`         | Playwright against the production build and `personal_site_e2e` |
| `npm run db:generate`      | Create a migration after changing `src/server/db/schema`        |
| `npm run db:migrate`       | Apply migrations                                                |
| `npm run db:seed`          | Seed structure (safe to repeat)                                 |
| `npm run admin:create`     | Create the owner account or reset its password                  |

First-time end-to-end setup: `npx playwright install chromium`.

## Project layout

```
src/app/(site)/        Public pages
src/app/admin/         Dashboard (login, content, media, messages, settings, account)
src/app/api/v1/        REST API (auth, admin, contact, health)
src/components/        ui/ design system · site/ chrome · public/ · admin/
src/lib/content/       Content type definitions shared by forms, API and services
src/server/            Server-only: auth, db, content services, media, security
drizzle/               Reviewed SQL migrations
infra/                 Postgres roles, Caddy, backups
tests/                 unit/ · integration/ · e2e/
```

## Documentation

| Document                                                         | Contents                                      |
| ---------------------------------------------------------------- | --------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                               | System design and decisions                   |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)               | Schema                                        |
| [docs/API_DESIGN.md](docs/API_DESIGN.md)                         | REST API                                      |
| [docs/AUTH_AND_SECURITY.md](docs/AUTH_AND_SECURITY.md)           | Authentication and security controls          |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)                   | Visual and interaction design                 |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                         | Production deployment, backups, rollback      |
| [docs/DEPLOYMENT_PREPARATION.md](docs/DEPLOYMENT_PREPARATION.md) | Before deploying: costs, decisions, checklist |
| [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)                   | What to enter in the dashboard                |
| [docs/FUNCTIONAL_AUDIT.md](docs/FUNCTIONAL_AUDIT.md)             | Functional audit of the running app (v0.4.0)  |
| [docs/ROADMAP.md](docs/ROADMAP.md)                               | Phases and exit criteria                      |
| [CHANGELOG.md](CHANGELOG.md)                                     | Release notes                                 |
| [CONTRIBUTING.md](CONTRIBUTING.md)                               | Workflow and rules                            |
