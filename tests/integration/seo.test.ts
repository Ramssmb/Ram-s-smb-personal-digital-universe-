import { GET as feedRoute } from "@/app/journal/feed.xml/route";
import sitemap from "@/app/sitemap";

import { ownerSql, resetDatabase } from "../support/integration";

beforeEach(async () => {
  await resetDatabase();
});

const paths = async () => (await sitemap()).map((entry) => new URL(entry.url).pathname);

describe("sitemap", () => {
  it("lists only the home and contact pages while nothing is published", async () => {
    expect(await paths()).toEqual(["/", "/contact"]);
  });

  it("adds a section once it has published, public content, with its last change", async () => {
    await ownerSql`INSERT INTO skills (name, slug, status) VALUES ('Draft skill', 'draft-skill', 'draft')`;
    await ownerSql`INSERT INTO skills (name, slug, status, visibility)
      VALUES ('Private skill', 'private-skill', 'published', 'private')`;
    expect(await paths()).not.toContain("/skills");

    await ownerSql`INSERT INTO skills (name, slug, status) VALUES ('SQL', 'sql', 'published')`;
    const entries = await sitemap();
    const skills = entries.find((e) => e.url.endsWith("/skills"));
    expect(skills?.lastModified).toBeInstanceOf(Date);
    expect(await paths()).not.toContain("/experience");
  });

  it("leaves out the contact page when the form is off and no email is offered", async () => {
    await ownerSql`INSERT INTO site_settings (id, contact_enabled) VALUES (1, false)
      ON CONFLICT (id) DO UPDATE SET contact_enabled = false`;
    expect(await paths()).toEqual(["/"]);
  });
});

describe("RSS feed", () => {
  it("describes every entry, using the first written section when there is no summary", async () => {
    await ownerSql`INSERT INTO journal_entries (slug, entry_date, title, learned_md, status)
      VALUES ('indexes', '2026-11-01', 'Indexes', 'B-tree **pages** and fan-out.', 'published')`;
    const xml = await (await feedRoute()).text();
    expect(xml).toContain("<description>B-tree pages and fan-out.</description>");
    expect(xml).toMatch(/<lastBuildDate>[^<]+GMT<\/lastBuildDate>/);
  });
});
