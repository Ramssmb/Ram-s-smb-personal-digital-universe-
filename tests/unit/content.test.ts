import { COLLECTIONS, COLLECTION_KEYS, isCollectionKey } from "@/lib/content/collections";
import { buildSchema, slugify } from "@/lib/content/fields";
import { PROFILE_FIELDS, SETTINGS_FIELDS } from "@/lib/content/singletons";
import { formatDate, formatMonthKey, formatRange } from "@/lib/format";

describe("slugify", () => {
  it.each([
    ["Hello World", "hello-world"],
    ["  C++ & Rust: a comparison!  ", "c-rust-a-comparison"],
    ["Café déjà vu", "cafe-deja-vu"],
    ["---", ""],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("caps the length without a trailing hyphen", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("collection schemas", () => {
  it("defines a schema for every collection", () => {
    for (const key of COLLECTION_KEYS) {
      expect(() => buildSchema(COLLECTIONS[key].fields)).not.toThrow();
      expect(COLLECTIONS[key].fields.some((f) => f.name === COLLECTIONS[key].titleField)).toBe(
        true,
      );
    }
  });

  it("recognises collection keys", () => {
    expect(isCollectionKey("projects")).toBe(true);
    expect(isCollectionKey("users")).toBe(false);
    expect(isCollectionKey("__proto__")).toBe(false);
  });

  const projectSchema = buildSchema(COLLECTIONS.projects.fields);

  it("accepts a minimal project and fills defaults", () => {
    const parsed = projectSchema.parse({ title: "Site", projectStatus: "planned" });
    expect(parsed).toMatchObject({
      title: "Site",
      summary: "",
      features: [],
      skillIds: [],
      mediaIds: [],
    });
  });

  it("requires required fields", () => {
    const result = projectSchema.safeParse({ title: "  ", projectStatus: "planned" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields so nothing unexpected reaches the database", () => {
    expect(
      projectSchema.safeParse({ title: "Site", projectStatus: "planned", status: "published" })
        .success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({ title: "Site", projectStatus: "planned", id: "x" }).success,
    ).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "ftp://example.test",
    "https://user:pw@example.test",
  ])("rejects unsafe URL %s", (url) => {
    expect(
      projectSchema.safeParse({ title: "Site", projectStatus: "planned", repoUrl: url }).success,
    ).toBe(false);
  });

  it("turns blank optional values into null", () => {
    const parsed = projectSchema.parse({
      title: "Site",
      projectStatus: "planned",
      repoUrl: "",
      startedOn: "",
    });
    expect(parsed.repoUrl).toBeNull();
    expect(parsed.startedOn).toBeNull();
  });

  it("validates dates and enum values", () => {
    expect(
      projectSchema.safeParse({ title: "S", projectStatus: "planned", startedOn: "2026-02-28" })
        .success,
    ).toBe(true);
    expect(
      projectSchema.safeParse({ title: "S", projectStatus: "planned", startedOn: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({ title: "S", projectStatus: "planned", startedOn: "31/01/2026" })
        .success,
    ).toBe(false);
    expect(projectSchema.safeParse({ title: "S", projectStatus: "shipped" }).success).toBe(false);
  });

  it("validates slugs", () => {
    expect(
      projectSchema.safeParse({ title: "S", projectStatus: "planned", slug: "good-slug-2" })
        .success,
    ).toBe(true);
    expect(
      projectSchema.safeParse({ title: "S", projectStatus: "planned", slug: "Bad Slug" }).success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({ title: "S", projectStatus: "planned", slug: "../etc" }).success,
    ).toBe(false);
  });

  it("validates link lists", () => {
    const schema = buildSchema(COLLECTIONS.experience.fields);
    const base = { kind: "internship", role: "Intern", organization: "Org" };
    expect(
      schema.safeParse({ ...base, links: [{ label: "Repo", url: "https://github.com/x" }] })
        .success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...base, links: [{ label: "Repo", url: "javascript:x" }] }).success,
    ).toBe(false);
  });

  it("never assigns a skill level by default", () => {
    const parsed = buildSchema(COLLECTIONS.skills.fields).parse({
      name: "Rust",
      learningStatus: "learning",
    });
    expect(parsed.experienceLevel ?? null).toBeNull();
  });

  it("validates profile and settings fields", () => {
    expect(buildSchema(PROFILE_FIELDS).safeParse({ displayName: "x".repeat(81) }).success).toBe(
      false,
    );
    expect(
      buildSchema(SETTINGS_FIELDS).safeParse({
        titleTemplate: "%s",
        defaultTheme: "dark",
        publicEmail: "not-an-email",
      }).success,
    ).toBe(false);
  });
});

describe("date formatting", () => {
  it("formats calendar dates in UTC", () => {
    expect(formatDate("2026-01-05")).toBe("Jan 5, 2026");
    expect(formatDate("2026-01-05", "month")).toBe("Jan 2026");
    expect(formatMonthKey("2026-11")).toBe("November 2026");
  });

  it("formats ranges", () => {
    expect(formatRange("2025-06-01", "2025-08-31")).toBe("Jun 2025 – Aug 2025");
    expect(formatRange("2025-06-01", null)).toBe("Jun 2025 – Present");
    expect(formatRange(null, null)).toBe("");
  });
});
