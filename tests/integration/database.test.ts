import postgres from "postgres";

import { GET as health } from "@/app/api/v1/health/route";
import { getSettingsRow } from "@/server/content/singletons";
import { databaseReachable } from "@/server/services/health";

import { testDatabaseUrls } from "../support/db-urls";
import { ownerSql, resetDatabase } from "../support/integration";

const asApp = postgres(testDatabaseUrls().app, { max: 1, onnotice: () => {} });

beforeEach(resetDatabase);
afterAll(async () => {
  await asApp.end();
});

describe("migrations", () => {
  it("create the shared enums", async () => {
    const rows = await asApp<
      { typname: string }[]
    >`SELECT typname FROM pg_type WHERE typtype = 'e'`;
    expect(rows.map((r) => r.typname)).toEqual(
      expect.arrayContaining([
        "content_status",
        "visibility",
        "learning_status",
        "category_scope",
        "link_kind",
      ]),
    );
  });

  it("create generated full-text search columns", async () => {
    await ownerSql`INSERT INTO projects (slug, title, summary) VALUES ('p', 'Distributed cache', 'Fast lookups')`;
    const [row] = await asApp<{ hit: boolean }[]>`
      SELECT search @@ websearch_to_tsquery('english', 'caching') AS hit FROM projects`;
    expect(row?.hit).toBe(true);
  });

  it("enforce constraints", async () => {
    await expect(ownerSql`INSERT INTO site_settings (id) VALUES (2)`).rejects.toThrow(
      /site_settings_singleton/,
    );
    await expect(
      ownerSql`INSERT INTO site_settings (id, title_template) VALUES (1, 'no placeholder')`,
    ).rejects.toThrow(/site_settings_title_template/);
    await expect(
      ownerSql`INSERT INTO users (email, password_hash) VALUES ('Upper@Example.test', 'x')`,
    ).rejects.toThrow(/users_email_lowercase/);
    await expect(
      ownerSql`INSERT INTO projects (slug, title, started_on, completed_on) VALUES ('p', 'P', '2026-05-01', '2026-01-01')`,
    ).rejects.toThrow(/projects_dates/);
    await expect(
      ownerSql`INSERT INTO media_assets (storage_key, kind, mime_type, byte_size, sha256, original_filename) VALUES ('k', 'script', 'x', 1, 'x', 'x')`,
    ).rejects.toThrow(/media_kind/);
  });

  it("keep join rows consistent with their owners", async () => {
    const [project] = await ownerSql<
      { id: string }[]
    >`INSERT INTO projects (slug, title) VALUES ('p', 'P') RETURNING id`;
    const [skill] = await ownerSql<
      { id: string }[]
    >`INSERT INTO skills (slug, name) VALUES ('s', 'S') RETURNING id`;
    await ownerSql`INSERT INTO project_skills (project_id, skill_id) VALUES (${project!.id}, ${skill!.id})`;
    await ownerSql`DELETE FROM projects WHERE id = ${project!.id}`;
    const [count] = await ownerSql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_skills`;
    expect(count?.n).toBe(0);
  });
});

describe("runtime role (least privilege)", () => {
  it("can read and write rows", async () => {
    await asApp`INSERT INTO site_settings (id, site_name) VALUES (1, 'Test site')`;
    await asApp`UPDATE site_settings SET site_name = 'Renamed' WHERE id = 1`;
    const [row] = await asApp<{ site_name: string }[]>`SELECT site_name FROM site_settings`;
    expect(row?.site_name).toBe("Renamed");
  });

  it("cannot create, alter, drop or truncate tables", async () => {
    await expect(asApp`CREATE TABLE must_fail (id int)`).rejects.toThrow(/permission denied/);
    await expect(asApp`ALTER TABLE users ADD COLUMN x int`).rejects.toThrow(/must be owner/);
    await expect(asApp`DROP TABLE users`).rejects.toThrow(/must be owner/);
    await expect(asApp`TRUNCATE users`).rejects.toThrow(/permission denied/);
  });

  it("cannot read the migration history", async () => {
    await expect(asApp`SELECT * FROM drizzle.__drizzle_migrations`).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("settings and health", () => {
  it("returns neutral defaults before anything is saved", async () => {
    expect(await getSettingsRow()).toMatchObject({
      siteName: null,
      titleTemplate: "%s",
      contactEnabled: true,
      publicEmail: null,
    });
  });

  it("reports ok when the database answers", async () => {
    expect(await databaseReachable()).toBe(true);
    const response = await health(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
