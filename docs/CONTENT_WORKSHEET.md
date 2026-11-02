# Personal website content worksheet

Fill this in at your own pace, then copy each answer into the dashboard
(`http://localhost:3000/admin`). Nothing here is published, and nothing in this
file changes the website by itself.

> **Prepared:** 2026-11-02 from the dashboard's real field definitions
> (`src/lib/content/collections.ts`, `src/lib/content/singletons.ts`) and
> `docs/CONTENT_GUIDE.md`. Latest code commit: `f448b63`.

---

## How to use this worksheet

1. **Write your answer on the `✍️` lines.** Delete anything you don't need.
   Leave a line empty if you don't know the answer — empty fields are simply not
   shown on the website. **Never guess.**
2. **The examples are fictional.** Every example belongs to an invented person,
   "Asha Verma", at invented organisations. They only show the _style and
   length_ of a good answer. Do not copy them.
3. **Check the 🔎 boxes** before you publish — they list what to verify
   (spelling, dates, links, permission to show images).
4. **Copy into the dashboard, save as a draft, press Preview, then Publish.**

### What the labels mean

| Label                      | Meaning                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- |
| 🔴 **Required to save**    | The dashboard will not save the item without it.                                   |
| 🟠 **Required to publish** | You can save a draft without it, but **Publish** is refused until it is filled in. |
| 🟢 **Recommended**         | Optional, but it makes the page much better.                                       |
| ⚪ **Optional**            | Fill in only if it applies to you.                                                 |
| 🔢 **Max N**               | The longest answer the field accepts (characters).                                 |

### Facts you have already confirmed (and only these)

| Fact                                                                                                                        | Status                                                          |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Degree: **B.Tech.**                                                                                                         | ✅ Confirmed — already in the dashboard (Education, draft)      |
| Branch: **Computer Science and Engineering**                                                                                | ✅ Confirmed — already in the dashboard                         |
| Institution: **Dr. B. R. Ambedkar National Institute of Technology Jalandhar**                                              | ✅ Confirmed — already in the dashboard                         |
| Interests: **Software engineering · Artificial intelligence and machine learning · Backend development · Computer science** | ✅ Confirmed — already in Profile                               |
| Admin sign-in email                                                                                                         | 🔒 Private — used only to sign in; **not** shown on the website |
| **Everything else** (name to display, year of study, dates, grades, skills, projects, experience, certificates, links)      | ❓ **Needs your input**                                         |

### Writing tips

- Write in the first person ("I built…"), plainly and specifically.
- Long text fields accept **Markdown**: `**bold**`, `_italic_`, `- list item`,
  `[link text](https://…)` and `` `code` ``.
- Prefer facts you can show (a link, a repository, a certificate) over
  adjectives ("passionate", "expert").
- Images: JPEG, PNG, WebP or AVIF up to 10 MB; PDFs up to 15 MB. SVG is not
  accepted. **Every image needs alt text** (a short description of what it
  shows) — publishing is refused without it.

---

## 1. Personal profile and introduction

**Where:** Dashboard → **Profile**. These fields appear on the home page and
the About page **as soon as you save** (there is no draft for the profile), so
fill in only what you are sure of.

| Field                  | Rule                                                                    | Your answer                                 |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| Display name           | 🟢 Recommended · 🔢 80 · shown in the header, home page and page titles | ✍️                                          |
| Professional headline  | 🟢 Recommended · 🔢 140 · one line                                      | ✍️                                          |
| Short biography        | 🟢 Recommended · 🔢 400 · 2–4 sentences                                 | ✍️                                          |
| Profile photo          | ⚪ Optional · image + alt text                                          | ✍️ file name: ________ · alt text: ________ |
| Current learning focus | ⚪ Optional · 🔢 300                                                    | ✍️                                          |
| Interests              | ✅ Already filled with your four confirmed interests · one per line     | ✍️ keep as is / changes:                    |
| Location               | ⚪ Optional · 🔢 80 · leave empty to keep it private                    | ✍️                                          |
| Availability           | ⚪ Optional · 🔢 140 · only if true right now                           | ✍️                                          |

**Example (fictional — Asha Verma, not you):**

> - **Display name:** Asha Verma
> - **Headline:** Computer science student building backend systems and learning machine learning
> - **Short biography:** I'm a computer science undergraduate who enjoys
>   turning ideas into working software. I spend most of my time on backend
>   development — APIs, databases and the testing around them — and I'm
>   learning how machine-learning models are built and deployed.
> - **Current learning focus:** Database indexing and query planning in PostgreSQL.
> - **Location:** Pune, India
> - **Availability:** Open to software engineering internships for summer 2027

🔎 **Verify before saving**

- [ ] The display name is spelled exactly as you want it to appear everywhere.
- [ ] The headline makes no claim you can't support (no "expert", no job titles you don't hold).
- [ ] You have the right to use the photo, and it is a photo you are happy to make public.
- [ ] Location is only as precise as you're comfortable with (a city, or nothing).
- [ ] Availability is true today — remember to update or remove it later.

---

## 2. About me

**Where:** Dashboard → **About sections**. Nine **empty draft** sections
already exist with these titles. Write the ones you want, delete the rest.
A section can't be published while its content is empty.

| Section (already created) | Rule                             | Write it?      | Your text (Markdown allowed) |
| ------------------------- | -------------------------------- | -------------- | ---------------------------- |
| Introduction              | 🔴 title · 🟠 content to publish | ☐ yes ☐ delete | ✍️                           |
| Background                | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |
| Academic journey          | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |
| Technical interests       | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |
| Professional interests    | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |
| Goals                     | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |
| Learning philosophy       | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |
| Career aspirations        | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |
| Areas of exploration      | 🟠 content to publish            | ☐ yes ☐ delete | ✍️                           |

Section title is 🔴 required (🔢 120) and can be renamed. Three or four well-written sections are
better than nine thin ones.

**Example (fictional — "Learning philosophy" for Asha Verma):**

> I learn best by building something small, breaking it, and reading the
> documentation until I understand why it broke. Each week I pick one concept —
> last month it was database transactions — and write a short journal entry
> about what I tried and what surprised me.

🔎 **Verify before publishing**

- [ ] Every statement is true and something you'd be comfortable discussing in an interview.
- [ ] No grades, ranks or achievements are mentioned unless they also appear (verified) in sections 3 or 7.
- [ ] Empty sections you don't want are deleted, not left as drafts forever (optional).

---

## 3. Education and academic background

**Where:** Dashboard → **Education**. One **draft** entry already exists with
your confirmed degree, branch and institution. Complete it, then publish it.

| Field                   | Rule                                     | Current value                                                    | Your answer                 |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------- | --------------------------- |
| Institution             | 🔴 Required · 🔢 200                     | ✅ Dr. B. R. Ambedkar National Institute of Technology Jalandhar | ✍️ keep / correct spelling: |
| Institution website     | ⚪ Optional · full `https://` address    | —                                                                | ✍️                          |
| Degree                  | 🔴 Required · 🔢 120                     | ✅ B.Tech.                                                       | ✍️ keep / change:           |
| Branch / major          | 🟢 Recommended · 🔢 160                  | ✅ Computer Science and Engineering                              | ✍️ keep / change:           |
| Start year              | 🟢 Recommended · year 1950–2100          | ❓ **needs your input**                                          | ✍️                          |
| End year (or expected)  | 🟢 Recommended · year 1950–2100          | ❓ **needs your input**                                          | ✍️                          |
| Current academic status | ⚪ Optional · 🔢 120 · e.g. "Third year" | ❓ **needs your input**                                          | ✍️                          |
| Current semester        | ⚪ Optional · 1–12                       | ❓ **needs your input**                                          | ✍️                          |
| Relevant coursework     | 🟢 Recommended · one course per line     | ❓ **needs your input**                                          | ✍️                          |
| Description             | ⚪ Optional · Markdown                   | ❓                                                               | ✍️                          |

> **About grades and CGPA:** the dashboard has **no grade field**. If you choose
> to mention a CGPA or rank, put it in _Description_, copied exactly from your
> official grade card or transcript — never rounded up or estimated. Leaving
> grades out entirely is perfectly normal.

**Other education entries** (school, intermediate/12th, other courses) are
optional. Add one block per entry only if you want them on the site:

| Field                     | Entry 2 | Entry 3 |
| ------------------------- | ------- | ------- |
| Institution 🔴            | ✍️      | ✍️      |
| Degree / qualification 🔴 | ✍️      | ✍️      |
| Start year – end year     | ✍️      | ✍️      |
| Description ⚪            | ✍️      | ✍️      |

**Example (fictional — Asha Verma):**

> - **Start year:** 2024 · **End year (expected):** 2028
> - **Current academic status:** Second year · **Current semester:** 4
> - **Relevant coursework:** Data Structures and Algorithms · Database Management
>   Systems · Operating Systems · Computer Networks · Object-Oriented Programming

🔎 **Verify before publishing**

- [ ] Institution name matches the official spelling exactly.
- [ ] Start and end years match your admission letter / institute records.
- [ ] Coursework lists only courses you have taken or are taking now.
- [ ] Any grade or rank (if mentioned) matches an official document word for word.
- [ ] "Current academic status" and "Current semester" — set a reminder to update them each semester.

---

## 4. Technical skills and skill categories

**Where:** Dashboard → **Skills** (and **Categories** for the groups).

**Skill categories already created** (rename, reorder or delete any):
Programming Languages · Data Structures and Algorithms · Computer Science
Fundamentals · Artificial Intelligence · Machine Learning · Generative AI ·
Backend Development · Frontend Development · Databases · Cloud and DevOps ·
Developer Tools · Communication · Problem Solving · Other Skills.

**Categories and tags** (Dashboard → Library → Categories / Tags) are live as
soon as you create them — they have no draft step.

| Item     | Field       | Rule                                                      |
| -------- | ----------- | --------------------------------------------------------- |
| Category | Used for    | 🔴 Required · skill / project / resource                  |
| Category | Name        | 🔴 Required · 🔢 80                                       |
| Category | Description | ⚪ Optional · 🔢 300                                      |
| Tag      | Name        | 🔴 Required · 🔢 60 · short keyword, e.g. "web" or "APIs" |

| Field            | Rule                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Skill            | 🔴 Required · 🔢 80                                                                        |
| Category         | 🟢 Recommended · one of the categories above                                               |
| Learning status  | 🔴 Required · **planned** / **learning** / **practicing** / **comfortable**                |
| Experience level | ⚪ Optional · beginner / intermediate / advanced — **leave empty unless you're confident** |
| Last reviewed    | ⚪ Optional · date · shown publicly as "Updated"                                           |
| Description      | 🟢 Recommended · what you've actually done with it                                         |

**Your skills** (copy a row per skill):

| #   | Skill 🔴 | Category | Learning status 🔴 | Level ⚪ | What I've done with it (evidence) |
| --- | -------- | -------- | ------------------ | -------- | --------------------------------- |
| 1   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |
| 2   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |
| 3   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |
| 4   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |
| 5   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |
| 6   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |
| 7   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |
| 8   | ✍️       | ✍️       | ✍️                 | ✍️       | ✍️                                |

Which 3–6 skills should be **featured** on the home page? ✍️

**Example (fictional — Asha Verma):**

| Skill      | Category              | Learning status | Level          | Evidence                                                    |
| ---------- | --------------------- | --------------- | -------------- | ----------------------------------------------------------- |
| Python     | Programming Languages | comfortable     | intermediate   | Used in two course projects and a personal CLI tool         |
| PostgreSQL | Databases             | practicing      | _(left empty)_ | Designed the schema for a library-management course project |
| Docker     | Cloud and DevOps      | learning        | _(left empty)_ | Containerised one project following the official tutorial   |

🔎 **Verify before publishing**

- [ ] Every skill is something you could answer interview questions about.
- [ ] Learning status is honest — "learning" is a perfectly good status.
- [ ] Experience level is left empty where you're unsure.
- [ ] Each featured skill links to at least one project, journal entry or certificate as evidence (Technologies field on those items).

---

## 5. Projects and project descriptions

**Where:** Dashboard → **Projects**. Each project gets its own page at
`/projects/<slug>`.

| Field                                                         | Rule                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title                                                         | 🔴 Required · 🔢 120                                                                                                                              |
| Slug                                                          | ⚪ Optional · generated from the title · the page address                                                                                         |
| Short description                                             | 🟠 **Required to publish** · 🔢 280 · one or two sentences                                                                                        |
| Category                                                      | ⚪ Optional · **project categories don't exist yet** — create them first under Library → Categories, with **Used for: project**, if you want them |
| Development status                                            | 🔴 Required · planned / in progress / completed / maintained / paused / archived                                                                  |
| Start date · Completion date                                  | 🟢 Recommended · dates                                                                                                                            |
| Repository URL                                                | 🟢 Recommended · only if public                                                                                                                   |
| Live demo URL                                                 | ⚪ Optional · **only if it works right now**                                                                                                      |
| Cover image                                                   | 🟢 Recommended · image + alt text                                                                                                                 |
| Screenshots                                                   | ⚪ Optional · images + alt text                                                                                                                   |
| Technologies                                                  | 🟢 Recommended · picked from your Skills (add skills first)                                                                                       |
| Tags                                                          | ⚪ Optional                                                                                                                                       |
| Problem statement · Solution · My contribution · Architecture | 🟢 Recommended · Markdown                                                                                                                         |
| Key features                                                  | 🟢 Recommended · one per line                                                                                                                     |
| SEO title · SEO description                                   | ⚪ Optional · 🔢 70 · 🔢 160 · defaults to title / short description                                                                              |

**Project worksheet** (copy this block per project):

```text
PROJECT ___
Title 🔴 ............................. ✍️
Short description 🟠 (≤ 280) ......... ✍️
Development status 🔴 ................ ✍️ planned / in progress / completed / maintained / paused / archived
Start date / Completion date ......... ✍️ ____-__-__ / ____-__-__
Repository URL ....................... ✍️ https://
Live demo URL (only if working) ...... ✍️ https://
Team or solo? ........................ ✍️  (if team: what was YOUR part?)
Technologies (must exist in Skills) .. ✍️
Problem — what needed solving? ....... ✍️
Solution — what you built ............ ✍️
My contribution ...................... ✍️
Architecture (optional) .............. ✍️
Key features (one per line) .......... ✍️
Cover image file + alt text .......... ✍️
Featured on home page? ............... ☐ yes ☐ no
```

> **No invented numbers.** Do not write user counts, accuracy percentages,
> performance gains or "N downloads" unless you measured them and can show how.
> "Works for the 50 sample books in my test data" is honest; "serves thousands
> of users" without proof is not.

**Example (fictional — Asha Verma):**

> - **Title:** Campus Library Tracker
> - **Short description:** A web app that lets students search the department
>   library catalogue and reserve books, built for a database course.
> - **Status:** completed · **Dates:** 2025-08-01 → 2025-11-15
> - **Team:** three students — I designed the database schema and wrote the search API.
> - **Technologies:** Python, PostgreSQL, Flask
> - **Problem:** The department kept its catalogue in a spreadsheet, so students
>   couldn't tell whether a book was available.
> - **Key features:** Full-text search by title and author · Reservation queue ·
>   Admin page for returns

🔎 **Verify before publishing**

- [ ] Repository and demo links open and show the right project (try in a private window).
- [ ] The repository contains no passwords, API keys or personal data of others.
- [ ] For team projects, "My contribution" describes only your own work, and teammates wouldn't object.
- [ ] Course projects are allowed to be shared publicly (check with the course rules if unsure).
- [ ] Screenshots show no real personal data (names, emails, phone numbers) of other people.
- [ ] Every number in the text can be backed up.

---

## 6. Internship and work experience

**Where:** Dashboard → **Experience**. Types available: internship, job,
freelance, open source, volunteer, team, responsibility (e.g. a club role).

| Field                   | Rule                                             |
| ----------------------- | ------------------------------------------------ |
| Type                    | 🔴 Required                                      |
| Role                    | 🔴 Required · 🔢 120 · your actual title         |
| Organization            | 🔴 Required · 🔢 160                             |
| Organization website    | ⚪ Optional                                      |
| Location                | ⚪ Optional · 🔢 120 · e.g. "Remote"             |
| Start date · End date   | 🟢 Recommended · leave end date empty if ongoing |
| Description             | 🟢 Recommended · Markdown                        |
| Responsibilities        | 🟢 Recommended · one per line                    |
| Technologies and skills | ⚪ Optional · picked from Skills                 |
| Related links           | ⚪ Optional · label + URL pairs                  |

**Experience worksheet** (copy per entry — **leave this section empty if you
have no experience to list yet; that's normal for a student**):

```text
EXPERIENCE ___
Type 🔴 ........................ ✍️ internship / job / freelance / open_source / volunteer / team / responsibility
Role 🔴 ........................ ✍️ (exactly as on your offer letter / certificate)
Organization 🔴 ................ ✍️
Location ....................... ✍️
Start date / End date .......... ✍️ ____-__-__ / ____-__-__ (empty = ongoing)
What you did (responsibilities)  ✍️
Technologies used .............. ✍️
Proof you hold (letter, certificate, link) ✍️
Confidentiality limits? ........ ✍️ (anything you must NOT mention publicly)
```

**Example (fictional — Asha Verma):**

> - **Type:** responsibility · **Role:** Web coordinator ·
>   **Organization:** Example Institute Coding Club · **Dates:** 2025-07 → ongoing
> - **Responsibilities:** Maintain the club website · Organise two workshops per
>   semester on Git and web basics

🔎 **Verify before publishing**

- [ ] Role and dates match your offer letter, experience letter or certificate.
- [ ] Nothing confidential about the employer (internal tools, clients, code, figures) is revealed.
- [ ] The organisation's name is spelled exactly right.

---

## 7. Certifications and achievements

**Where:** Dashboard → **Certifications** and **Achievements** (both shown on
the Achievements page).

### 7a. Certifications and courses

| Field                    | Rule                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Type                     | 🔴 Required · certification / course                                                                                                          |
| Title                    | 🔴 Required · 🔢 200 · exactly as on the certificate                                                                                          |
| Issuing organization     | 🔴 Required · 🔢 160                                                                                                                          |
| Issuer website           | ⚪ Optional · full `https://` address                                                                                                         |
| Issue date · Expiry date | 🟢 Recommended · expiry only if it has one                                                                                                    |
| Credential ID            | ⚪ Optional · 🔢 120                                                                                                                          |
| Verification link        | 🟢 **Strongly recommended** — lets visitors confirm it                                                                                        |
| Certificate file         | ⚪ Optional · image or PDF · mark **private** if it shows personal details; a private file **requires** a verification link before publishing |
| Related skills           | ⚪ Optional                                                                                                                                   |
| Description              | ⚪ Optional                                                                                                                                   |

| #   | Title 🔴 | Issuer 🔴 | Type 🔴 | Issued | Credential ID | Verification link | File? |
| --- | -------- | --------- | ------- | ------ | ------------- | ----------------- | ----- |
| 1   | ✍️       | ✍️        | ✍️      | ✍️     | ✍️            | ✍️                | ✍️    |
| 2   | ✍️       | ✍️        | ✍️      | ✍️     | ✍️            | ✍️                | ✍️    |
| 3   | ✍️       | ✍️        | ✍️      | ✍️     | ✍️            | ✍️                | ✍️    |

### 7b. Achievements

Types: award, competition, hackathon, academic, technical, milestone,
publication, recognition.

| Field                | Rule                                                  |
| -------------------- | ----------------------------------------------------- |
| Type                 | 🔴 Required                                           |
| Title                | 🔴 Required · 🔢 200                                  |
| Organization / event | 🟢 Recommended · 🔢 160                               |
| Date                 | 🟢 Recommended                                        |
| Link                 | 🟢 Recommended · results page, news item, certificate |
| Image or document    | ⚪ Optional                                           |
| Description          | ⚪ Optional · what you did, and the result            |

| #   | Title 🔴 | Type 🔴 | Organization / event | Date | Proof link | Exact result (rank / prize) |
| --- | -------- | ------- | -------------------- | ---- | ---------- | --------------------------- |
| 1   | ✍️       | ✍️      | ✍️                   | ✍️   | ✍️         | ✍️                          |
| 2   | ✍️       | ✍️      | ✍️                   | ✍️   | ✍️         | ✍️                          |

**Example (fictional — Asha Verma):**

> - **Certification:** "Introduction to SQL" · course · Example Online Academy ·
>   issued 2025-03-10 · verification link to the academy's certificate page.
> - **Achievement:** "Finalist, Example Institute 24-hour Hackathon" · hackathon ·
>   2025-09-20 · link to the published results.

🔎 **Verify before publishing**

- [ ] Titles, issuers and dates are copied exactly from the certificate.
- [ ] Every verification link works and shows **your** name.
- [ ] Results are stated precisely ("finalist", "2nd place of 40 teams") — only what the organiser published.
- [ ] Certificate images showing your address, phone, ID numbers or date of birth are uploaded as **private** (or cropped).
- [ ] Expired certifications are marked with their expiry date, or not listed.

---

## 8. Learning journal and technical articles

**Where:** Dashboard → **Journal** (the "New journal entry" button at the
top). Each entry gets its own page and appears in search and the RSS feed.

| Field                                                                | Rule                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Date                                                                 | 🔴 Required                                                                     |
| Title                                                                | 🔴 Required · 🔢 160                                                            |
| Topic                                                                | ⚪ Optional · 🔢 80                                                             |
| Short summary                                                        | 🟢 Recommended · 🔢 300                                                         |
| What I learned · What I worked on · What I built · Problems I solved | 🟠 **At least one** of these (or the summary) is required to publish · Markdown |
| Technologies · Tags                                                  | ⚪ Optional                                                                     |
| Resources and GitHub links                                           | ⚪ Optional · label + URL pairs                                                 |
| Images and attachments                                               | ⚪ Optional · images shown in the entry, PDFs listed as attachments             |

**Journal entry template** (copy per entry):

```text
DATE 🔴 ............ ✍️ ____-__-__
TITLE 🔴 ........... ✍️
TOPIC .............. ✍️
SUMMARY (≤ 300) .... ✍️
WHAT I LEARNED ..... ✍️
WHAT I WORKED ON ... ✍️
WHAT I BUILT ....... ✍️
PROBLEMS I SOLVED .. ✍️
LINKS .............. ✍️
```

Ideas for your first entries (choose only what's true for you):
☐ Something you learned this week · ☐ A bug you fixed and how ·
☐ Notes from a course chapter · ☐ Building this website · ☐ ________

**Example (fictional — Asha Verma):**

> - **Date:** 2025-10-04 · **Title:** Why my query ignored the index
> - **What I learned:** A function on an indexed column (`lower(email)`) stops
>   PostgreSQL from using a plain index; an expression index fixes it.
> - **Problems I solved:** Search went from a full table scan to an index scan
>   on my 10,000-row test table (measured with `EXPLAIN ANALYZE`).

🔎 **Verify before publishing**

- [ ] Code snippets contain no passwords, keys, tokens or private URLs.
- [ ] Anything copied from elsewhere is quoted briefly and credited with a link.
- [ ] Every measurement mentions how it was measured.

---

## 9. Resources and useful links

**Where:** Dashboard → **Resources**. Books, courses, documentation and tools
you recommend.

**Resource categories already created:** Programming · DSA · Computer
Science · AI and ML · Generative AI · Backend Development · Web Development ·
GATE Preparation · Books · Documentation · Courses · Tools · Useful Websites.

| Field             | Rule                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Title             | 🔴 Required · 🔢 200                                                                     |
| URL               | ⚪ Optional (not needed for personal notes)                                              |
| Type              | 🔴 Required · website / documentation / course / book / tutorial / tool / article / note |
| Category          | 🟢 Recommended                                                                           |
| Description       | 🟢 Recommended · 🔢 500 · why you recommend it                                           |
| Personal notes    | ⚪ Optional · Markdown                                                                   |
| Tags · Date added | ⚪ Optional                                                                              |

| #   | Title 🔴 | Type 🔴 | Category | URL | Why I recommend it |
| --- | -------- | ------- | -------- | --- | ------------------ |
| 1   | ✍️       | ✍️      | ✍️       | ✍️  | ✍️                 |
| 2   | ✍️       | ✍️      | ✍️       | ✍️  | ✍️                 |
| 3   | ✍️       | ✍️      | ✍️       | ✍️  | ✍️                 |
| 4   | ✍️       | ✍️      | ✍️       | ✍️  | ✍️                 |
| 5   | ✍️       | ✍️      | ✍️       | ✍️  | ✍️                 |

**Example (fictional):** "PostgreSQL documentation — Indexes chapter" ·
documentation · Databases · `https://www.postgresql.org/docs/current/indexes.html`
· "Clear explanations with examples; I read it while optimising a project."

🔎 **Verify before publishing**

- [ ] Every link opens (no paywall surprises, no broken pages).
- [ ] You have actually used each resource.

---

## 10. Contact information and site settings

### 10a. Links (social and professional profiles)

**Where:** Dashboard → **Links**. Shown on the Links page; featured links also
appear on the home page and footer.

| Field                    | Rule                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Label                    | 🔴 Required · 🔢 80 · e.g. "GitHub"                                                           |
| URL                      | 🔴 Required · full `https://…` or `mailto:you@example.com`                                    |
| Category                 | 🔴 Required · profile / coding / social / writing / repository / email / other                |
| Icon                     | 🔴 Required · github / linkedin / mail / x / youtube / instagram / code / book / globe / link |
| Description              | ⚪ Optional · 🔢 200                                                                          |
| Identity link (rel="me") | ⚪ Tick only for profiles that are **yours**                                                  |

| Profile                                       | Your URL                                                                                                                                               | Show it? | Featured? |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------- |
| GitHub                                        | ✍️ ❓ _The website's repository is under the GitHub account `Ramssmb` — confirm whether `https://github.com/Ramssmb` is the profile you want to show._ | ☐        | ☐         |
| LinkedIn                                      | ✍️                                                                                                                                                     | ☐        | ☐         |
| LeetCode / Codeforces / CodeChef / HackerRank | ✍️                                                                                                                                                     | ☐        | ☐         |
| Email (as a `mailto:` link)                   | ✍️                                                                                                                                                     | ☐        | ☐         |
| Other (blog, Kaggle, X, YouTube…)             | ✍️                                                                                                                                                     | ☐        | ☐         |

### 10b. Contact page and site settings

**Where:** Dashboard → **Settings & SEO**.

| Setting                                  | Rule                                                                                        | Your answer |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | ----------- |
| Site name                                | ⚪ Optional · 🔢 80 · defaults to your display name                                         | ✍️          |
| Page title template                      | 🔴 Required · 🔢 120 · `%s` becomes the page title, e.g. `%s · Your Name`                   | ✍️          |
| Default description                      | 🟢 Recommended · 🔢 300 · shown in Google results and link previews                         | ✍️          |
| Default theme                            | 🔴 Required · system / light / dark                                                         | ✍️          |
| Social sharing image                     | 🟢 Recommended · 1200 × 630 image + alt text                                                | ✍️          |
| Public email address                     | ⚪ Optional · **shown publicly and will receive spam**; the contact form works without it   | ✍️          |
| Accept messages through the contact form | ⚪ on / off                                                                                 | ☐ on ☐ off  |
| Home page sections to show               | ⚪ education / featured projects / featured skills / recent journal / featured achievements | ☐ ☐ ☐ ☐ ☐   |

> **Your admin sign-in email is private.** It is not shown anywhere on the
> website. If you want a public email, consider a separate address for the site.

**Example (fictional — Asha Verma):**

> - **Page title template:** `%s · Asha Verma`
> - **Default description:** Asha Verma — computer science student. Projects,
>   skills and a learning journal on backend development and machine learning.
> - **Public email:** _(left empty — uses the contact form)_

🔎 **Verify before publishing**

- [ ] Every profile link opens your own profile, logged out.
- [ ] Profiles you link to are presentable (photo, bio, no old content you'd rather hide).
- [ ] You're comfortable with any public email receiving spam.
- [ ] Send yourself a test message through the contact form and see it under **Messages**.

---

## Final checklist before going live

- [ ] Profile: display name, headline and short biography filled in.
- [ ] At least one About section written and published.
- [ ] Education entry completed (years checked) and published.
- [ ] At least 3 skills with honest learning statuses.
- [ ] At least 1–2 projects with a short description, and links that work.
- [ ] Settings: page title template, default description, sharing image.
- [ ] Links: GitHub (and LinkedIn if you use it) checked logged out.
- [ ] Every published page read once on a phone and on a computer.
- [ ] No example text from this worksheet left anywhere.
- [ ] Anything you're unsure about is still a **draft**.

## Your open questions (fill in as you go)

| Question                                              | Answer |
| ----------------------------------------------------- | ------ |
| What name should the website display?                 | ✍️     |
| Start year and expected graduation year?              | ✍️     |
| Current year / semester (if you want it shown)?       | ✍️     |
| Is `github.com/Ramssmb` your public GitHub profile?   | ✍️     |
| Which 2–3 projects best represent you?                | ✍️     |
| Any internships, jobs or club roles to list?          | ✍️     |
| Any certificates with verification links?             | ✍️     |
| Do you want a public email, or the contact form only? | ✍️     |
