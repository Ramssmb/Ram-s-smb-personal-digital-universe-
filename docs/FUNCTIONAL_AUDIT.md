# Functional audit

| Item             | Value                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Date             | 2026-11-01, about 23:10–23:25 IST                                                               |
| Commit tested    | `c1699a20f5cfd4057062d95de6296902d6298eb3` (`c1699a2`, v0.4.0); no application code changes     |
| Result           | **180 / 180** HTTP + database checks passed; **90 / 90** browser tests passed                   |
| Application bugs | **None found.** One documentation inaccuracy (PATCH behaviour), corrected in docs/API_DESIGN.md |
| Data left behind | No test content. Activity-log entries, sessions and rate-limit counters remain — see §8         |

The working tree also contained one untracked documentation file
(`docs/HOSTING_RESEARCH.md`), which does not affect the application.

## 1. Environment

| Component     | Details                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Machine       | Windows 11, Node.js 24.22.0                                                                                                           |
| Application   | Next.js 16.4.3 **development server** (`npm run dev`, Turbopack) at `http://localhost:3000`                                           |
| Database      | PostgreSQL 17.10 (portable build, not Docker) at `127.0.0.1:5433`, database `personal_site`                                           |
| App DB role   | `site_app` (least privilege), as configured in `.env`                                                                                 |
| Media storage | Local disk, `./storage` (`STORAGE_DRIVER` not set → local)                                                                            |
| Email         | Not configured (`SMTP_URL` empty) — notifications off                                                                                 |
| Browser tests | Playwright 1.64.1, Chromium, against the **production build** (`next start`, port 3100) and the separate database `personal_site_e2e` |
| Owner account | The local development owner from `.env` (`DEV_ADMIN_EMAIL`); two-factor authentication off on this account                            |

## 2. Methodology

1. **Backup.** Before any test, every table of `personal_site` was exported to
   JSON (`pg_dump` is not included in the portable PostgreSQL build). The
   backup is outside the repository.
2. **HTTP + database checks (180).** A script signed in as the local owner and
   used the same HTTP API the dashboard uses, then checked each result directly
   in PostgreSQL (status, timestamps, join rows, files on disk) and on the
   public pages, search, sitemap and RSS feed. Every record it created had a
   title starting with `[AUDIT TEST]` and a unique run token, and was deleted at
   the end. A final query confirmed that no row in any content table contained
   the token.
3. **Browser tests (90).** The project's Playwright suite (`npm run test:e2e`)
   drives the real dashboard and public pages in Chromium: forms, buttons,
   confirmation dialogs, the media library, the inbox, two-factor sign-in, phone
   layout and accessibility (axe). It uses its own database, which it wipes at
   the start, so it did not touch `personal_site`.
4. **Dashboard counts.** The Overview page's published / draft / archived
   counts for all 10 sections and its "new messages" count were compared with
   `count(*)` queries — all matched (0/9/0 About sections, 0/1/0 Education,
   0/0/0 for the others, 0 new messages).
5. **Consistency queries** — §6.

No real personal information was entered or published. The only personal
facts in the database are the confirmed seed data, which the tests did not
modify.

## 3. Content workflows tested

For each of the nine content types — **projects, skills, education,
experience, certifications, achievements, journal entries, resources and
links** — the script ran the full lifecycle and checked the database after each
step:

**Create** (saved as `draft`) → draft hidden on the public page → **preview**
(owner sees it; signed-out visitor is redirected) → **publish** (`published`,
`published_at` set; appears on the correct public page; project and journal
detail pages load; found by search for the seven searchable types) → **edit**
(database updated, `updated_at` advances, public page shows the new text) →
**edit from a stale copy** (rejected, `409`) → **unpublish** (`draft`, hidden;
detail pages `404`) → **archive** (`archived`, hidden, not in search) →
**delete** (row and its join rows removed).

Also tested:

- **Categories and tags:** create (skill, project and resource scopes) with
  generated slugs, rename, duplicate name, invalid scope.
- **Projects:** publishing with the required summary missing (refused with a
  message), private visibility (hidden from list, detail page, search and
  sitemap), featuring (shown on the home page).
- **Sitemap and RSS:** project and journal URLs listed only while published;
  the journal entry appears in `/journal/feed.xml` while published and is gone
  after archiving.
- **Media:** PNG upload (WebP original + resized variants on disk), private PDF
  upload, SVG and disguised text file rejected (`415`), alt-text edit, file
  replacement (same item, new file, old files deleted, project page updated),
  replacing an image with a PDF refused, deletion blocked while in use and
  removing row and files once unused.
- **Contact form → inbox:** real submission stored as `new` and listed in the
  inbox; honeypot submission stored as `spam`; invalid input refused with field
  messages; cross-site submission refused; marking as read; deleting.
- **Admin lists:** text search, status filter, pagination, invalid filter value.
- **Validation:** missing title, `javascript:` link, end year before start
  year, unknown field, skill with a project-scoped category — all refused.

## 4. Authentication, authorization and security checks

- Owner sign-in with the local account.
- **18 admin API requests** made signed out — collection list, create, read,
  delete, publish and reorder; media list, upload and delete; profile and
  settings read and update; SEO update; message update; password change,
  session revocation and two-factor setup → all `401`.
- **13 dashboard pages** visited signed out → all redirected to `/admin/login`;
  the same 13 pages load (`200`) for the owner.
- Preview pages of all nine content types signed out → not shown.
- Signed-in write from another origin → `403`; write without an `Origin`
  header → `403`; forged session cookie → `401`.
- Private PDF via the public `/media/` URL → `404`; via the owner download
  route signed out → `401`, signed in → `200`.
- Private and archived projects absent from list pages, detail pages, search
  and sitemap.
- **16 public routes** signed out (all pages, search, sitemap, robots.txt, RSS,
  health) → all `200`.
- Browser suite: anonymous access blocked, generic wrong-password message,
  sign-out ends the session, two-factor set-up / sign-in / turn-off, security
  headers and CSP, private content not reachable without signing in.

## 5. HTTP + database checks — all 180 results

Run 2 (the corrected script — see §9). "HTTP" is the response status.

| #   | Feature           | Test                                       | Expected                                                                      | Actual                                                                                                                 | Result  |
| --- | ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Auth              | Owner sign-in (local dev account)          | 200 and a session cookie                                                      | HTTP 200                                                                                                               | ✅ Pass |
| 2   | Categories & tags | Create skill category                      | 201; row in DB with generated slug                                            | HTTP 201, slug=audit-test-skill-category-zqauditmvy4e2l5                                                               | ✅ Pass |
| 3   | Categories & tags | Create project category                    | 201; row in DB with generated slug                                            | HTTP 201, slug=audit-test-project-category-zqauditmvy4e2l5                                                             | ✅ Pass |
| 4   | Categories & tags | Create resource category                   | 201; row in DB with generated slug                                            | HTTP 201, slug=audit-test-resource-category-zqauditmvy4e2l5                                                            | ✅ Pass |
| 5   | Categories & tags | Create tag                                 | 201; row in DB with generated slug                                            | HTTP 201, slug=audit-test-tag-zqauditmvy4e2l5                                                                          | ✅ Pass |
| 6   | Categories & tags | Create a tag with a duplicate name         | Rejected or given a unique slug (no duplicate slug)                           | HTTP 201 slug audit-test-tag-zqauditmvy4e2l5-2                                                                         | ✅ Pass |
| 7   | Categories & tags | Rename a tag                               | 200; DB name updated                                                          | HTTP 200                                                                                                               | ✅ Pass |
| 8   | Categories & tags | Category with an invalid scope             | 400 validation_failed                                                         | HTTP 400                                                                                                               | ✅ Pass |
| 9   | Media             | Upload a PNG image                         | 201; WebP original + resized variants on disk; DB row                         | HTTP 201, variants 2                                                                                                   | ✅ Pass |
| 10  | Media             | Public image served at /media/<key>        | 200 image/webp                                                                | HTTP 200 image/webp                                                                                                    | ✅ Pass |
| 11  | Media             | Upload a private PDF                       | 201; stored under private/                                                    | HTTP 201                                                                                                               | ✅ Pass |
| 12  | Security          | Private file via public /media URL         | 404                                                                           | HTTP 404                                                                                                               | ✅ Pass |
| 13  | Media             | Owner downloads private file               | 200                                                                           | HTTP 200                                                                                                               | ✅ Pass |
| 14  | Security          | Anonymous download of private file         | 401                                                                           | HTTP 401                                                                                                               | ✅ Pass |
| 15  | Media             | Upload an SVG (not allowed)                | 415 with a clear message                                                      | HTTP 415: Upload a JPEG, PNG, WebP or AVIF image, or a PDF.                                                            | ✅ Pass |
| 16  | Media             | Upload a text file renamed .png            | 415                                                                           | HTTP 415: Upload a JPEG, PNG, WebP or AVIF image, or a PDF.                                                            | ✅ Pass |
| 17  | Media             | Edit alt text                              | 200; DB updated                                                               | HTTP 200                                                                                                               | ✅ Pass |
| 18  | Skills            | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 19  | Skills            | Draft hidden on public page                | /skills does not show it                                                      | hidden                                                                                                                 | ✅ Pass |
| 20  | Skills            | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 21  | Security          | Preview skills signed out                  | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 22  | Skills            | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 23  | Skills            | Published item on public list page         | /skills shows it                                                              | shown                                                                                                                  | ✅ Pass |
| 24  | Skills            | Search finds the published item            | listed in /search results                                                     | found                                                                                                                  | ✅ Pass |
| 25  | Skills            | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 26  | Skills            | Edit reflected publicly                    | new text on public page                                                       | shown (slug audit-test-edited-skill-zqauditmvy4e2l5)                                                                   | ✅ Pass |
| 27  | Skills            | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 28  | Projects          | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 29  | Projects          | Draft hidden on public page                | /projects does not show it                                                    | hidden                                                                                                                 | ✅ Pass |
| 30  | Projects          | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 31  | Security          | Preview projects signed out                | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 32  | Projects          | Publish with a required field missing      | 400 with an understandable message                                            | HTTP 400: Complete the highlighted fields before publishing.                                                           | ✅ Pass |
| 33  | Projects          | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 34  | Projects          | Published item on public list page         | /projects shows it                                                            | shown                                                                                                                  | ✅ Pass |
| 35  | Projects          | Published detail page                      | /projects/audit-test-project-zqauditmvy4e2l5 → 200                            | HTTP 200                                                                                                               | ✅ Pass |
| 36  | Projects          | Search finds the published item            | listed in /search results                                                     | found                                                                                                                  | ✅ Pass |
| 37  | Projects          | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 38  | Projects          | Edit reflected publicly                    | new text on public page                                                       | shown (slug audit-test-edited-project-zqauditmvy4e2l5)                                                                 | ✅ Pass |
| 39  | Projects          | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 40  | Education         | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 41  | Education         | Draft hidden on public page                | /education does not show it                                                   | hidden                                                                                                                 | ✅ Pass |
| 42  | Education         | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 43  | Security          | Preview education signed out               | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 44  | Education         | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 45  | Education         | Published item on public list page         | /education shows it                                                           | shown                                                                                                                  | ✅ Pass |
| 46  | Education         | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 47  | Education         | Edit reflected publicly                    | new text on public page                                                       | shown (slug -)                                                                                                         | ✅ Pass |
| 48  | Education         | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 49  | Experience        | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 50  | Experience        | Draft hidden on public page                | /experience does not show it                                                  | hidden                                                                                                                 | ✅ Pass |
| 51  | Experience        | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 52  | Security          | Preview experience signed out              | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 53  | Experience        | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 54  | Experience        | Published item on public list page         | /experience shows it                                                          | shown                                                                                                                  | ✅ Pass |
| 55  | Experience        | Search finds the published item            | listed in /search results                                                     | found                                                                                                                  | ✅ Pass |
| 56  | Experience        | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 57  | Experience        | Edit reflected publicly                    | new text on public page                                                       | shown (slug -)                                                                                                         | ✅ Pass |
| 58  | Experience        | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 59  | Certifications    | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 60  | Certifications    | Draft hidden on public page                | /achievements does not show it                                                | hidden                                                                                                                 | ✅ Pass |
| 61  | Certifications    | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 62  | Security          | Preview certifications signed out          | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 63  | Certifications    | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 64  | Certifications    | Published item on public list page         | /achievements shows it                                                        | shown                                                                                                                  | ✅ Pass |
| 65  | Certifications    | Search finds the published item            | listed in /search results                                                     | found                                                                                                                  | ✅ Pass |
| 66  | Certifications    | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 67  | Certifications    | Edit reflected publicly                    | new text on public page                                                       | shown (slug -)                                                                                                         | ✅ Pass |
| 68  | Certifications    | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 69  | Achievements      | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 70  | Achievements      | Draft hidden on public page                | /achievements does not show it                                                | hidden                                                                                                                 | ✅ Pass |
| 71  | Achievements      | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 72  | Security          | Preview achievements signed out            | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 73  | Achievements      | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 74  | Achievements      | Published item on public list page         | /achievements shows it                                                        | shown                                                                                                                  | ✅ Pass |
| 75  | Achievements      | Search finds the published item            | listed in /search results                                                     | found                                                                                                                  | ✅ Pass |
| 76  | Achievements      | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 77  | Achievements      | Edit reflected publicly                    | new text on public page                                                       | shown (slug -)                                                                                                         | ✅ Pass |
| 78  | Achievements      | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 79  | Journal           | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 80  | Journal           | Draft hidden on public page                | /journal does not show it                                                     | hidden                                                                                                                 | ✅ Pass |
| 81  | Journal           | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 82  | Security          | Preview journal signed out                 | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 83  | Journal           | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 84  | Journal           | Published item on public list page         | /journal shows it                                                             | shown                                                                                                                  | ✅ Pass |
| 85  | Journal           | Published detail page                      | /journal/audit-test-journal-entry-zqauditmvy4e2l5 → 200                       | HTTP 200                                                                                                               | ✅ Pass |
| 86  | Journal           | Search finds the published item            | listed in /search results                                                     | found                                                                                                                  | ✅ Pass |
| 87  | Journal           | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 88  | Journal           | Edit reflected publicly                    | new text on public page                                                       | shown (slug audit-test-edited-journal-entry-zqauditmvy4e2l5)                                                           | ✅ Pass |
| 89  | Journal           | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 90  | Resources         | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 91  | Resources         | Draft hidden on public page                | /resources does not show it                                                   | hidden                                                                                                                 | ✅ Pass |
| 92  | Resources         | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 93  | Security          | Preview resources signed out               | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 94  | Resources         | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 95  | Resources         | Published item on public list page         | /resources shows it                                                           | shown                                                                                                                  | ✅ Pass |
| 96  | Resources         | Search finds the published item            | listed in /search results                                                     | found                                                                                                                  | ✅ Pass |
| 97  | Resources         | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 98  | Resources         | Edit reflected publicly                    | new text on public page                                                       | shown (slug -)                                                                                                         | ✅ Pass |
| 99  | Resources         | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 100 | Links             | Create → saved as draft                    | 201; DB status=draft                                                          | HTTP 201, DB status=draft                                                                                              | ✅ Pass |
| 101 | Links             | Draft hidden on public page                | /links does not show it                                                       | hidden                                                                                                                 | ✅ Pass |
| 102 | Links             | Preview draft (owner)                      | 200 and shows the draft                                                       | HTTP 200                                                                                                               | ✅ Pass |
| 103 | Security          | Preview links signed out                   | Redirect to login / not shown                                                 | HTTP 307                                                                                                               | ✅ Pass |
| 104 | Links             | Publish                                    | 200; DB status=published, published_at set                                    | HTTP 200, status=published, published_at=set                                                                           | ✅ Pass |
| 105 | Links             | Published item on public list page         | /links shows it                                                               | shown                                                                                                                  | ✅ Pass |
| 106 | Links             | Edit published item                        | 200; DB updated; updated_at advanced                                          | HTTP 200                                                                                                               | ✅ Pass |
| 107 | Links             | Edit reflected publicly                    | new text on public page                                                       | shown (slug -)                                                                                                         | ✅ Pass |
| 108 | Links             | Edit with a stale copy (two tabs)          | 409 conflict                                                                  | HTTP 409                                                                                                               | ✅ Pass |
| 109 | SEO               | Sitemap lists published project            | contains /projects/audit-test-edited-project-zqauditmvy4e2l5                  | listed                                                                                                                 | ✅ Pass |
| 110 | SEO               | Sitemap lists published journal entry      | contains /journal/audit-test-edited-journal-entry-zqauditmvy4e2l5             | listed                                                                                                                 | ✅ Pass |
| 111 | SEO               | RSS contains published journal entry       | title in feed                                                                 | present                                                                                                                | ✅ Pass |
| 112 | Public site       | Home page renders with published content   | 200                                                                           | HTTP 200                                                                                                               | ✅ Pass |
| 113 | Projects          | Mark published project private             | DB visibility=private; hidden from list and detail (404)                      | HTTP 200, list hides, detail 404                                                                                       | ✅ Pass |
| 114 | Security          | Private project excluded from search       | not in results                                                                | hidden                                                                                                                 | ✅ Pass |
| 115 | Security          | Private project excluded from sitemap      | not listed                                                                    | hidden                                                                                                                 | ✅ Pass |
| 116 | Projects          | Feature a project                          | DB is_featured=true; shown on home                                            | HTTP 200, home shows                                                                                                   | ✅ Pass |
| 117 | Media             | Delete an image that a project uses        | 409 with a clear message                                                      | HTTP 409: This file is still used in: projects. Remove it there first.                                                 | ✅ Pass |
| 118 | Media             | Replace image file                         | 200; same id; new file on disk; old files deleted; project page uses new file | HTTP 200, oldGone=true, newThere=true                                                                                  | ✅ Pass |
| 119 | Media             | Replace an image with a PDF                | Rejected (4xx) with a clear message                                           | HTTP 400: Replace an image with another image.                                                                         | ✅ Pass |
| 120 | Skills            | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 121 | Skills            | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 122 | Projects          | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 123 | Projects          | Unpublished detail page                    | 404                                                                           | HTTP 404                                                                                                               | ✅ Pass |
| 124 | Projects          | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 125 | Education         | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 126 | Education         | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 127 | Experience        | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 128 | Experience        | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 129 | Certifications    | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 130 | Certifications    | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 131 | Achievements      | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 132 | Achievements      | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 133 | Journal           | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 134 | Journal           | Unpublished detail page                    | 404                                                                           | HTTP 404                                                                                                               | ✅ Pass |
| 135 | Journal           | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 136 | Resources         | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 137 | Resources         | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 138 | Links             | Unpublish                                  | DB status=draft; hidden publicly                                              | HTTP 200, status=draft, public hidden                                                                                  | ✅ Pass |
| 139 | Links             | Archive                                    | DB status=archived; hidden publicly and from search                           | HTTP 200, status=archived                                                                                              | ✅ Pass |
| 140 | SEO               | Sitemap after unpublish/archive            | no audit project or journal URLs                                              | checked                                                                                                                | ✅ Pass |
| 141 | SEO               | RSS after archive                          | entry removed                                                                 | removed                                                                                                                | ✅ Pass |
| 142 | Admin lists       | Search filter (q)                          | finds the audit project                                                       | HTTP 200, 1 result(s)                                                                                                  | ✅ Pass |
| 143 | Admin lists       | Status filter                              | archived item not in 'published' filter                                       | 0 result(s)                                                                                                            | ✅ Pass |
| 144 | Admin lists       | Pagination                                 | page 2 of categories returns up to 5 different rows                           | HTTP 200, 5 rows, total=30                                                                                             | ✅ Pass |
| 145 | Admin lists       | Invalid status filter                      | handled (ignored or 400), not 500                                             | HTTP 200                                                                                                               | ✅ Pass |
| 146 | Validation        | Create project without a title             | 400 with field error                                                          | HTTP 400: {"title":"Invalid input: expected string, received undefined"}                                               | ✅ Pass |
| 147 | Validation        | Link with a javascript: URL                | 400                                                                           | HTTP 400: {"url":"Enter a full https:// address or mailto:name@example.com."}                                          | ✅ Pass |
| 148 | Validation        | Education end year before start year       | 400                                                                           | HTTP 400: "Some values are out of range (check dates and lengths)."                                                    | ✅ Pass |
| 149 | Validation        | Unknown field in body                      | 400 (unknown fields rejected)                                                 | HTTP 400                                                                                                               | ✅ Pass |
| 150 | Validation        | Skill with a project-scoped category       | 400 (wrong category scope)                                                    | HTTP 400: Some fields are invalid.                                                                                     | ✅ Pass |
| 151 | Contact           | Contact page issues a form token           | token present                                                                 | present                                                                                                                | ✅ Pass |
| 152 | Contact           | Submit the contact form                    | 202; DB row status=new                                                        | HTTP 202 , DB status=new                                                                                               | ✅ Pass |
| 153 | Contact           | Message appears in the admin inbox         | listed on /admin/messages                                                     | listed                                                                                                                 | ✅ Pass |
| 154 | Contact           | Honeypot filled (bot)                      | accepted silently but stored as spam                                          | HTTP 202, DB status=spam                                                                                               | ✅ Pass |
| 155 | Contact           | Invalid submission                         | 400 with field messages                                                       | HTTP 400: {"name":"Enter your name.","email":"Enter a valid email address.","message":"Write at least 10 characters."} | ✅ Pass |
| 156 | Security          | Contact form from another origin           | 403                                                                           | HTTP 403                                                                                                               | ✅ Pass |
| 157 | Contact           | Mark message read                          | DB status=read                                                                | HTTP 204                                                                                                               | ✅ Pass |
| 158 | Security          | Signed-out requests to 18 admin API routes | all 401                                                                       | all 401                                                                                                                | ✅ Pass |
| 159 | Security          | Signed-out visits to 13 admin pages        | redirect to /admin/login                                                      | all redirected                                                                                                         | ✅ Pass |
| 160 | Admin pages       | Owner loads 13 dashboard pages             | all 200                                                                       | all 200                                                                                                                | ✅ Pass |
| 161 | Security          | Signed-in write from another origin (CSRF) | 403                                                                           | HTTP 403                                                                                                               | ✅ Pass |
| 162 | Security          | Signed-in write without Origin header      | 403                                                                           | HTTP 403                                                                                                               | ✅ Pass |
| 163 | Security          | Forged session cookie                      | 401                                                                           | HTTP 401                                                                                                               | ✅ Pass |
| 164 | Security          | Archived project detail page (public)      | 404                                                                           | HTTP 404                                                                                                               | ✅ Pass |
| 165 | Public site       | 16 public routes signed out                | all 200                                                                       | all 200                                                                                                                | ✅ Pass |
| 166 | Skills            | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 167 | Projects          | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 168 | Education         | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 169 | Experience        | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 170 | Certifications    | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 171 | Achievements      | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 172 | Journal           | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 173 | Resources         | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 174 | Links             | Delete                                     | 200/204; row removed from DB                                                  | HTTP 204, row removed                                                                                                  | ✅ Pass |
| 175 | Database          | Join rows removed with their parent        | 0 project_tags / journal_tags left                                            | {"pt":0,"jt":0}                                                                                                        | ✅ Pass |
| 176 | Media             | Delete unused image/webp                   | row and files removed                                                         | HTTP 204, row gone, files gone                                                                                         | ✅ Pass |
| 177 | Media             | Delete unused application/pdf              | row and files removed                                                         | HTTP 204, row gone, files gone                                                                                         | ✅ Pass |
| 178 | Contact           | Delete message                             | row removed                                                                   | HTTP 204                                                                                                               | ✅ Pass |
| 179 | Contact           | Delete message                             | row removed                                                                   | HTTP 204                                                                                                               | ✅ Pass |
| 180 | Cleanup           | No audit records left in any table         | 0 rows containing the audit token                                             | none                                                                                                                   | ✅ Pass |

## 6. Database consistency

Checked after the test records were removed.

| Check                                                                          | Result                                                                                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate category slugs or names per scope                                    | None                                                                                                                                                      |
| Duplicate About-section titles / education entries                             | None                                                                                                                                                      |
| Users                                                                          | 1 user, role `owner`                                                                                                                                      |
| Profile                                                                        | 1 row; 4 interests (the confirmed ones)                                                                                                                   |
| Published rows without `published_at`                                          | None (no published rows exist)                                                                                                                            |
| `updated_at` earlier than `created_at`; future timestamps                      | None                                                                                                                                                      |
| About sections                                                                 | 9, all drafts with empty content (cannot be published until written — by design)                                                                          |
| Education                                                                      | 1 draft: B.Tech., Computer Science and Engineering, Dr. B. R. Ambedkar National Institute of Technology Jalandhar; years and status empty (not confirmed) |
| Categories                                                                     | 27 (14 skill, 13 resource) — matches the seed                                                                                                             |
| Foreign keys                                                                   | 29 defined, all validated; no constraint marked not-valid                                                                                                 |
| Media rows / files under `storage/`                                            | 0 / 0 — no orphaned files                                                                                                                                 |
| Expired sessions stored                                                        | None                                                                                                                                                      |
| Rows containing the audit token (all content tables, media alt text, messages) | 0                                                                                                                                                         |

## 7. Browser tests — all 90 results

`npm run test:e2e` at commit `c1699a2`: **90 passed (1.9 min)**, no failures,
flaky or skipped tests reported. Playwright projects: `setup` (sign-in), `admin`
(dashboard), and `public-desktop`, `public-tablet`, `public-phone` (the public
suite at three screen sizes).

| #   | Project        | File                    | Test                                                                            | Result  |
| --- | -------------- | ----------------------- | ------------------------------------------------------------------------------- | ------- |
| 1   | setup          | global.setup.ts         | prepare database and sign in                                                    | ✅ Pass |
| 2   | admin          | admin.spec.ts           | anonymous visitors cannot open the dashboard                                    | ✅ Pass |
| 3   | admin          | admin.spec.ts           | a wrong password shows a generic error                                          | ✅ Pass |
| 4   | admin          | admin.spec.ts           | profile: editing the introduction updates the home page                         | ✅ Pass |
| 5   | admin          | admin.spec.ts           | project: draft → preview → publish → edit → archive                             | ✅ Pass |
| 6   | admin          | admin.spec.ts           | publishing an incomplete item shows what is missing                             | ✅ Pass |
| 7   | admin          | admin.spec.ts           | journal: today's entry is published and searchable                              | ✅ Pass |
| 8   | admin          | admin.spec.ts           | skills, education and links appear after publishing                             | ✅ Pass |
| 9   | admin          | admin.spec.ts           | media: an uploaded image appears in the library                                 | ✅ Pass |
| 10  | admin          | admin.spec.ts           | contact: a visitor's message reaches the inbox                                  | ✅ Pass |
| 11  | admin          | admin.spec.ts           | contact form shows validation errors                                            | ✅ Pass |
| 12  | admin          | admin.spec.ts           | sign out ends the session                                                       | ✅ Pass |
| 13  | admin          | admin.workflows.spec.ts | every content type can be created and published from the dashboard              | ✅ Pass |
| 14  | admin          | admin.workflows.spec.ts | previewing a draft shows all of its fields                                      | ✅ Pass |
| 15  | admin          | admin.workflows.spec.ts | unpublish, visibility and permanent delete work through the UI                  | ✅ Pass |
| 16  | admin          | admin.workflows.spec.ts | a cover image chosen in the form appears on the public project page             | ✅ Pass |
| 17  | admin          | admin.workflows.spec.ts | private content is not reachable without signing in                             | ✅ Pass |
| 18  | admin          | admin.workflows.spec.ts | a journal entry can carry a PDF attachment                                      | ✅ Pass |
| 19  | admin          | admin.workflows.spec.ts | an email link can be published on the Links page                                | ✅ Pass |
| 20  | admin          | admin.workflows.spec.ts | skill workflow: categorise, publish, update                                     | ✅ Pass |
| 21  | admin          | admin.workflows.spec.ts | journal workflow: draft → publish → read → archive                              | ✅ Pass |
| 22  | admin          | admin.workflows.spec.ts | media: a file can be replaced from the library                                  | ✅ Pass |
| 23  | admin          | admin.workflows.spec.ts | a certification linked to a skill appears on the skills page                    | ✅ Pass |
| 24  | admin          | admin.workflows.spec.ts | dashboard pages pass axe checks in both themes                                  | ✅ Pass |
| 25  | admin          | admin.workflows.spec.ts | the dashboard works on a phone                                                  | ✅ Pass |
| 26  | admin          | admin.workflows.spec.ts | the sign-in page is accessible                                                  | ✅ Pass |
| 27  | admin          | admin.workflows.spec.ts | two-factor authentication: set up, sign in with a code, turn off                | ✅ Pass |
| 28  | public-desktop | public.spec.ts          | / renders, fits the screen and passes axe in both themes                        | ✅ Pass |
| 29  | public-desktop | public.spec.ts          | /about renders, fits the screen and passes axe in both themes                   | ✅ Pass |
| 30  | public-desktop | public.spec.ts          | /education renders, fits the screen and passes axe in both themes               | ✅ Pass |
| 31  | public-desktop | public.spec.ts          | /skills renders, fits the screen and passes axe in both themes                  | ✅ Pass |
| 32  | public-desktop | public.spec.ts          | /projects renders, fits the screen and passes axe in both themes                | ✅ Pass |
| 33  | public-desktop | public.spec.ts          | /projects/uptime-monitor renders, fits the screen and passes axe in both themes | ✅ Pass |
| 34  | public-desktop | public.spec.ts          | /experience renders, fits the screen and passes axe in both themes              | ✅ Pass |
| 35  | public-desktop | public.spec.ts          | /achievements renders, fits the screen and passes axe in both themes            | ✅ Pass |
| 36  | public-desktop | public.spec.ts          | /journal renders, fits the screen and passes axe in both themes                 | ✅ Pass |
| 37  | public-desktop | public.spec.ts          | /resources renders, fits the screen and passes axe in both themes               | ✅ Pass |
| 38  | public-desktop | public.spec.ts          | /links renders, fits the screen and passes axe in both themes                   | ✅ Pass |
| 39  | public-desktop | public.spec.ts          | /contact renders, fits the screen and passes axe in both themes                 | ✅ Pass |
| 40  | public-desktop | public.spec.ts          | /search?q=index renders, fits the screen and passes axe in both themes          | ✅ Pass |
| 41  | public-desktop | public.spec.ts          | drafts and unknown slugs return 404                                             | ✅ Pass |
| 42  | public-desktop | public.spec.ts          | navigation works at this screen size                                            | ✅ Pass |
| 43  | public-desktop | public.spec.ts          | theme toggle persists across reloads                                            | ✅ Pass |
| 44  | public-desktop | public.spec.ts          | filters keep their state in the URL                                             | ✅ Pass |
| 45  | public-desktop | public.spec.ts          | security headers and CSP                                                        | ✅ Pass |
| 46  | public-desktop | public.spec.ts          | SEO endpoints                                                                   | ✅ Pass |
| 47  | public-desktop | public.spec.ts          | page metadata                                                                   | ✅ Pass |
| 48  | public-desktop | public.spec.ts          | API errors use the JSON shape                                                   | ✅ Pass |
| 49  | public-tablet  | public.spec.ts          | / renders, fits the screen and passes axe in both themes                        | ✅ Pass |
| 50  | public-tablet  | public.spec.ts          | /about renders, fits the screen and passes axe in both themes                   | ✅ Pass |
| 51  | public-tablet  | public.spec.ts          | /education renders, fits the screen and passes axe in both themes               | ✅ Pass |
| 52  | public-tablet  | public.spec.ts          | /skills renders, fits the screen and passes axe in both themes                  | ✅ Pass |
| 53  | public-tablet  | public.spec.ts          | /projects renders, fits the screen and passes axe in both themes                | ✅ Pass |
| 54  | public-tablet  | public.spec.ts          | /projects/uptime-monitor renders, fits the screen and passes axe in both themes | ✅ Pass |
| 55  | public-tablet  | public.spec.ts          | /experience renders, fits the screen and passes axe in both themes              | ✅ Pass |
| 56  | public-tablet  | public.spec.ts          | /achievements renders, fits the screen and passes axe in both themes            | ✅ Pass |
| 57  | public-tablet  | public.spec.ts          | /journal renders, fits the screen and passes axe in both themes                 | ✅ Pass |
| 58  | public-tablet  | public.spec.ts          | /resources renders, fits the screen and passes axe in both themes               | ✅ Pass |
| 59  | public-tablet  | public.spec.ts          | /links renders, fits the screen and passes axe in both themes                   | ✅ Pass |
| 60  | public-tablet  | public.spec.ts          | /contact renders, fits the screen and passes axe in both themes                 | ✅ Pass |
| 61  | public-tablet  | public.spec.ts          | /search?q=index renders, fits the screen and passes axe in both themes          | ✅ Pass |
| 62  | public-tablet  | public.spec.ts          | drafts and unknown slugs return 404                                             | ✅ Pass |
| 63  | public-tablet  | public.spec.ts          | navigation works at this screen size                                            | ✅ Pass |
| 64  | public-tablet  | public.spec.ts          | theme toggle persists across reloads                                            | ✅ Pass |
| 65  | public-tablet  | public.spec.ts          | filters keep their state in the URL                                             | ✅ Pass |
| 66  | public-tablet  | public.spec.ts          | security headers and CSP                                                        | ✅ Pass |
| 67  | public-tablet  | public.spec.ts          | SEO endpoints                                                                   | ✅ Pass |
| 68  | public-tablet  | public.spec.ts          | page metadata                                                                   | ✅ Pass |
| 69  | public-tablet  | public.spec.ts          | API errors use the JSON shape                                                   | ✅ Pass |
| 70  | public-phone   | public.spec.ts          | / renders, fits the screen and passes axe in both themes                        | ✅ Pass |
| 71  | public-phone   | public.spec.ts          | /about renders, fits the screen and passes axe in both themes                   | ✅ Pass |
| 72  | public-phone   | public.spec.ts          | /education renders, fits the screen and passes axe in both themes               | ✅ Pass |
| 73  | public-phone   | public.spec.ts          | /skills renders, fits the screen and passes axe in both themes                  | ✅ Pass |
| 74  | public-phone   | public.spec.ts          | /projects renders, fits the screen and passes axe in both themes                | ✅ Pass |
| 75  | public-phone   | public.spec.ts          | /projects/uptime-monitor renders, fits the screen and passes axe in both themes | ✅ Pass |
| 76  | public-phone   | public.spec.ts          | /experience renders, fits the screen and passes axe in both themes              | ✅ Pass |
| 77  | public-phone   | public.spec.ts          | /achievements renders, fits the screen and passes axe in both themes            | ✅ Pass |
| 78  | public-phone   | public.spec.ts          | /journal renders, fits the screen and passes axe in both themes                 | ✅ Pass |
| 79  | public-phone   | public.spec.ts          | /resources renders, fits the screen and passes axe in both themes               | ✅ Pass |
| 80  | public-phone   | public.spec.ts          | /links renders, fits the screen and passes axe in both themes                   | ✅ Pass |
| 81  | public-phone   | public.spec.ts          | /contact renders, fits the screen and passes axe in both themes                 | ✅ Pass |
| 82  | public-phone   | public.spec.ts          | /search?q=index renders, fits the screen and passes axe in both themes          | ✅ Pass |
| 83  | public-phone   | public.spec.ts          | drafts and unknown slugs return 404                                             | ✅ Pass |
| 84  | public-phone   | public.spec.ts          | navigation works at this screen size                                            | ✅ Pass |
| 85  | public-phone   | public.spec.ts          | theme toggle persists across reloads                                            | ✅ Pass |
| 86  | public-phone   | public.spec.ts          | filters keep their state in the URL                                             | ✅ Pass |
| 87  | public-phone   | public.spec.ts          | security headers and CSP                                                        | ✅ Pass |
| 88  | public-phone   | public.spec.ts          | SEO endpoints                                                                   | ✅ Pass |
| 89  | public-phone   | public.spec.ts          | page metadata                                                                   | ✅ Pass |
| 90  | public-phone   | public.spec.ts          | API errors use the JSON shape                                                   | ✅ Pass |

## 8. What changed in the local database

The database is **not** identical to its state before the audit. All test
content was removed, but these records remain or changed:

- **Activity log (`audit_log`): 151 entries at the end of the audit**, from
  the owner-account creation, sign-ins and the test operations (create,
  publish, update, archive, delete, upload, replace, message status). They hold
  actions, record ids and field names only — no test titles or personal data.
  They were deliberately not deleted (the log is a history) and are removed
  automatically after 365 days. Later sign-in troubleshooting added 5 more
  entries (2 successful sign-ins, 3 failed attempts), giving 156.
- **Rate-limit counters were reset during testing.** Between the two runs the
  temporary search, contact and upload counters (5 rows) were deleted so the
  second run was not throttled by the first. New counters from the second run
  and later sign-in attempts exist; they expire on their own.
- **Sessions:** the sign-ins created 7 owner sessions, which stay valid until
  they expire (7 days, sliding) or are revoked with "Sign out all other
  sessions".
- **Owner account:** `last_login_at` was updated by the sign-ins.
- **Storage:** the empty folders `storage/public` and `storage/private` now
  exist; they contain no files.

Before the audit, during local setup, migrations and the standard seed were
applied to the then-empty database and the development owner account was
created from `.env` (see README "Run it locally").

## 9. Test-script mistakes and corrections

The first run reported **39 failures; all were mistakes in the test script,
not application bugs**:

| Mistake                                                                                                                      | Effect                                                                                                                                                                                                    | Correction                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Edits sent only the changed field. The API expects the complete form (as the dashboard sends), so every edit returned `400`. | Edit, stale-edit and "edit shown publicly" failed for all nine types; the project could not be completed and published, so its list, detail, search, sitemap, featured and replace-file checks failed too | Edits send the full set of form fields; docs/API_DESIGN.md now documents this |
| A spam (honeypot) test message was shorter than the 10-character minimum                                                     | Correct `400` reported as a failure                                                                                                                                                                       | Longer test message                                                           |
| "Mark message read" expected `200`; the API returns `204` (success, no body)                                                 | False failure                                                                                                                                                                                             | Accept `204`                                                                  |
| Join-table check used column `journal_id`; the column is `entry_id`                                                          | Query error                                                                                                                                                                                               | Correct column                                                                |

The run-1 RSS failure was a consequence of the first mistake (the edited title
was never saved). Run 1 also created and then deleted its own test records.

## 10. Known limitations and untested scenarios

- **Development server, not production**, for the 180 checks. The browser
  suite used the production build, but on its own database. The production
  Docker stack (Caddy, HTTPS, `__Host-` cookie, migrations container, backups)
  is tested separately in CI, not in this audit.
- **Not tested here:** S3 object storage (tested in CI), email notifications
  (no SMTP provider configured locally; tested in CI against a local SMTP
  server), two-factor sign-in on the local owner account (covered by the
  browser suite and integration tests), password change through the dashboard,
  profile / settings / SEO edits through the API (the browser suite covers
  profile editing), reordering, About-section publishing, bulk data or large
  files, concurrent users, rate-limit thresholds beyond the cases above.
- **No real hosting:** nothing was tested on a server, a real domain, real
  HTTPS certificates, real network latency or with real visitors.
- **One local machine and one browser engine** (Chromium); Firefox and Safari
  were not tested.
- The audit checks behaviour, not visual design.
