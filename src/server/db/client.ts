import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/server/env";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

interface Connection {
  sql: postgres.Sql;
  db: Database;
}

// Reuse one pool across hot reloads in development instead of leaking a new one
// on every edit.
const globalForDb = globalThis as typeof globalThis & { __siteDb?: Connection };

function connect(): Connection {
  const config = env();
  const sql = postgres(config.DATABASE_URL, {
    max: config.DATABASE_POOL_MAX,
    prepare: config.DATABASE_PREPARE,
    idle_timeout: 30,
    connect_timeout: 10,
    // Never print query parameters (they can contain personal data).
    debug: false,
    onnotice: () => {},
  });
  return { sql, db: drizzle(sql, { schema, casing: "snake_case" }) };
}

function connection(): Connection {
  globalForDb.__siteDb ??= connect();
  return globalForDb.__siteDb;
}

/** The application database, connected as the least-privilege runtime role. */
export function db(): Database {
  return connection().db;
}

export function sqlClient(): postgres.Sql {
  return connection().sql;
}
