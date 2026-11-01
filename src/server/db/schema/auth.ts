import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./common";
import { userRole } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Stored lower-cased; uniqueness is case-insensitive in practice. */
    email: text().notNull().unique(),
    passwordHash: text().notNull(),
    role: userRole().notNull().default("owner"),
    passwordChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp({ withTimezone: true }),
    /** Two-factor authentication. Secrets are AES-256-GCM encrypted (src/server/auth/totp.ts). */
    totpSecret: text(),
    /** Secret shown during setup, until the first code confirms it. */
    totpPendingSecret: text(),
    totpEnabledAt: timestamp({ withTimezone: true }),
    /** Last accepted 30-second step: a code cannot be used twice. */
    totpLastStep: bigint({ mode: "number" }),
    /** SHA-256 hashes of unused recovery codes. */
    recoveryCodes: jsonb().$type<string[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [check("users_email_lowercase", sql`${t.email} = lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 (hex) of the cookie token. The token itself is never stored. */
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipHash: text(),
    userAgent: text(),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId), index().on(t.expiresAt)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index().on(t.windowStart)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(),
    entityType: text(),
    entityId: text(),
    /** Changed field names and similar metadata only — never secrets or bodies. */
    summary: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.createdAt)],
);
