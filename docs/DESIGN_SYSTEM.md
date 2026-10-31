# Design system

> Status: **Phase 2 — Design direction.** Implemented in Phase 3 as tokens in
> `src/app/globals.css` and components in `src/components/ui/`. A living
> reference page at `/admin/design` shows every component in both themes.

## 1. Principles

1. **Content first.** The person and their work are the visual focus; the
   interface stays quiet. No decorative gradients, glow, or parallax.
2. **One product.** Public site and dashboard share tokens and components; the
   dashboard is simply denser.
3. **Hierarchy through type and space**, not boxes. Cards are used for
   collections of comparable items, not as default containers.
4. **Motion explains, never decorates.** 150–250 ms transitions for state
   changes; all motion disabled under `prefers-reduced-motion`.
5. **Accessible by construction.** WCAG 2.2 AA is the baseline, verified by
   automated axe checks and keyboard testing.

## 2. Color

Semantic tokens; components never use raw palette values.

| Token                                  | Light                     | Dark          | Use                                   |
| -------------------------------------- | ------------------------- | ------------- | ------------------------------------- |
| `--bg`                                 | `#FAFAF9`                 | `#0B0B0C`     | Page background                       |
| `--surface`                            | `#FFFFFF`                 | `#141416`     | Cards, panels                         |
| `--surface-muted`                      | `#F4F4F2`                 | `#1B1B1E`     | Secondary areas, code                 |
| `--border`                             | `#E6E5E1`                 | `#26262A`     | Hairlines                             |
| `--text`                               | `#18181B`                 | `#EDEDEF`     | Primary text                          |
| `--text-muted`                         | `#5B5B63`                 | `#A0A0AA`     | Secondary text (≥ 4.5:1 on `--bg`)    |
| `--accent`                             | `#2F5BEA`                 | `#7C9BFF`     | Links, primary actions, focus ring    |
| `--accent-contrast`                    | `#FFFFFF`                 | `#0B0B0C`     | Text on accent                        |
| `--success` / `--warning` / `--danger` | green / amber / red pairs | lighter pairs | Status only, always with text or icon |

One accent color. Status colors are never the only signal. Exact values are
verified for contrast in Phase 3 and adjusted if any pair fails.

**Theme switching.** Default follows the OS (`prefers-color-scheme`); a toggle
stores an explicit choice in a cookie so the server renders the right theme with
no flash.

## 3. Typography

- **Sans:** Inter (variable, self-hosted via `next/font`, subset, `swap`).
- **Mono:** JetBrains Mono, for code, dates in the timeline and technical labels.
- Scale (rem, 1.2 ratio, fluid with `clamp` on the two largest steps):

| Token     | Size / line height                   | Use                  |
| --------- | ------------------------------------ | -------------------- |
| `display` | clamp(2.5, 5vw, 4) / 1.05, −0.03em   | Home hero name only  |
| `h1`      | clamp(2, 3.5vw, 2.75) / 1.1, −0.02em | Page titles          |
| `h2`      | 1.75 / 1.2                           | Section titles       |
| `h3`      | 1.25 / 1.3                           | Card and item titles |
| `body-lg` | 1.125 / 1.6                          | Introductions        |
| `body`    | 1 / 1.6                              | Default              |
| `small`   | 0.875 / 1.5                          | Meta, labels         |
| `micro`   | 0.75 / 1.4, +0.04em, uppercase       | Eyebrows, badges     |

Reading width capped at 68ch for long-form text.

## 4. Space, radius, elevation

- Spacing on a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Section rhythm: 96 px desktop, 64 px tablet, 48 px phone.
- Radius: 6 (inputs, badges), 10 (buttons), 14 (cards), full (avatars, pills).
- Elevation: borders by default; one soft shadow for floating layers (menus,
  dialogs, command palette). No stacked shadows.

## 5. Layout and breakpoints

| Name | Min width | Layout                                               |
| ---- | --------- | ---------------------------------------------------- |
| base | 0         | Single column, 16 px gutters, bottom-safe-area aware |
| `sm` | 640       | Wider gutters (24 px)                                |
| `md` | 768       | Two-column grids, side-by-side meta                  |
| `lg` | 1024      | Full navigation bar; dashboard sidebar visible       |
| `xl` | 1280      | Max content width 1200 px, centered                  |

Mobile is designed separately, not shrunk: navigation becomes a full-screen
sheet; filters become a bottom sheet; tables in the dashboard become stacked
rows; tap targets ≥ 44 × 44 px.

## 6. Navigation

- **Public header:** name (home link), primary links (About, Projects, Journal,
  Skills, Resources), "More" menu (Education, Experience, Achievements, Links),
  search button, theme toggle, Contact button. Sticky, translucent with blur,
  hairline border on scroll.
- **Command palette / search** (`/` or `Ctrl K`): global search across all
  public content types, grouped results, full keyboard support.
- **Footer:** site map, important links, feed, last updated date.
- **Dashboard:** left sidebar grouped (Content, Library, Media, Site, Account),
  top bar with search, "New journal entry" quick action, and account menu.

## 7. Components (Phase 3 inventory)

| Group      | Components                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions    | Button (primary, secondary, ghost, danger; sm/md; loading), IconButton, Link, ExternalLink                                                                                   |
| Forms      | Field (label, hint, error), Input, Textarea, MarkdownEditor (write/preview), Select, Combobox (skills, tags), Checkbox, Switch, RadioGroup, DateInput, FileDrop, ImagePicker |
| Display    | Card, ItemRow, Badge (status, level), Tag, Avatar, Stat, EmptyState, Skeleton, Timeline, TimelineItem, Prose (rendered Markdown), CodeBlock                                  |
| Overlays   | Dialog, ConfirmDialog (typed confirmation for permanent deletes), Sheet, Menu, Tooltip, Toast                                                                                |
| Navigation | Header, MobileNav, Footer, Tabs, Breadcrumbs, Pagination ("Load more"), FilterBar, SearchInput, CommandPalette, AdminSidebar                                                 |
| Feedback   | Alert, InlineError, ProgressBar (uploads), SaveStatus ("Saved · 2s ago")                                                                                                     |

Every interactive component: visible focus ring (2 px `--accent`, 2 px offset),
hover/active/disabled states, keyboard support, correct ARIA roles. Built on
headless primitives (Radix UI) where focus management is hard (dialogs, menus,
comboboxes) rather than re-implemented.

## 8. Page patterns

- **Home:** hero (photo, name, headline, short bio, current focus, primary links)
  → "Now" strip (education, learning focus) → featured projects → recent journal
  → featured skills → latest achievements → contact call-to-action. Each block is
  hidden automatically when it has no published content — no empty shells.
- **Collection pages** (projects, resources, skills): title + one-line
  description → FilterBar (search, category, status, sort; state in the URL so it
  is shareable) → grid or list → load more.
- **Detail pages** (project, journal entry): breadcrumb → title block with
  metadata → Prose → related items (by shared skills/tags) → previous/next.
- **Journal timeline:** vertical timeline grouped by month with sticky month
  headers, mono dates, and tag/skill filters; archive sidebar on desktop.
- **Skills:** grouped by category with honest status badges ("Learning",
  "Practicing", "Comfortable"); levels shown only when the owner set them. No
  percentage bars or star ratings — they imply a precision that does not exist.

## 9. Dashboard UX

- Every content type uses the same list → form flow.
- Forms autosave drafts (debounced `PATCH`, with a visible save state) and warn
  before leaving with unsaved changes.
- Publish panel on every form: status, visibility, featured, preview link,
  publish/unpublish button, and the completeness checklist from the API.
- Destructive actions: archive is one click with undo toast; permanent delete
  requires a confirmation dialog.
- **Daily journal fast path:** "New entry" from anywhere (`N` shortcut) opens a
  form pre-filled with today's date; only title plus one section is required;
  `Ctrl Enter` publishes.

## 10. Icons and imagery

- Lucide icons (tree-shaken, consistent stroke); brand icons for link services
  from a small bundled set.
- Images through `next/image` with explicit sizes, AVIF/WebP, lazy loading below
  the fold, blurred placeholders; the hero photo is preloaded.
- Default Open Graph images are generated per page from the title and design
  tokens, so every share has a consistent preview.
