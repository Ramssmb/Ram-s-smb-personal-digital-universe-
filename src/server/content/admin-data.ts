import "server-only";

import { asc, count, desc, eq, inArray } from "drizzle-orm";

import { COLLECTIONS, type CollectionKey } from "@/lib/content/collections";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";

import { TABLES } from "./registry";

/** Choices for category, skill and tag pickers in admin forms (including drafts). */
export async function formOptions() {
  const [categories, skills, tags] = await Promise.all([
    db()
      .select({ id: s.categories.id, name: s.categories.name, scope: s.categories.scope })
      .from(s.categories)
      .orderBy(asc(s.categories.sortOrder), asc(s.categories.name)),
    db()
      .select({ id: s.skills.id, name: s.skills.name })
      .from(s.skills)
      .orderBy(asc(s.skills.name)),
    db().select({ id: s.tags.id, name: s.tags.name }).from(s.tags).orderBy(asc(s.tags.name)),
  ]);
  return { categories, skills, tags };
}

/** Summaries of the files an item references, for thumbnails in the form. */
export async function mediaSummaries(ids: unknown[]) {
  const wanted = [...new Set(ids.flat().filter((id): id is string => typeof id === "string"))];
  if (!wanted.length) return {};
  const rows = await db()
    .select({
      id: s.mediaAssets.id,
      kind: s.mediaAssets.kind,
      access: s.mediaAssets.access,
      altText: s.mediaAssets.altText,
      originalFilename: s.mediaAssets.originalFilename,
    })
    .from(s.mediaAssets)
    .where(inArray(s.mediaAssets.id, wanted));
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

/** Media ids referenced by an item's fields. */
export function referencedMedia(key: CollectionKey, item: Record<string, unknown>): unknown[] {
  return COLLECTIONS[key].fields
    .filter((f) => f.kind === "media" || f.kind === "media-many")
    .map((f) => item[f.name]);
}

/** Counts per status for every publishable collection, for the overview. */
export async function contentCounts() {
  const result: {
    key: CollectionKey;
    label: string;
    draft: number;
    published: number;
    archived: number;
  }[] = [];
  for (const def of Object.values(COLLECTIONS)) {
    const { table, publishable } = TABLES[def.key];
    if (!publishable) continue;
    const statusColumn = (table as unknown as { status: typeof s.projects.status }).status;
    const rows = await db()
      .select({ status: statusColumn, n: count() })
      .from(table)
      .groupBy(statusColumn);
    const counts = { draft: 0, published: 0, archived: 0 };
    for (const row of rows) counts[row.status as keyof typeof counts] = Number(row.n);
    result.push({ key: def.key, label: def.label, ...counts });
  }
  return result;
}

export async function recentDrafts(limit = 6) {
  const [journal, projects] = await Promise.all([
    db()
      .select({
        id: s.journalEntries.id,
        title: s.journalEntries.title,
        updatedAt: s.journalEntries.updatedAt,
      })
      .from(s.journalEntries)
      .where(eq(s.journalEntries.status, "draft"))
      .orderBy(desc(s.journalEntries.updatedAt))
      .limit(limit),
    db()
      .select({ id: s.projects.id, title: s.projects.title, updatedAt: s.projects.updatedAt })
      .from(s.projects)
      .where(eq(s.projects.status, "draft"))
      .orderBy(desc(s.projects.updatedAt))
      .limit(limit),
  ]);
  return [
    ...journal.map((row) => ({ ...row, collection: "journal" as const })),
    ...projects.map((row) => ({ ...row, collection: "projects" as const })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}

export async function lastPublishedJournalDate(): Promise<string | null> {
  const [row] = await db()
    .select({ entryDate: s.journalEntries.entryDate })
    .from(s.journalEntries)
    .where(eq(s.journalEntries.status, "published"))
    .orderBy(desc(s.journalEntries.entryDate))
    .limit(1);
  return row?.entryDate ?? null;
}
