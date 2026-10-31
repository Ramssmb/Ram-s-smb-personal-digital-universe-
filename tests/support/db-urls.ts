import { existsSync } from "node:fs";

// Load .env for local runs; CI sets the variables directly.
if (existsSync(".env")) process.loadEnvFile(".env");

export function testDatabaseUrls(): { app: string; owner: string } {
  const app = process.env.TEST_DATABASE_URL;
  const owner = process.env.TEST_MIGRATION_DATABASE_URL;
  if (!app || !owner) {
    throw new Error(
      "Integration tests need TEST_DATABASE_URL and TEST_MIGRATION_DATABASE_URL " +
        "(see .env.example; start the database with `docker compose up -d db`).",
    );
  }
  for (const url of [app, owner]) {
    // Refuse to run destructive test setup against anything but a *_test database.
    if (!new URL(url).pathname.endsWith("_test")) {
      throw new Error("Integration tests must target a database whose name ends in _test.");
    }
  }
  return { app, owner };
}
