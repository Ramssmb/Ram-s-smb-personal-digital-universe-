import { THEME_PREFERENCES } from "./enums";
import type { FieldDef } from "./fields";

export const PROFILE_FIELDS: FieldDef[] = [
  {
    kind: "text",
    name: "displayName",
    label: "Display name",
    max: 80,
    hint: "Shown in the hero, header and page titles.",
  },
  {
    kind: "text",
    name: "headline",
    label: "Professional headline",
    max: 140,
    placeholder: "Computer Science student focused on backend systems",
  },
  { kind: "textarea", name: "shortBio", label: "Short biography", max: 400, rows: 4 },
  { kind: "media", name: "photoId", label: "Profile photo", accept: "image" },
  { kind: "textarea", name: "currentFocus", label: "Current learning focus", max: 300, rows: 2 },
  {
    kind: "string-list",
    name: "interests",
    label: "Interests",
    hint: "One per line.",
    maxItems: 20,
  },
  {
    kind: "text",
    name: "location",
    label: "Location",
    max: 80,
    hint: "Optional. Leave empty to keep it private.",
  },
  {
    kind: "text",
    name: "availability",
    label: "Availability",
    max: 140,
    hint: "e.g. “Open to internships for summer 2027”.",
  },
];

export const SETTINGS_FIELDS: FieldDef[] = [
  {
    kind: "text",
    name: "siteName",
    label: "Site name",
    max: 80,
    hint: "Defaults to your display name.",
  },
  {
    kind: "text",
    name: "titleTemplate",
    label: "Page title template",
    required: true,
    max: 120,
    hint: "%s is replaced by the page title, e.g. “%s · Your Name”.",
  },
  { kind: "textarea", name: "defaultDescription", label: "Default description", max: 300, rows: 3 },
  {
    kind: "select",
    name: "defaultTheme",
    label: "Default theme",
    options: THEME_PREFERENCES,
    required: true,
  },
  {
    kind: "media",
    name: "ogImageId",
    label: "Social sharing image",
    accept: "image",
    hint: "1200 × 630 works best.",
  },
  {
    kind: "email",
    name: "publicEmail",
    label: "Public email address",
    hint: "Shown on the contact page only if set. Leave empty to rely on the contact form.",
  },
  { kind: "boolean", name: "contactEnabled", label: "Accept messages through the contact form" },
  { kind: "boolean", name: "homeShowEducation", label: "Home: show education" },
  { kind: "boolean", name: "homeShowProjects", label: "Home: show featured projects" },
  { kind: "boolean", name: "homeShowSkills", label: "Home: show featured skills" },
  { kind: "boolean", name: "homeShowJournal", label: "Home: show recent journal entries" },
  { kind: "boolean", name: "homeShowAchievements", label: "Home: show featured achievements" },
];

export const SEO_PAGE_FIELDS: FieldDef[] = [
  { kind: "text", name: "title", label: "Title", max: 70 },
  { kind: "textarea", name: "description", label: "Description", max: 160, rows: 2 },
];
