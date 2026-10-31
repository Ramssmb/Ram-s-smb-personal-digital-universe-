import { sql } from "drizzle-orm";
import { check, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

import { themePreference } from "./enums";

/**
 * Single-row website settings. Columns for contact, SEO images and analytics are
 * added in the phases that use them (docs/DATABASE_DESIGN.md §4).
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: smallint("id").primaryKey().default(1),
    siteName: text("site_name"),
    titleTemplate: text("title_template").notNull().default("%s"),
    defaultDescription: text("default_description"),
    defaultTheme: themePreference("default_theme").notNull().default("system"),
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
