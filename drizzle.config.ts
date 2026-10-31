import { defineConfig } from "drizzle-kit";

// Migrations run as the schema-owner role, never as the runtime role the web
// process uses. `db:generate` needs no database; only `db:migrate` does.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL ?? "",
  },
});
