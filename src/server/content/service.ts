import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { COLLECTIONS, type CollectionKey } from "@/lib/content/collections";
import { CONTENT_STATUSES } from "@/lib/content/enums";
import { buildSchema, isRelationField, slugify, type FieldDef } from "@/lib/content/fields";
import { db, type Database } from "@/server/db/client";
import { categories, mediaAssets, skills, tags } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import type { SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";

import { TABLES } from "./registry";

export type Row = Record<string, unknown>;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

function columnsOf(key: CollectionKey): Record<string, AnyPgColumn> {
  const { search: _search, ...columns } = getTableColumns(TABLES[key].table) as Record<
    string,
    AnyPgColumn
  >;
  return columns;
}

function column(key: CollectionKey, name: string): AnyPgColumn {
  const found = columnsOf(key)[name];
  if (!found) throw new Error(`Unknown column ${key}.${name}`);
  return found;
}

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

function pgCode(error: unknown): string | undefined {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return (error as { code?: string })?.code ?? cause?.code;
}

/** Turns constraint violations into client errors instead of 500s. */
function mapDbError(error: unknown): never {
  const code = pgCode(error);
  if (code === "23505")
    throw new AppError("conflict", "Another item already uses this slug or name.", {
      slug: "Already in use.",
    });
  if (code === "23503") throw new AppError("validation_failed", "A linked item no longer exists.");
  if (code === "23514")
    throw new AppError(
      "validation_failed",
      "Some values are out of range (check dates and lengths).",
    );
  throw error;
}

// ---------------------------------------------------------------- reads

export interface ListOptions {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listItems(key: CollectionKey, options: ListOptions = {}) {
  const def = COLLECTIONS[key];
  const { table, publishable, hasSortOrder } = TABLES[key];
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));

  const filters: SQL[] = [];
  const q = options.q?.trim();
  if (q) filters.push(ilike(column(key, def.titleField), likePattern(q.slice(0, 100))));
  if (
    publishable &&
    options.status &&
    (CONTENT_STATUSES as readonly string[]).includes(options.status)
  ) {
    filters.push(eq(column(key, "status"), options.status));
  }
  const where = filters.length ? and(...filters) : undefined;

  const order =
    def.order.kind === "date"
      ? [sql`${column(key, def.order.field)} DESC NULLS LAST`, desc(column(key, "createdAt"))]
      : def.order.kind === "alpha"
        ? [asc(column(key, def.order.field))]
        : hasSortOrder
          ? [asc(column(key, "sortOrder")), desc(column(key, "createdAt"))]
          : [desc(column(key, "createdAt"))];

  const [items, [total]] = await Promise.all([
    db()
      .select(columnsOf(key))
      .from(table)
      .where(where)
      .orderBy(...order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db().select({ value: count() }).from(table).where(where),
  ]);
  return { items: items as Row[], total: Number(total?.value ?? 0), page, pageSize };
}

export async function getItem(key: CollectionKey, id: string): Promise<Row> {
  assertId(id);
  const { table, joins } = TABLES[key];
  const [row] = await db().select(columnsOf(key)).from(table).where(eq(table.id, id)).limit(1);
  if (!row) throw new AppError("not_found");
  const result: Row = { ...row };
  for (const join of joins) {
    const linked = await db()
      .select({ id: join.other })
      .from(join.table)
      .where(eq(join.own, id))
      .orderBy(join.sort ? asc(join.sort) : asc(join.other));
    result[join.field] = linked.map((link) => link.id);
  }
  return result;
}

// ---------------------------------------------------------------- writes

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertId(id: string): void {
  if (!UUID.test(id)) throw new AppError("not_found");
}

async function uniqueSlug(
  tx: Tx,
  key: CollectionKey,
  base: string,
  excludeId?: string,
): Promise<string> {
  const slugColumn = column(key, "slug");
  const { table } = TABLES[key];
  const root = base || "item";
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`.slice(0, 80);
    const [clash] = await tx
      .select({ id: table.id })
      .from(table)
      .where(eq(slugColumn, candidate))
      .limit(1);
    if (!clash || clash.id === excludeId) return candidate;
  }
  throw new AppError("conflict", "Could not find a free slug.");
}

/** Checks that referenced categories, skills, tags and media exist and fit. */
async function checkReferences(tx: Tx, fields: FieldDef[], data: Row): Promise<void> {
  for (const field of fields) {
    const value = data[field.name];
    if (field.kind === "category" && typeof value === "string") {
      const [category] = await tx
        .select({ scope: categories.scope })
        .from(categories)
        .where(eq(categories.id, value));
      if (!category || category.scope !== field.scope) {
        throw new AppError("validation_failed", undefined, {
          [field.name]: "Choose a category of the right type.",
        });
      }
    }
    if (
      (field.kind === "media" && typeof value === "string") ||
      (field.kind === "media-many" && Array.isArray(value))
    ) {
      const ids = (Array.isArray(value) ? value : [value]) as string[];
      if (ids.length === 0) continue;
      const found = await tx
        .select({ id: mediaAssets.id, kind: mediaAssets.kind })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, ids));
      if (found.length !== new Set(ids).size) {
        throw new AppError("validation_failed", undefined, {
          [field.name]: "A selected file no longer exists.",
        });
      }
      if (field.accept === "image" && found.some((m) => m.kind !== "image")) {
        throw new AppError("validation_failed", undefined, { [field.name]: "Choose an image." });
      }
      if (field.accept === "document" && found.some((m) => m.kind !== "document")) {
        throw new AppError("validation_failed", undefined, { [field.name]: "Choose a document." });
      }
    }
    if (field.kind === "relation-many" && Array.isArray(value) && value.length) {
      const target = field.target === "skills" ? skills : tags;
      const found = await tx
        .select({ id: target.id })
        .from(target)
        .where(inArray(target.id, value as string[]));
      if (found.length !== new Set(value as string[]).size) {
        throw new AppError("validation_failed", undefined, {
          [field.name]: "A selected item no longer exists.",
        });
      }
    }
  }
}

async function writeJoins(tx: Tx, key: CollectionKey, id: string, data: Row): Promise<void> {
  for (const join of TABLES[key].joins) {
    const ids = [...new Set((data[join.field] as string[] | undefined) ?? [])];
    await tx.delete(join.table).where(eq(join.own, id));
    if (ids.length === 0) continue;
    await tx.insert(join.table).values(
      ids.map((otherId, index) => ({
        [ownProperty(join.own)]: id,
        [ownProperty(join.other)]: otherId,
        ...(join.sort ? { sortOrder: index } : {}),
      })),
    );
  }
}

/** snake_case column name → camelCase property name used by Drizzle inserts. */
function ownProperty(col: AnyPgColumn): string {
  return col.name.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

function splitInput(key: CollectionKey, input: unknown) {
  const def = COLLECTIONS[key];
  const parsed = buildSchema(def.fields).parse(input) as Row;
  const columns: Row = {};
  for (const field of def.fields) {
    if (!isRelationField(field)) columns[field.name] = parsed[field.name] ?? null;
  }
  // Columns with database defaults must not receive explicit nulls.
  for (const [name, value] of Object.entries(columns)) {
    if (value === null && columnsOf(key)[name]?.notNull) delete columns[name];
  }
  return { parsed, columns };
}

async function fillSlug(
  tx: Tx,
  key: CollectionKey,
  columns: Row,
  excludeId?: string,
): Promise<void> {
  const slugField = COLLECTIONS[key].fields.find((f) => f.kind === "slug");
  if (!slugField || slugField.kind !== "slug") return;
  const requested = columns.slug as string | null | undefined;
  const base = requested || slugify(String(columns[slugField.from] ?? ""));
  if (key === "categories") {
    // Category slugs are unique per scope only.
    columns.slug = base || "category";
    return;
  }
  columns.slug = requested ? requested : await uniqueSlug(tx, key, base, excludeId);
}

export async function createItem(
  key: CollectionKey,
  input: unknown,
  admin: SessionUser,
): Promise<Row> {
  const { table, publishable } = TABLES[key];
  const def = COLLECTIONS[key];
  const { parsed, columns } = splitInput(key, input);
  const now = new Date();
  try {
    const id = await db().transaction(async (tx) => {
      await checkReferences(tx, def.fields, parsed);
      await fillSlug(tx, key, columns);
      const values: Row = { ...columns, createdAt: now, updatedAt: now };
      if (publishable) values.status = "draft";
      const [created] = await tx.insert(table).values(values).returning({ id: table.id });
      await writeJoins(tx, key, created!.id as string, parsed);
      return created!.id as string;
    });
    await audit({ userId: admin.id, action: "create", entityType: key, entityId: id });
    return getItem(key, id);
  } catch (error) {
    mapDbError(error);
  }
}

export async function updateItem(
  key: CollectionKey,
  id: string,
  input: unknown,
  expectedUpdatedAt: string | undefined,
  admin: SessionUser,
): Promise<Row> {
  assertId(id);
  const { table } = TABLES[key];
  const def = COLLECTIONS[key];
  const { parsed, columns } = splitInput(key, input);
  try {
    await db().transaction(async (tx) => {
      const [current] = await tx
        .select({ updatedAt: table.updatedAt })
        .from(table)
        .where(eq(table.id, id))
        .for("update");
      if (!current) throw new AppError("not_found");
      if (expectedUpdatedAt && (current.updatedAt as Date).toISOString() !== expectedUpdatedAt) {
        throw new AppError(
          "conflict",
          "This item was changed elsewhere. Reload to see the latest version.",
        );
      }
      await checkReferences(tx, def.fields, parsed);
      await fillSlug(tx, key, columns, id);
      await tx
        .update(table)
        .set({ ...columns, updatedAt: new Date() })
        .where(eq(table.id, id));
      await writeJoins(tx, key, id, parsed);
    });
  } catch (error) {
    mapDbError(error);
  }
  await audit({
    userId: admin.id,
    action: "update",
    entityType: key,
    entityId: id,
    summary: { fields: Object.keys(columns) },
  });
  return getItem(key, id);
}

/** Problems that would make the public page broken or misleading. */
async function publishProblems(key: CollectionKey, row: Row): Promise<Record<string, string>> {
  const def = COLLECTIONS[key];
  const problems: Record<string, string> = {};
  for (const name of def.requiredToPublish ?? []) {
    const value = row[name];
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      const field = def.fields.find((f) => f.name === name);
      problems[name] = `Add ${field?.label.toLowerCase() ?? name} before publishing.`;
    }
  }
  if (key === "journal") {
    const sections = ["learnedMd", "bodyMd", "builtMd", "problemsMd", "summary"];
    if (sections.every((name) => !String(row[name] ?? "").trim())) {
      problems.learnedMd = "Write at least one section before publishing.";
    }
  }
  // Every image shown publicly needs alt text; private files cannot be shown at all.
  const mediaIds: string[] = [];
  for (const field of def.fields) {
    if (field.kind === "media" && typeof row[field.name] === "string")
      mediaIds.push(row[field.name] as string);
    if (field.kind === "media-many") mediaIds.push(...((row[field.name] as string[]) ?? []));
  }
  if (mediaIds.length) {
    const files = await db()
      .select({
        id: mediaAssets.id,
        kind: mediaAssets.kind,
        alt: mediaAssets.altText,
        access: mediaAssets.access,
      })
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, mediaIds));
    if (files.some((f) => f.kind === "image" && f.access === "public" && !f.alt.trim())) {
      problems.media = "Add alt text to every image in the media library before publishing.";
    }
    // Image fields and file lists are always rendered publicly, so their files must be
    // public. (A single certificate file may be private; see the check below.)
    const shownFields = def.fields.filter(
      (f) => f.kind === "media-many" || (f.kind === "media" && f.accept === "image"),
    );
    const shownIds = new Set(
      shownFields.flatMap((f) =>
        Array.isArray(row[f.name])
          ? (row[f.name] as string[])
          : row[f.name]
            ? [row[f.name] as string]
            : [],
      ),
    );
    if (files.some((f) => shownIds.has(f.id) && f.access === "private")) {
      problems.media =
        "Files shown on public pages must be public. Change them in the media library.";
    }
  }
  if (key === "certifications" && row.mediaId && !row.verificationUrl) {
    const [file] = await db()
      .select({ access: mediaAssets.access })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, row.mediaId as string));
    if (file?.access === "private") {
      problems.verificationUrl =
        "The certificate file is private: add a verification link so visitors can check it.";
    }
  }
  return problems;
}

export type Transition = "publish" | "unpublish" | "archive";

export async function transitionItem(
  key: CollectionKey,
  id: string,
  action: Transition,
  admin: SessionUser,
): Promise<Row> {
  assertId(id);
  const { table, publishable } = TABLES[key];
  if (!publishable) throw new AppError("validation_failed", "This content is always live.");
  const row = await getItem(key, id);
  if (action === "publish") {
    const problems = await publishProblems(key, row);
    if (Object.keys(problems).length) {
      throw new AppError(
        "validation_failed",
        "Complete the highlighted fields before publishing.",
        problems,
      );
    }
  }
  const status = action === "publish" ? "published" : action === "archive" ? "archived" : "draft";
  const now = new Date();
  await db()
    .update(table)
    .set({
      status,
      updatedAt: now,
      ...(action === "publish" && !row.publishedAt ? { publishedAt: now } : {}),
    })
    .where(eq(table.id, id));
  await audit({ userId: admin.id, action, entityType: key, entityId: id });
  return getItem(key, id);
}

/** Visibility and featured flags, which do not require re-validating the content. */
export async function setFlags(
  key: CollectionKey,
  id: string,
  flags: { visibility?: "public" | "private"; isFeatured?: boolean },
  admin: SessionUser,
): Promise<Row> {
  assertId(id);
  const { table, publishable } = TABLES[key];
  if (!publishable) throw new AppError("validation_failed");
  const set: Row = { updatedAt: new Date() };
  if (flags.visibility) set.visibility = flags.visibility;
  if (typeof flags.isFeatured === "boolean") set.isFeatured = flags.isFeatured;
  const updated = await db()
    .update(table)
    .set(set)
    .where(eq(table.id, id))
    .returning({ id: table.id });
  if (!updated.length) throw new AppError("not_found");
  await audit({
    userId: admin.id,
    action: "update_flags",
    entityType: key,
    entityId: id,
    summary: flags,
  });
  return getItem(key, id);
}

export async function deleteItem(
  key: CollectionKey,
  id: string,
  admin: SessionUser,
): Promise<void> {
  assertId(id);
  const { table } = TABLES[key];
  try {
    const deleted = await db().delete(table).where(eq(table.id, id)).returning({ id: table.id });
    if (!deleted.length) throw new AppError("not_found");
  } catch (error) {
    mapDbError(error);
  }
  await audit({ userId: admin.id, action: "delete", entityType: key, entityId: id });
}

/** Sets sortOrder to the position of each id in the given list. */
export async function reorderItems(
  key: CollectionKey,
  ids: string[],
  admin: SessionUser,
): Promise<void> {
  const { table, hasSortOrder } = TABLES[key];
  if (!hasSortOrder) throw new AppError("validation_failed", "This list is sorted automatically.");
  ids.forEach(assertId);
  await db().transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(table).set({ sortOrder: index }).where(eq(table.id, id));
    }
  });
  await audit({
    userId: admin.id,
    action: "reorder",
    entityType: key,
    summary: { count: ids.length },
  });
}
