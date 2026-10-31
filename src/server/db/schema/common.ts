import { sql } from "drizzle-orm";
import { boolean, customType, integer, timestamp } from "drizzle-orm/pg-core";

import { contentStatus, visibility } from "./enums";

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export function timestamps() {
  return {
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  };
}

/**
 * Columns every publishable content table shares (docs/DATABASE_DESIGN.md §2).
 * Visitors see a row only when status = 'published' AND visibility = 'public'.
 */
export function publishable() {
  return {
    status: contentStatus().notNull().default("draft"),
    visibility: visibility().notNull().default("public"),
    isFeatured: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  };
}

/** Weighted full-text search document: A for titles, B for summaries, C for bodies. */
export function searchDocument(a: string[], b: string[], c: string[] = []) {
  const part = (columns: string[], weight: string) =>
    `setweight(to_tsvector('english'::regconfig, ${columns
      .map((column) => `coalesce("${column}", '')`)
      .join(" || ' ' || ")}), '${weight}')`;
  const parts = [part(a, "A"), part(b, "B"), ...(c.length ? [part(c, "C")] : [])];
  return sql.raw(parts.join(" || "));
}
