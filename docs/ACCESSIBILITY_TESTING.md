# Accessibility testing

Manual screen-reader test guide (NVDA on Windows) and a record of the
cross-browser and Windows checks run on 2026-11-02 (commits `d790537` and `7975982`).

> **Status:** no screen reader has been operated on this site yet. The NVDA
> guide below is for a person to run; tick each check and note what NVDA
> actually said.

---

## 1. NVDA test guide

### Set-up (one time, free)

1. Download NVDA from <https://www.nvaccess.org/download/> (free, open source) and
   install it, or run it portable.
2. Use **Microsoft Edge** or **Google Chrome** (also try **Firefox** if installed).
3. Run the site locally (`npm run dev`, then `http://localhost:3000`) with test
   content, or use the deployed site once it exists. **Never test with real
   personal data you have not published yet.**
4. Start NVDA (`Ctrl+Alt+N`). The **NVDA key** is `Insert` (or `Caps Lock` if
   you chose that).

### Keys you will need

| Key                 | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Next / previous focusable item                                |
| `H` / `Shift+H`     | Next / previous heading (browse mode); `1`–`3` heading levels |
| `D` / `Shift+D`     | Next / previous landmark (header, navigation, main…)          |
| `F` / `B` / `K`     | Next form field / button / link                               |
| `NVDA+F7`           | Elements list: all headings, links, landmarks, form fields    |
| `NVDA+Space`        | Switch browse mode ↔ focus mode                               |
| `Enter` / `Space`   | Activate a link / button                                      |
| `Esc`               | Close a menu or dialog                                        |
| `NVDA+T`            | Read the page title                                           |
| `Ctrl`              | Stop speech                                                   |

### How to record results

For every check: ☐ Pass ☐ Fail, plus **what NVDA said** in your own words.
A failure is anything confusing, silent, wrong or repeated.

### A. Home page navigation

1. Open the home page. `NVDA+T` reads the title.
   - Expected: the site name (e.g. "Your Name").
2. Press `Tab` once.
   - Expected: "Skip to content, link". Press `Enter`; the next `Tab` lands on
     the first link inside the main content (not the header).
3. Press `D` repeatedly.
   - Expected landmarks in order: banner (header) → **Primary** navigation →
     main → the sections "Featured projects", "Recent learning", "Get in touch"
     (if they have content) → content info (footer) → **Footer** navigation.
4. In the header, `Tab` to **More**.
   - Expected: "More, menu button, collapsed". `Enter` → "expanded", focus on
     the first menu item; `↓`/`↑` move through items; `Esc` closes and returns
     to "More".
5. `Tab` to the theme button.
   - Expected: "Switch to dark theme, button" (or light). Activating it changes
     the theme; the label then offers the opposite theme.
6. On the Projects page, the current item in Primary navigation.
   - Expected: "Projects, current page, link".

### B. Heading navigation

1. On each public page press `1`.
   - Expected: exactly one level-1 heading, matching the page (e.g. "Projects").
2. Press `H` through the page.
   - Expected: levels never jump (no h2 → h4); every section has a heading.
3. `NVDA+F7` → Headings.
   - Expected: the list reads like a table of contents for the page.

### C. Main content landmarks

1. `D` to main; then `H`/arrow keys read the content.
   - Expected: no "clickable" noise, no decorative icons announced, images
     announced with their alt text ("graphic, …").

### D. Forms and validation (Contact page)

1. Press `F` to move through fields.
   - Expected: "Name, edit, required", "Email, edit, required", "Subject, edit",
     "Message, edit, multi-line, required, At least 10 characters."
2. With the fields empty, `Tab` to **Send message** and press `Enter`.
   - Expected: "Some fields are invalid." is announced, focus moves to **Name**,
     and NVDA reads "invalid entry, Enter your name."
3. `Tab` to Email and Message.
   - Expected: each says "invalid entry" and its own message ("Enter a valid
     email address.", "Write at least 10 characters.").
4. The hidden spam field.
   - Expected: never reached with `Tab` and never read.

### E. Search

1. Header → search link (or `/search`). `F` to the search field.
   - Expected: a search landmark (`D`) containing a labelled search field and a
     "Search" button.
2. Type a word, `Enter`.
   - Expected: the page reloads with results; `H` reaches each result title.
3. Search for nonsense.
   - Expected: "No results for …" is read when you move to it.

### F. Project details

1. Open a project from Projects with `Enter`.
   - Expected: `NVDA+T` reads "Project title · Site name"; `1` → project title;
     `H` → "The problem", "Solution"… in order.
2. Images.
   - Expected: cover and screenshots announced with meaningful alt text.
3. External links (repository, demo).
   - Expected: the link text says where it goes and "opens in a new tab" if it
     does.

### G. Admin sign-in (`/admin/login`)

1. `NVDA+T` → "Sign in · …"; `1` → "Sign in".
2. `F` → "Email, edit, required", "Password, edit, protected, required".
3. Submit with a **wrong** password (use a test account, never your real
   password while recording).
   - Expected: "The email or password is incorrect." is announced and focus
     stays usable.
4. After five failed attempts.
   - Expected: "Too many failed sign-in attempts. Try again later." announced.

### H. Dashboard navigation

1. After signing in: `Tab` once → "Skip to content".
2. `D` → **Dashboard** navigation landmark; `K` through "Overview, Profile, …".
   - Expected: the current section is "current page".
3. Overview page: `T` (next table).
   - Expected: the table is named "Content"; column headers "Section,
     Published, Drafts, Archived" are read when moving between cells
     (`Ctrl+Alt+arrows`).

### I. Confirmation dialogs

1. Media → a file's **Delete** button.
   - Expected: "Delete _file name_, button".
2. Press `Enter`.
   - Expected: "Delete _file name_?, alert dialog", the description, and focus
     on "**Cancel**, button".
3. `Tab` cycles only inside the dialog. `Esc` closes it.
   - Expected: focus returns to "Delete _file name_". Nothing is deleted.

### J. Media library

1. `F`/`B` through a file card.
   - Expected: "Alt text, edit", "Access, combo box", "Save details of _file
     name_", "Replace file _file name_", "Delete _file name_".
2. Upload field.
   - Expected: "Choose a file to upload" (label read), accepted types read
     afterwards.
3. Known limitation: file cards have no headings, so `H` cannot jump between
   files; use `B` or `F`.

### K. Contact form feedback

1. Fill all fields correctly and send. (On a local copy only.)
   - Expected while sending: the button is announced as "unavailable" / busy.
   - Expected afterwards: "Message sent" is read and focus is on the
     "Message sent" heading.
2. Simulate a failure (e.g. stop the server first).
   - Expected: an error message is announced.

### Test record

| Area                    | Browser | Pass/Fail | What NVDA said / notes | Date |
| ----------------------- | ------- | --------- | ---------------------- | ---- |
| A. Home navigation      |         |           |                        |      |
| B. Headings             |         |           |                        |      |
| C. Landmarks            |         |           |                        |      |
| D. Forms and validation |         |           |                        |      |
| E. Search               |         |           |                        |      |
| F. Project details      |         |           |                        |      |
| G. Admin sign-in        |         |           |                        |      |
| H. Dashboard navigation |         |           |                        |      |
| I. Confirmation dialogs |         |           |                        |      |
| J. Media library        |         |           |                        |      |
| K. Contact feedback     |         |           |                        |      |

---

## 2. Automated cross-browser and Windows checks (2026-11-02)

Production build on `localhost`, test database `personal_site_e2e`, Windows 11.
Read-only: dialogs opened and cancelled, the one contact submission intercepted
in the browser.

| Browser                                | Public suite (28 tests)                   | Dashboard checks (5) |
| -------------------------------------- | ----------------------------------------- | -------------------- |
| Google Chrome 156 — desktop and phone  | 28/28 and 28/28 passed                    | 5/5 passed           |
| Microsoft Edge 156 — desktop and phone | 28/28 and 28/28 passed                    | 5/5 passed           |
| Playwright WebKit 27.2 (not Safari)    | desktop 28/28, phone 23/28¹               | 3/5²                 |
| Playwright Firefox build               | **not run** — would not start on this PC³ | not run              |

¹ axe contrast results on 5 phone pages were inconsistent (a transiently
transparent page background); screenshots show correct colours. Not confirmed
as a site defect. WebKit needed a local proxy removing the CSP
`upgrade-insecure-requests` directive, because WebKit rewrites `http://localhost`
assets to HTTPS; on the HTTPS production site this directive is correct.
² Skip-link test: WebKit (like Safari) does not move to links with `Tab` by
default. Form test: rejected by the CSRF origin check because of the proxy
port — expected.
³ Windows: "side-by-side configuration is incorrect" (a missing Visual C++
runtime is the usual cause).

### Windows checks (Microsoft Edge 156, emulated)

| Check                          | Result                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forced colours (High Contrast) | Fields, icons, links, focus outline, current-page underline and dialogs visible. Buttons lacked an outline — **fixed in `7975982`**, covered by an E2E test |
| 200 % text size                | Phone header pushed the menu off-screen; some rows did not wrap — **fixed in `7975982`**; E2E test checks every page at 3 sizes                             |
| 200 % page zoom (720 px)       | No horizontal scrolling, nothing clipped                                                                                                                    |
| Text spacing (WCAG 1.4.12)     | No horizontal scrolling; only the deliberately truncated site name is shortened                                                                             |
| Reduced motion                 | All animations disabled                                                                                                                                     |
| Keyboard only                  | Navigation, project pages and theme toggle (Space and Enter) work; focus always visible                                                                     |

Emulation only: Windows' own High Contrast themes and text-size setting were
not switched on (system settings were not changed).

### Known open items

- Media library file cards have no headings, so NVDA's `H` key cannot jump
  between files (use `B` or `F`).
- The navigation progress bar is drawn with a background colour and is
  probably invisible in High Contrast mode; the spoken "Loading page…" still
  works. Not observed directly.
- Not tested: a real screen reader, Firefox (could not start on the test PC),
  Safari / VoiceOver (needs a Mac or iPhone), TalkBack and real phones.
