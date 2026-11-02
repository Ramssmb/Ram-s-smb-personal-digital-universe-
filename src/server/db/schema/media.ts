import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { timestamps } from "./common";
import { mediaAccess } from "./enums";

export interface MediaVariant {
  width: number;
  key: string;
  byteSize: number;
}

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid().primaryKey().defaultRandom(),
    storageKey: text().notNull().unique(),
    access: mediaAccess().notNull().default("public"),
    kind: text().notNull(),
    mimeType: text().notNull(),
    byteSize: bigint({ mode: "number" }).notNull(),
    sha256: text().notNull(),
    width: integer(),
    height: integer(),
    variants: jsonb().$type<MediaVariant[]>().notNull().default([]),
    originalFilename: text().notNull(),
    altText: text().notNull().default(""),
    uploadedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    check("media_kind", sql`${t.kind} in ('image', 'document')`),
    check("media_alt_length", sql`char_length(${t.altText}) <= 300`),
  ],
);

/**
 * A pending direct upload (UPLOAD_MODE=direct): the owner was given a signed
 * URL to put one file at `incoming/<id>` in the bucket. Completing the upload
 * deletes the row, so each intent can be used once; rows (and their incoming
 * objects) past `expires_at` are removed by maintenance.
 */
export const uploadIntents = pgTable(
  "upload_intents",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filename: text().notNull(),
    byteSize: integer().notNull(),
    contentType: text().notNull(),
    access: mediaAccess().notNull().default("public"),
    altText: text().notNull().default(""),
    /** Set when the upload replaces the file of an existing media item. */
    mediaId: uuid().references(() => mediaAssets.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("upload_intents_expires_idx").on(t.expiresAt),
    check("upload_intent_size", sql`${t.byteSize} > 0`),
    check("upload_intent_alt_length", sql`char_length(${t.altText}) <= 300`),
  ],
);
