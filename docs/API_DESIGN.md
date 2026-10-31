# API design

> Status: **Phase 2 — Design.** REST over HTTPS, JSON bodies, versioned under
> `/api/v1`. See [ARCHITECTURE.md §D4](../ARCHITECTURE.md) for why writes use REST.

## 1. Conventions

| Topic           | Rule                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path       | `/api/v1` — public endpoints; `/api/v1/admin` — owner only                                                                                                |
| Format          | `application/json; charset=utf-8`; uploads use `multipart/form-data`                                                                                      |
| Ids             | UUIDs in paths; public pages use slugs                                                                                                                    |
| Dates           | `YYYY-MM-DD` for calendar dates, ISO 8601 UTC for timestamps                                                                                              |
| Validation      | Every body, query and path parameter parsed with a Zod schema from `src/lib/validation`; unknown fields rejected                                          |
| Partial updates | `PATCH` with only changed fields                                                                                                                          |
| Concurrency     | Each content row returns `updatedAt`; `PATCH` must send it back, and a stale value returns `409 conflict` (prevents two open tabs overwriting each other) |
| Caching         | Admin responses: `Cache-Control: no-store`. Public JSON: short `s-maxage` + tag revalidation                                                              |
| CSRF            | Every non-`GET` request must carry an `Origin` header equal to the site origin; otherwise `403`. Session cookie is `SameSite=Lax`.                        |

### Error shape

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Some fields are invalid.",
    "fields": { "title": "Required" },
    "requestId": "01J..."
  }
}
```

| Status | `code`                        | When                                                                                                     |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| 400    | `validation_failed`           | Body/query failed validation (`fields` lists them)                                                       |
| 401    | `unauthenticated`             | No valid session                                                                                         |
| 403    | `forbidden` / `csrf_rejected` | Signed in without permission / bad `Origin`                                                              |
| 404    | `not_found`                   | Missing, **or** not visible to this viewer (drafts never return 403, so their existence is not revealed) |
| 409    | `conflict`                    | Slug taken, stale `updatedAt`, media still in use                                                        |
| 413    | `payload_too_large`           | Upload over the limit                                                                                    |
| 415    | `unsupported_media_type`      | File content not on the allow-list                                                                       |
| 429    | `rate_limited`                | With `Retry-After`                                                                                       |
| 500    | `internal_error`              | Generic message only; details go to logs with the `requestId`                                            |

Stack traces, SQL and file paths are never returned.

### Pagination

Lists use **cursor pagination** (`?cursor=<opaque>&limit=20`, max 100) ordered by
a stable key, returning `{ items, nextCursor }`. Admin tables also accept
`?q=`, `?status=`, `?visibility=`, `?featured=`, `?sort=`.

## 2. Public endpoints

Public pages read through services during server rendering; these endpoints
exist only for browser-side interactions.

| Method | Path                                         | Purpose                                                 |
| ------ | -------------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/v1/search?q=&type=&limit=`             | Global search (rate-limited)                            |
| GET    | `/api/v1/journal?cursor=&tag=&skill=&month=` | "Load more" on the timeline                             |
| POST   | `/api/v1/contact`                            | Contact form (rate-limited, honeypot, timing check)     |
| GET    | `/api/v1/health`                             | Liveness + database reachability (no version or detail) |
| GET    | `/media/<key>/<variant>`                     | Public media, immutable cache                           |

Also generated: `/sitemap.xml`, `/robots.txt`, `/feed.xml` (journal RSS),
per-page Open Graph images.

## 3. Auth endpoints

| Method | Path                   | Purpose                                                     |
| ------ | ---------------------- | ----------------------------------------------------------- |
| POST   | `/api/v1/auth/login`   | Email + password → session cookie (or "TOTP required" step) |
| POST   | `/api/v1/auth/totp`    | Complete two-factor step                                    |
| POST   | `/api/v1/auth/logout`  | Revoke current session                                      |
| GET    | `/api/v1/auth/session` | Current user (admin UI)                                     |

## 4. Admin endpoints

Every handler begins with `const admin = await requireAdmin(request)`.
Resources follow one uniform pattern so the dashboard reuses one set of list and
form components:

| Method | Path                              | Action                                                                                    |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/admin/<resource>`               | List with search, filters, pagination                                                     |
| POST   | `/admin/<resource>`               | Create (always as `draft`)                                                                |
| GET    | `/admin/<resource>/:id`           | Read one, including drafts and private                                                    |
| PATCH  | `/admin/<resource>/:id`           | Update fields                                                                             |
| POST   | `/admin/<resource>/:id/publish`   | Validate completeness, set `published`, revalidate pages                                  |
| POST   | `/admin/<resource>/:id/unpublish` | Back to `draft`                                                                           |
| POST   | `/admin/<resource>/:id/archive`   | Set `archived`                                                                            |
| DELETE | `/admin/<resource>/:id`           | Permanent delete (UI confirms first)                                                      |
| POST   | `/admin/<resource>/reorder`       | Body `{ ids: [...] }` sets `sort_order`                                                   |
| GET    | `/admin/<resource>/:id/preview`   | Issues a short-lived preview token; the public page renders the draft for that token only |

`<resource>` ∈ `about-sections`, `education`, `courses`, `milestones`, `skills`,
`skill-categories`, `projects`, `project-categories`, `experiences`,
`certifications`, `achievements`, `journal`, `resources`, `resource-categories`,
`links`, `link-categories`, `tags`.

Singletons and others:

| Method           | Path                                                  | Purpose                                            |
| ---------------- | ----------------------------------------------------- | -------------------------------------------------- |
| GET/PATCH        | `/admin/profile`                                      | Profile                                            |
| GET/PATCH        | `/admin/settings`                                     | Website settings                                   |
| GET/PUT/DELETE   | `/admin/seo/:routeKey`                                | SEO overrides                                      |
| GET              | `/admin/overview`                                     | Counts, drafts, recent messages, last journal date |
| GET/PATCH/DELETE | `/admin/messages[/:id]`                               | Contact inbox                                      |
| POST             | `/admin/media`                                        | Upload (multipart; `access=public                  | private`) |
| GET/PATCH/DELETE | `/admin/media[/:id]`                                  | List, edit alt text, delete (409 if in use)        |
| GET              | `/admin/media/:id/file`                               | Stream a private file to the owner                 |
| POST             | `/admin/account/password`                             | Change password (revokes other sessions)           |
| POST             | `/admin/account/totp/setup` · `/confirm` · `/disable` | Two-factor                                         |
| GET/DELETE       | `/admin/account/sessions[/:id]`                       | List / revoke sessions                             |
| GET              | `/admin/audit-log`                                    | Recent activity                                    |

## 5. Publishing completeness rules

`publish` refuses (`400 validation_failed`) when public output would be broken,
for example: a project without a summary; an image without alt text; a journal
entry with no content section; a certificate whose attached file is private and
no verification URL (the public page would have nothing to show). Drafts may be
incomplete.

## 6. Revalidation map

| Change to      | Revalidated tags                                                                    |
| -------------- | ----------------------------------------------------------------------------------- |
| Profile, about | `home`, `about`, `og`                                                               |
| Project        | `projects`, `project:<slug>`, `home`, `skills`, `search`, `sitemap`                 |
| Journal entry  | `journal`, `journal:<slug>`, `journal-archive`, `home`, `feed`, `search`, `sitemap` |
| Skill          | `skills`, `home`, every page that lists it, `search`                                |
| Settings / SEO | all (`layout`)                                                                      |

## 7. As built (v0.2.0)

| Method             | Path                                                                             | Notes                                                              |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| GET, POST          | `/api/v1/admin/collections/:collection`                                          | List (`q`, `status`, `page`, `pageSize`) / create (always a draft) |
| GET, PATCH, DELETE | `/api/v1/admin/collections/:collection/:id`                                      | PATCH body `{ data, updatedAt }`; stale `updatedAt` → 409          |
| POST               | `/api/v1/admin/collections/:collection/:id/(publish\|unpublish\|archive\|flags)` | `flags` body `{ visibility?, isFeatured? }`                        |
| POST               | `/api/v1/admin/collections/:collection/reorder`                                  | `{ ids: [...] }`                                                   |
| GET, PUT           | `/api/v1/admin/profile`, `/api/v1/admin/settings`                                | Singletons                                                         |
| PUT                | `/api/v1/admin/seo/:key`                                                         | Fixed page keys only                                               |
| GET, POST          | `/api/v1/admin/media`                                                            | Upload is `multipart/form-data` (`file`, `access`, `altText`)      |
| GET, PATCH, DELETE | `/api/v1/admin/media/:id`                                                        | Delete or make private → 409 while in use                          |
| GET                | `/api/v1/admin/media/:id/file`                                                   | Owner-only file stream (works for private files)                   |
| PATCH, DELETE      | `/api/v1/admin/messages/:id`                                                     | Status `new`/`read`/`archived`/`spam`                              |
| POST               | `/api/v1/admin/account/password`                                                 | Signs out every other session                                      |
| DELETE             | `/api/v1/admin/account/sessions`                                                 | Signs out other sessions                                           |
| POST               | `/api/v1/auth/login`, `/api/v1/auth/logout`                                      |                                                                    |
| POST               | `/api/v1/contact`                                                                | 202 on success (also for silently filed spam)                      |
| GET                | `/api/v1/health`                                                                 |                                                                    |
| GET                | `/media/<key>`                                                                   | Public files only, immutable cache                                 |

Differences from the design above: pagination is offset-based (`page`), not
cursor-based; preview is an owner-only page (`/admin/preview/:collection/:id`)
rather than a preview token; search is the server-rendered `/search` page
(rate-limited) rather than a JSON endpoint; the journal "load more" endpoint was
replaced by page links; there are no TOTP endpoints yet.
