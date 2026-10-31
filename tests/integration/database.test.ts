import postgres from "postgres";

import { getSiteSettings, DEFAULT_SITE_SETTINGS } from "@/server/services/site-settings";
import { databaseReachable } from "@/server/services/health";
import { GET as health } from "@/app/api/v1/health/route";

import { testDatabaseUrls } from "../support/db-urls";

const urls = testDatabaseUrls();
// Direct connections as each role, to test what the database itself allows.
const asApp = postgres(urls.app, { max: 1, onnotice: () => {} });
const asOwner = postgres(urls.owner, { max: 1, onnotice: () => {} });

afterAll(async () => {
  await asApp.end();
  await asOwner.end();
});

afterEach(async () => {
  await asOwner`DELETE FROM site_settings`;
});

describe("migrations", () => {
  it("create the shared enums", async () => {
    const rows = await asApp<{ typname: string }[]>`
      SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname`;
    expect(rows.map((r) => r.typname)).toEqual(
      expect.arrayContaining([
        "content_status",
        "visibility",
        "learning_status",
        "theme_preference",
      ]),
    );
  });

  it("enforce the site_settings constraints", async () => {
    await expect(asOwner`INSERT INTO site_settings (id) VALUES (2)`).rejects.toThrow(
      /site_settings_singleton/,
    );
    await expect(
      asOwner`INSERT INTO site_settings (id, title_template) VALUES (1, 'no placeholder')`,
    ).rejects.toThrow(/site_settings_title_template/);
    await expect(
      asOwner`INSERT INTO site_settings (id, site_name) VALUES (1, ${"x".repeat(81)})`,
    ).rejects.toThrow(/site_settings_site_name_length/);
  });
});

describe("runtime role (least privilege)", () => {
  it("can read and write rows", async () => {
    await asApp`INSERT INTO site_settings (id, site_name) VALUES (1, 'Test site')`;
    await asApp`UPDATE site_settings SET site_name = 'Renamed' WHERE id = 1`;
    const [row] = await asApp<{ site_name: string }[]>`SELECT site_name FROM site_settings`;
    expect(row?.site_name).toBe("Renamed");
  });

  it("cannot create, alter or drop tables", async () => {
    await expect(asApp`CREATE TABLE must_fail (id int)`).rejects.toThrow(/permission denied/);
    await expect(asApp`ALTER TABLE site_settings ADD COLUMN x int`).rejects.toThrow(
      /must be owner/,
    );
    await expect(asApp`DROP TABLE site_settings`).rejects.toThrow(/must be owner/);
  });

  it("cannot read or change the migration history", async () => {
    await expect(asApp`SELECT * FROM drizzle.__drizzle_migrations`).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("site settings service", () => {
  it("returns neutral defaults before anything is saved", async () => {
    expect(await getSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });

  it("returns saved settings", async () => {
    await asOwner`
      INSERT INTO site_settings (id, site_name, title_template, default_theme)
      VALUES (1, 'Test site', '%s · Test site', 'dark')`;
    expect(await getSiteSettings()).toMatchObject({
      siteName: "Test site",
      titleTemplate: "%s · Test site",
      defaultTheme: "dark",
    });
  });
});

describe("health endpoint", () => {
  it("reports ok when the database answers", async () => {
    expect(await databaseReachable()).toBe(true);
    const response = await health(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
