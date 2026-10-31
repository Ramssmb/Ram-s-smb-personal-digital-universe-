/**
 * Applies pending migrations as the schema-owner role:
 *
 *   npm run db:migrate        (reads MIGRATION_DATABASE_URL from .env)
 *
 * Run by hand in development and as a release step in production — never by the
 * web process itself.
 */
import { runMigrations } from "../src/server/db/migrate";

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error("MIGRATION_DATABASE_URL is not set.");
  process.exit(1);
}

try {
  await runMigrations(url);
  console.log("Migrations applied.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
