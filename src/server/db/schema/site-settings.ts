import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { publishable, timestamps } from "./common";
import { themePreference } from "./enums";
import { mediaAssets } from "./media";

/** Single-row website settings (docs/DATABASE_DESIGN.md §4). */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: smallint("id").primaryKey().default(1),
    siteName: text("site_name"),
    titleTemplate: text("title_template").notNull().default("%s"),
    defaultDescription: text("default_description"),
    defaultTheme: themePreference("default_theme").notNull().default("system"),
    ogImageId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    contactEnabled: boolean().notNull().default(true),
    /** Shown publicly only when set. Kept separate from the account email on purpose. */
    publicEmail: text(),
    homeShowEducation: boolean().notNull().default(true),
    homeShowProjects: boolean().notNull().default(true),
    homeShowSkills: boolean().notNull().default(true),
    homeShowJournal: boolean().notNull().default(true),
    homeShowAchievements: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("site_settings_singleton", sql`${table.id} = 1`),
    check("site_settings_site_name_length", sql`char_length(${table.siteName}) <= 80`),
    check(
      "site_settings_title_template",
      sql`char_length(${table.titleTemplate}) <= 120 AND position('%s' in ${table.titleTemplate}) > 0`,
    ),
    check("site_settings_description_length", sql`char_length(${table.defaultDescription}) <= 300`),
  ],
);

/** Single-row public profile. Every field is optional; empty fields are not rendered. */
export const profile = pgTable(
  "profile",
  {
    id: smallint().primaryKey().default(1),
    displayName: text(),
    headline: text(),
    shortBio: text(),
    photoId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    location: text(),
    currentFocus: text(),
    interests: jsonb().$type<string[]>().notNull().default([]),
    availability: text(),
    ...timestamps(),
  },
  (t) => [check("profile_singleton", sql`${t.id} = 1`)],
);

export const aboutSections = pgTable("about_sections", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  bodyMd: text().notNull().default(""),
  ...publishable(),
});

/** Optional title/description overrides for the fixed public pages. */
export const seoPages = pgTable("seo_pages", {
  key: text().primaryKey(),
  title: text(),
  description: text(),
  ...timestamps(),
});
