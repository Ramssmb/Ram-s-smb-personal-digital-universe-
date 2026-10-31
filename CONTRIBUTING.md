# Contributing

This is a personal project, but changes follow the same rules whoever makes them.

## Workflow

1. Branch from `main`.
2. Make the change with tests.
3. Run the checks below; all must pass.
4. Open a pull request. CI runs the same checks plus end-to-end tests and a
   production-stack smoke test.

## Checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test                    # unit
npm run test:integration    # needs the test database (see README)
npm run build
npm run test:e2e            # needs the e2e database and a build
```

## Rules

- **Never invent personal information.** Seeds contain structure and facts the
  owner confirmed; everything else is entered through the dashboard.
- **Schema changes** go in `src/server/db/schema`, then `npm run db:generate`;
  review and commit the generated SQL. CI fails if they drift apart.
- **Every admin API handler** starts with `await requireAdmin(request)`. A test
  scans `src/app/api/v1/admin` and fails otherwise.
- **Public queries** go through `src/server/content/public.ts`, which applies the
  visibility rule (published _and_ public).
- **New content types** are added in `src/lib/content/collections.ts` (fields)
  and `src/server/content/registry.ts` (table and joins); the admin UI and API
  follow automatically.
- **User-supplied HTML is never rendered.** Markdown goes through
  `renderMarkdown`; external links through `ExternalLink` or `safeExternalUrl`.
- **No secrets in the repository**, and none with the `NEXT_PUBLIC_` prefix.
- Keep components accessible: labels for every input, visible focus, and no
  information conveyed by color alone. The axe checks in the e2e suite must pass.
