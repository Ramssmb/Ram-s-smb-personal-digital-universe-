import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env")) process.loadEnvFile(".env");

const PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against the production build (`next start`) and their
 * own database (E2E_DATABASE_URL, wiped at the start of every run).
 *
 *   setup  → migrate, reset, create the owner, sign in through the UI
 *   admin  → real CMS workflows (desktop)
 *   public → every public page at phone, tablet and desktop sizes, both themes
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: E2E_BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "admin",
      // admin.spec.ts runs first (alphabetical), then admin.workflows.spec.ts.
      testMatch: /admin(\.workflows)?\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "playwright/.auth/admin.json",
      },
    },
    {
      name: "public-desktop",
      testMatch: /public\.spec\.ts/,
      dependencies: ["admin"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "public-tablet",
      testMatch: /public\.spec\.ts/,
      dependencies: ["admin"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "public-phone",
      testMatch: /public\.spec\.ts/,
      dependencies: ["admin"],
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: `${E2E_BASE_URL}/api/v1/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      SITE_URL: E2E_BASE_URL,
      APP_SECRET: process.env.APP_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-0123",
      STORAGE_DIR: "./.e2e-storage",
      TRUST_PROXY_HOPS: "0",
      LOG_LEVEL: "warn",
    },
  },
});
