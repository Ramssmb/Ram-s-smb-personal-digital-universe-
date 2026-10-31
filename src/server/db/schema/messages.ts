import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { messageStatus } from "./enums";

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull(),
    subject: text().notNull().default(""),
    body: text().notNull(),
    status: messageStatus().notNull().default("new"),
    /** Keyed hash of the sender IP; the raw address is never stored. */
    ipHash: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.createdAt),
    check("contact_body_length", sql`char_length(${t.body}) <= 5000`),
  ],
);
