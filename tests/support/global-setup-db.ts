import postgres from "postgres";

import { runMigrations } from "../../src/server/db/migrate";

import { testDatabaseUrls } from "./db-urls";

/** Rebuilds the test database schema from the migrations once per run. */
export default async function setup() {
  const { owner } = testDatabaseUrls();
  const sql = postgres(owner, { max: 1, onnotice: () => {} });
  try {
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    // Recreate public with the same grants infra/postgres/init/01-roles.sql sets up.
    await sql`DROP SCHEMA IF EXISTS public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT USAGE ON SCHEMA public TO site_app`;
    // Enum types and default privileges live in the schema, so they were dropped too.
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO site_app`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO site_app`;
  } finally {
    await sql.end();
  }
  await runMigrations(owner);
}
