# Content guide

What to enter in the admin (`/admin`) before launch, and where. The site was
built without inventing anything about you: everything below marked
**you supply** is empty until you fill it in, and nothing appears publicly until
you publish it.

## How publishing works

- **Collections** (About sections, Education, Skills, Projects, Experience,
  Certifications, Achievements, Journal, Resources, Links) are saved as
  **drafts**. Drafts are never public. Use **Publish** on an item when it is
  accurate; **Unpublish** or **Archive** hides it again. Publishing is refused,
  with a list of what is missing, if a required field is empty.
- **Profile** and **Settings** are single pages of fields. Anything you fill in
  there is shown as soon as you save; empty fields are simply not shown.
  Leave a field blank rather than guessing.
- Each item has a **Preview** link, visible only to you while signed in.
- Uploaded images are re-encoded, resized and stripped of location/EXIF data.
  Write **alt text** for every image (describe what it shows).

## Already in the admin (from the seed, confirmed by you)

| Where               | What                                                                                                                                                                       | State                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Education           | B.Tech., Computer Science and Engineering, Dr. B. R. Ambedkar National Institute of Technology Jalandhar                                                                   | **Draft** — add years/status, then publish            |
| Profile → Interests | Software engineering; Artificial intelligence and machine learning; Backend development; Computer science                                                                  | Shown on the home page now (confirmed facts)          |
| About sections      | Titles only: Introduction, Background, Academic journey, Technical interests, Professional interests, Goals, Learning philosophy, Career aspirations, Areas of exploration | **Drafts, empty** — cannot be published until written |
| Categories          | Skill and resource categories (rename, reorder or delete freely)                                                                                                           | Structure only                                        |

Your academic year, semester and graduation year were **not** entered: they
were not confirmed.

## 1. Profile (Admin → Profile) — you supply

| Field                  | Notes                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Display name           | Your name as it should appear on the site, in titles and metadata.                        |
| Professional headline  | One line, e.g. what you study and what you build.                                         |
| Short biography        | 2–4 sentences for the home page.                                                          |
| Profile photo          | Optional. Square works best. Add alt text.                                                |
| Current learning focus | Optional, one or two lines.                                                               |
| Interests              | Already filled with the four confirmed interests; edit if they change.                    |
| Location               | Optional. Only as precise as you are comfortable sharing (e.g. a city or just a country). |
| Availability           | Optional, e.g. open to internships — only if true.                                        |

## 2. About (Admin → Content → About sections) — you supply

Write the sections you want and delete the rest. Each needs content before it
can be published. Markdown is supported (headings, lists, links, code).

## 3. Education — you supply

On the seeded entry: **start year**, **end year (or expected)**, **current
academic status** and **current semester** if you want them shown, and
relevant coursework. Then publish. Add school/intermediate entries only if you
want them on the site.

## 4. Skills — you supply

For each skill: name, category, learning status, experience level, and
optionally a short description and "last reviewed" date. Only list skills you
can talk about in an interview. Mark featured skills for the home page.

## 5. Projects — you supply

Per project: title, short description, status, dates, repository URL, live
demo URL (only if it works), cover image and screenshots (with alt text),
technologies (linked to your skills), key features, and a write-up (problem,
approach, what you learned). Mark the best 2–3 as featured.

> The e2e test data (e.g. "Uptime monitor") lives only in the test database,
> never in production. Production starts with no projects.

## 6. Experience — you supply

Internships, jobs, research, volunteering, positions of responsibility: role,
organization, type, dates (leave end date empty if ongoing), location,
responsibilities, technologies, and related links.

## 7. Certifications — you supply

Title, issuer, type, issue/expiry dates, credential ID and **verification
link** (lets visitors confirm it), and optionally the certificate file. Upload
certificate files as **private** if they contain personal details you do not
want public; a private file is never served to visitors.

## 8. Achievements — you supply

Hackathons, competitions, scholarships, publications, rankings: title, type,
organization/event, date, link, optional image or document.

## 9. Journal — you supply

Learning notes or posts: date, title, topic, summary, body (Markdown),
technologies, tags, links, images. Publish only finished entries.

## 10. Resources — you supply

Books, courses, documentation and tools you recommend: title, URL, type,
category, short description.

## 11. Contact and social links

- **Admin → Content → Links:** GitHub, LinkedIn, LeetCode, email, etc. Label,
  URL, category, icon. Turn on **Identity link (rel="me")** for profiles that
  are really yours. Check every URL opens the right profile.
- **Admin → Settings → Public email address:** optional; it is shown publicly
  and will receive spam. The contact form works without it.
- **Admin → Settings → Accept messages through the contact form:** on or off.
  Messages arrive in Admin → Messages; email notifications need SMTP settings on
  the server (DEPLOYMENT.md §9).

## 12. Settings (Admin → Settings) — you supply

Site name, page title template, default description (used by search engines
and link previews), default theme, social sharing image (1200 × 630), and which
sections the home page shows.

## Before launch

- [ ] Profile has at least a display name, headline and short biography.
- [ ] Education entry completed and published.
- [ ] At least one About section written and published.
- [ ] Every published item read once on the public site (desktop and phone).
- [ ] Every link opens the right page; no placeholder text anywhere.
- [ ] Settings: site name, description and sharing image set.
- [ ] Anything you are unsure about is still a draft.
