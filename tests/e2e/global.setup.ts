import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

import { hash } from "@node-rs/argon2";
import { expect, test as setup } from "@playwright/test";
import postgres from "postgres";

import { runMigrations } from "../../src/server/db/migrate";

export const CREDENTIALS_FILE = "playwright/.auth/credentials.json";

setup("prepare database and sign in", async ({ page }) => {
  const ownerUrl = process.env.E2E_MIGRATION_DATABASE_URL;
  if (!ownerUrl || !process.env.E2E_DATABASE_URL)
    throw new Error("Set E2E_DATABASE_URL and E2E_MIGRATION_DATABASE_URL (see .env.example).");
  // This run wipes the database: refuse anything that is not an e2e database.
  if (!new URL(ownerUrl).pathname.endsWith("_e2e"))
    throw new Error("E2E tests must use a database whose name ends in _e2e.");

  await runMigrations(ownerUrl);
  const sql = postgres(ownerUrl, { max: 1, onnotice: () => {} });
  const tables = await sql<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  await sql.unsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  rmSync(".e2e-storage", { recursive: true, force: true });

  // A fresh owner with a random password for this run only.
  const email = "owner@e2e.test";
  const password = `e2e-${randomBytes(18).toString("base64url")}`;
  await sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${await hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 })})`;
  await sql.end();
  mkdirSync("playwright/.auth", { recursive: true });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify({ email, password }));

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.context().storageState({ path: "playwright/.auth/admin.json" });
});
