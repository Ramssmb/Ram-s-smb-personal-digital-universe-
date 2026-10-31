import {
  GET as collectionGet,
  POST as collectionPost,
} from "@/app/api/v1/admin/collections/[collection]/route";
import {
  DELETE as itemDelete,
  GET as itemGet,
  PATCH as itemPatch,
} from "@/app/api/v1/admin/collections/[collection]/[id]/route";
import { POST as itemAction } from "@/app/api/v1/admin/collections/[collection]/[id]/[action]/route";
import { POST as reorder } from "@/app/api/v1/admin/collections/[collection]/reorder/route";
import { PUT as profilePut } from "@/app/api/v1/admin/profile/route";
import { PUT as settingsPut } from "@/app/api/v1/admin/settings/route";
import { PUT as seoPut } from "@/app/api/v1/admin/seo/[key]/route";
import {
  getIdentity,
  getJournalEntry,
  getProject,
  listAboutSections,
  listAchievements,
  listCertifications,
  listEducation,
  listExperience,
  listJournal,
  listLinks,
  listProjects,
  listResources,
  listSkills,
  searchSite,
  sitemapEntries,
} from "@/server/content/public";

import {
  createAdmin,
  ownerSql,
  request,
  resetDatabase,
  routeContext,
  type Admin,
} from "../support/integration";

let admin: Admin;

beforeEach(async () => {
  await resetDatabase();
  admin = await createAdmin();
});

type Item = Record<string, unknown> & { id: string; updatedAt: string; status: string };

async function create(collection: string, data: Record<string, unknown>): Promise<Item> {
  const response = await collectionPost(
    request("POST", "/x", { cookie: admin.cookie, json: data }),
    routeContext({ collection }),
  );
  const body = await response.json();
  if (response.status !== 201)
    throw new Error(`create ${collection} failed: ${JSON.stringify(body)}`);
  return body.item;
}

async function act(collection: string, id: string, action: string, json?: unknown) {
  return itemAction(
    request("POST", "/x", { cookie: admin.cookie, json }),
    routeContext({ collection, id, action }),
  );
}

async function patch(collection: string, item: Item, data: Record<string, unknown>) {
  return itemPatch(
    request("PATCH", "/x", {
      cookie: admin.cookie,
      json: { data, updatedAt: new Date(item.updatedAt).toISOString() },
    }),
    routeContext({ collection, id: item.id }),
  );
}

describe("project lifecycle: draft → publish → edit → archive", () => {
  it("is visible publicly only while published and public", async () => {
    const project = await create("projects", {
      title: "Distributed Cache",
      summary: "A cache.",
      projectStatus: "in_progress",
    });
    expect(project.status).toBe("draft");
    expect(project.slug).toBe("distributed-cache");

    // Draft: not public anywhere.
    expect(await getProject("distributed-cache")).toBeNull();
    expect((await listProjects()).items).toHaveLength(0);
    expect(await searchSite("cache")).toHaveLength(0);
    expect((await sitemapEntries()).projects).toHaveLength(0);

    // Published: public.
    const published = await act("projects", project.id, "publish");
    expect(published.status).toBe(200);
    const publishedItem = (await published.json()).item;
    expect(publishedItem.publishedAt).toBeTruthy();
    expect((await getProject("distributed-cache"))?.title).toBe("Distributed Cache");
    expect((await listProjects()).items.map((p) => p.title)).toEqual(["Distributed Cache"]);
    expect((await searchSite("cache")).map((r) => r.url)).toEqual(["/projects/distributed-cache"]);
    expect((await sitemapEntries()).projects).toHaveLength(1);

    // Edited: changes appear publicly.
    const edited = await patch("projects", publishedItem, {
      title: "Distributed Cache v2",
      slug: "distributed-cache",
      summary: "Faster.",
      projectStatus: "completed",
    });
    expect(edited.status).toBe(200);
    expect((await getProject("distributed-cache"))?.summary).toBe("Faster.");

    // Private: hidden although still published.
    const editedItem = (await edited.json()).item;
    await act("projects", editedItem.id, "flags", { visibility: "private" });
    expect(await getProject("distributed-cache")).toBeNull();
    await act("projects", editedItem.id, "flags", { visibility: "public" });
    expect(await getProject("distributed-cache")).not.toBeNull();

    // Archived: gone publicly.
    expect((await act("projects", project.id, "archive")).status).toBe(200);
    expect(await getProject("distributed-cache")).toBeNull();
    expect((await listProjects()).items).toHaveLength(0);
  });

  it("refuses to publish an incomplete project", async () => {
    const project = await create("projects", { title: "Untitled idea", projectStatus: "planned" });
    const response = await act("projects", project.id, "publish");
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.summary).toBeTruthy();
    expect(
      (
        await itemGet(
          request("GET", "/x", { cookie: admin.cookie }),
          routeContext({ collection: "projects", id: project.id }),
        ).then((r) => r.json())
      ).item.status,
    ).toBe("draft");
  });

  it("detects concurrent edits", async () => {
    const project = await create("projects", {
      title: "P",
      summary: "S",
      projectStatus: "planned",
    });
    expect(
      (await patch("projects", project, { title: "First edit", projectStatus: "planned" })).status,
    ).toBe(200);
    const stale = await patch("projects", project, {
      title: "Stale edit",
      projectStatus: "planned",
    });
    expect(stale.status).toBe(409);
  });

  it("makes slugs unique automatically and rejects a duplicate chosen slug", async () => {
    const a = await create("projects", { title: "Same Name", projectStatus: "planned" });
    const b = await create("projects", { title: "Same Name", projectStatus: "planned" });
    expect([a.slug, b.slug]).toEqual(["same-name", "same-name-2"]);
    const clash = await collectionPost(
      request("POST", "/x", {
        cookie: admin.cookie,
        json: { title: "Other", slug: "same-name", projectStatus: "planned" },
      }),
      routeContext({ collection: "projects" }),
    );
    expect(clash.status).toBe(409);
  });

  it("links technologies and tags, and shows only published skills publicly", async () => {
    const skill = await create("skills", { name: "PostgreSQL", learningStatus: "practicing" });
    const draftSkill = await create("skills", { name: "Kubernetes", learningStatus: "planned" });
    const tag = await create("tags", { name: "Databases" });
    await act("skills", skill.id, "publish");
    const project = await create("projects", {
      title: "Tracker",
      summary: "Tracks things.",
      projectStatus: "completed",
      skillIds: [skill.id, draftSkill.id],
      tagIds: [tag.id],
    });
    await act("projects", project.id, "publish");
    const detail = await getProject("tracker");
    expect(detail?.skills.map((s) => s.name)).toEqual(["PostgreSQL"]);
    expect(detail?.tags.map((t) => t.name)).toEqual(["Databases"]);
  });

  it("rejects references to missing or wrong-type items", async () => {
    const resourceCategory = await create("categories", { scope: "resource", name: "Books" });
    const wrongScope = await collectionPost(
      request("POST", "/x", {
        cookie: admin.cookie,
        json: { title: "P", projectStatus: "planned", categoryId: resourceCategory.id },
      }),
      routeContext({ collection: "projects" }),
    );
    expect(wrongScope.status).toBe(400);
    const missing = await collectionPost(
      request("POST", "/x", {
        cookie: admin.cookie,
        json: {
          title: "P",
          projectStatus: "planned",
          skillIds: ["00000000-0000-4000-8000-000000000001"],
        },
      }),
      routeContext({ collection: "projects" }),
    );
    expect(missing.status).toBe(400);
  });

  it("deletes permanently", async () => {
    const project = await create("projects", { title: "Gone", projectStatus: "planned" });
    const response = await itemDelete(
      request("DELETE", "/x", { cookie: admin.cookie }),
      routeContext({ collection: "projects", id: project.id }),
    );
    expect(response.status).toBe(204);
    const after = await itemGet(
      request("GET", "/x", { cookie: admin.cookie }),
      routeContext({ collection: "projects", id: project.id }),
    );
    expect(after.status).toBe(404);
  });

  it("returns 404 for unknown collections and malformed ids", async () => {
    expect(
      (
        await collectionGet(
          request("GET", "/x", { cookie: admin.cookie }),
          routeContext({ collection: "users" }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await itemGet(
          request("GET", "/x", { cookie: admin.cookie }),
          routeContext({ collection: "projects", id: "'; DROP TABLE users;--" }),
        )
      ).status,
    ).toBe(404);
  });

  it("lists with search, status filter and pagination", async () => {
    for (const title of ["Alpha", "Beta", "Gamma"])
      await create("projects", { title, projectStatus: "planned", summary: "x" });
    const list = await collectionGet(
      request("GET", "/x?q=et&pageSize=2", { cookie: admin.cookie }),
      routeContext({ collection: "projects" }),
    );
    const body = await list.json();
    expect(body.items.map((i: Item) => i.title)).toEqual(["Beta"]);
    const page = await (
      await collectionGet(
        request("GET", "/x?pageSize=2&page=2", { cookie: admin.cookie }),
        routeContext({ collection: "projects" }),
      )
    ).json();
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(1);
    // LIKE wildcards are matched literally.
    const literal = await (
      await collectionGet(
        request("GET", "/x?q=%25", { cookie: admin.cookie }),
        routeContext({ collection: "projects" }),
      )
    ).json();
    expect(literal.items).toHaveLength(0);
  });

  it("reorders manually sorted collections", async () => {
    const a = await create("links", {
      label: "A",
      url: "https://a.test",
      kind: "profile",
      icon: "link",
    });
    const b = await create("links", {
      label: "B",
      url: "https://b.test",
      kind: "profile",
      icon: "link",
    });
    for (const link of [a, b]) await act("links", link.id, "publish");
    expect((await listLinks()).map((l) => l.label)).toEqual(["A", "B"]);
    const response = await reorder(
      request("POST", "/x", { cookie: admin.cookie, json: { ids: [b.id, a.id] } }),
      routeContext({ collection: "links" }),
    );
    expect(response.status).toBe(204);
    expect((await listLinks()).map((l) => l.label)).toEqual(["B", "A"]);
  });
});

describe("every publishable section follows the visibility rule", () => {
  const cases: [string, Record<string, unknown>, () => Promise<unknown[]>][] = [
    [
      "about-sections",
      { title: "Background", bodyMd: "Grew up coding." },
      () => listAboutSections(),
    ],
    ["education", { institution: "Some University", degree: "B.Tech." }, () => listEducation()],
    ["skills", { name: "TypeScript", learningStatus: "practicing" }, () => listSkills()],
    [
      "experience",
      { kind: "internship", role: "Intern", organization: "Org" },
      () => listExperience(),
    ],
    [
      "certifications",
      { kind: "course", title: "Databases", issuer: "Uni" },
      () => listCertifications(),
    ],
    ["achievements", { kind: "hackathon", title: "Finalist" }, () => listAchievements()],
    [
      "journal",
      { entryDate: "2026-11-01", title: "Day one", learnedMd: "Indexes." },
      async () => (await listJournal()).items,
    ],
    [
      "resources",
      { title: "Docs", kind: "documentation", url: "https://example.test/docs" },
      async () => (await listResources()).items,
    ],
    [
      "links",
      { label: "GitHub", url: "https://github.com/example", kind: "coding", icon: "github" },
      () => listLinks(),
    ],
  ];

  it.each(cases)(
    "%s: draft hidden, published shown, private hidden, archived hidden",
    async (collection, data, list) => {
      const item = await create(collection, data);
      expect(await list()).toHaveLength(0);
      expect((await act(collection, item.id, "publish")).status).toBe(200);
      expect(await list()).toHaveLength(1);
      await act(collection, item.id, "flags", { visibility: "private" });
      expect(await list()).toHaveLength(0);
      await act(collection, item.id, "flags", { visibility: "public" });
      await act(collection, item.id, "archive");
      expect(await list()).toHaveLength(0);
    },
  );

  it("journal entries need content before publishing and get readable slugs", async () => {
    const empty = await create("journal", { entryDate: "2026-11-02", title: "Empty day" });
    expect((await act("journal", empty.id, "publish")).status).toBe(400);
    const entry = await create("journal", {
      entryDate: "2026-11-02",
      title: "Learned about B-trees",
      learnedMd: "Pages and fan-out.",
    });
    expect(entry.slug).toBe("learned-about-b-trees");
    await act("journal", entry.id, "publish");
    expect((await getJournalEntry("learned-about-b-trees"))?.learnedMd).toBe("Pages and fan-out.");
    expect(await getJournalEntry("empty-day")).toBeNull();
  });

  it("taxonomies cannot be published (they are always live)", async () => {
    const tag = await create("tags", { name: "Go" });
    expect((await act("tags", tag.id, "publish")).status).toBe(400);
  });
});

describe("profile, settings and SEO", () => {
  it("saves the profile and uses it for the site identity", async () => {
    const response = await profilePut(
      request("PUT", "/x", {
        cookie: admin.cookie,
        json: { displayName: "Test Person", headline: "Student", interests: ["Backend"] },
      }),
      routeContext(),
    );
    expect(response.status).toBe(200);
    const identity = await getIdentity();
    expect(identity.siteName).toBe("Test Person");
    expect(identity.profile.interests).toEqual(["Backend"]);
  });

  it("validates settings", async () => {
    const bad = await settingsPut(
      request("PUT", "/x", {
        cookie: admin.cookie,
        json: { titleTemplate: "no placeholder", defaultTheme: "dark" },
      }),
      routeContext(),
    );
    expect(bad.status).toBe(400);
    const good = await settingsPut(
      request("PUT", "/x", {
        cookie: admin.cookie,
        json: {
          titleTemplate: "%s · Site",
          defaultTheme: "dark",
          siteName: "Site",
          contactEnabled: false,
        },
      }),
      routeContext(),
    );
    expect(good.status).toBe(200);
    expect((await getIdentity()).settings.contactEnabled).toBe(false);
  });

  it("stores SEO overrides for known pages only", async () => {
    expect(
      (
        await seoPut(
          request("PUT", "/x", {
            cookie: admin.cookie,
            json: { title: "Work", description: "Things I built." },
          }),
          routeContext({ key: "projects" }),
        )
      ).status,
    ).toBe(204);
    expect((await getIdentity()).seo.projects.title).toBe("Work");
    expect(
      (
        await seoPut(
          request("PUT", "/x", { cookie: admin.cookie, json: { title: "x" } }),
          routeContext({ key: "admin" }),
        )
      ).status,
    ).toBe(404);
  });

  it("records an audit trail of changes", async () => {
    await create("tags", { name: "Audit" });
    const rows = await ownerSql<
      { action: string; entity_type: string }[]
    >`SELECT action, entity_type FROM audit_log WHERE action = 'create'`;
    expect(rows).toEqual([{ action: "create", entity_type: "tags" }]);
  });
});
