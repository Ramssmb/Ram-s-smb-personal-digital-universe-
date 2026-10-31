import { sql } from "drizzle-orm";
import { bigint, check, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

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
