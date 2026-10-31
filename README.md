# Ram's SMB — Personal Digital Universe

A full-scale personal digital platform showcasing my education, skills,
projects, achievements, experience, daily learning journey and professional
links — managed entirely from a private admin dashboard.

> **Status:** design complete (Phase 2). No application code yet; setup
> instructions below describe the planned workflow and will be verified in
> Phase 3. Progress: [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md).

## Stack

Next.js (App Router) · TypeScript · PostgreSQL 17 · Drizzle ORM · Tailwind CSS v4
· Vitest · Playwright. Rationale: [ARCHITECTURE.md](ARCHITECTURE.md).

## Documentation

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and decisions |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | Schema |
| [docs/API_DESIGN.md](docs/API_DESIGN.md) | REST API |
| [docs/AUTH_AND_SECURITY.md](docs/AUTH_AND_SECURITY.md) | Auth and security controls |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Visual and interaction design |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases and exit criteria |

## Planned local setup (Phase 3)

Requirements: Node.js 24+, Docker Desktop.

```bash
cp .env.example .env          # fill in local values
docker compose up -d db       # PostgreSQL 17
npm install
npm run db:migrate
npm run admin:create          # create the owner account (prompts for password)
npm run dev                   # http://localhost:3000
```
