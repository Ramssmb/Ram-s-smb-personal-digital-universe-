import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// Runs after admin.spec.ts (same project, serial). Publishes one item of every
// remaining content type so the public checks render real content, and covers
// the remaining editorial actions through the UI.
test.describe.configure({ mode: "serial" });

const field = (page: Page, name: string) => page.getByRole("textbox", { name, exact: true });
const select = (page: Page, name: string) => page.getByRole("combobox", { name, exact: true });

async function createAndPublish(
  page: Page,
  collection: string,
  fill: (page: Page) => Promise<void>,
) {
  await page.goto(`/admin/content/${collection}/new`);
  await fill(page);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It is now visible on the site.")).toBeVisible();
  return page.url().replace(/\?.*$/, "");
}

test("every content type can be created and published from the dashboard", async ({ page }) => {
  await createAndPublish(page, "about-sections", async (p) => {
    await field(p, "Section title").fill("Background");
    await field(p, "Content").fill(
      "I started programming in school and now study computer science.",
    );
  });
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "Background" })).toBeVisible();

  await createAndPublish(page, "education", async (p) => {
    await field(p, "Institution").fill("Example Institute of Technology");
    await field(p, "Degree").fill("B.Tech.");
    await field(p, "Branch / major").fill("Computer Science and Engineering");
    await field(p, "Relevant coursework").fill("Data Structures\nOperating Systems");
  });
  await page.goto("/education");
  await expect(page.getByText("Example Institute of Technology")).toBeVisible();
  await expect(page.getByText("Operating Systems")).toBeVisible();

  await createAndPublish(page, "experience", async (p) => {
    await select(p, "Type").selectOption("internship");
    await field(p, "Role").fill("Backend Intern");
    await field(p, "Organization").fill("Example Labs");
    await p.getByLabel("Start date").fill("2025-06-01");
    await p.getByLabel("End date").fill("2025-08-15");
    await field(p, "Responsibilities").fill("Built REST endpoints\nWrote integration tests");
  });
  await page.goto("/experience");
  await expect(page.getByRole("heading", { name: "Backend Intern" })).toBeVisible();
  await expect(page.getByText("Jun 2025 – Aug 2025")).toBeVisible();

  await createAndPublish(page, "certifications", async (p) => {
    await select(p, "Type").selectOption("course");
    await field(p, "Title").fill("Database Systems");
    await field(p, "Issuing organization").fill("Example University");
    await field(p, "Verification link").fill("https://example.test/verify/123");
  });
  await createAndPublish(page, "achievements", async (p) => {
    await select(p, "Type").selectOption("hackathon");
    await field(p, "Title").fill("Hackathon finalist");
    await field(p, "Organization / event").fill("Campus Hack 2026");
  });
  await page.goto("/achievements");
  await expect(page.getByRole("heading", { name: "Database Systems" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Verify credential/ })).toHaveAttribute(
    "href",
    "https://example.test/verify/123",
  );
  await expect(page.getByRole("heading", { name: "Hackathon finalist" })).toBeVisible();

  await createAndPublish(page, "resources", async (p) => {
    await field(p, "Title").fill("PostgreSQL documentation");
    await field(p, "URL").fill("https://www.postgresql.org/docs/");
    await select(p, "Type").selectOption("documentation");
    await field(p, "Description").fill("The official manual.");
  });
  await page.goto("/resources");
  await expect(page.getByRole("link", { name: /PostgreSQL documentation/ })).toBeVisible();
});

test("previewing a draft shows all of its fields", async ({ page }) => {
  await page.goto("/admin/content/experience/new");
  await select(page, "Type").selectOption("volunteer");
  await field(page, "Role").fill("Workshop mentor");
  await field(page, "Organization").fill("Coding Club");
  await page.getByLabel("Start date").fill("2026-01-10");
  await field(page, "Responsibilities").fill("Ran weekly Python sessions");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  const id = page.url().match(/experience\/([0-9a-f-]{36})/)![1]!;

  await page.goto(`/admin/preview/experience/${id}`);
  await expect(page.getByText(/not visible to visitors/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Workshop mentor" })).toBeVisible();
  await expect(page.getByText("Coding Club")).toBeVisible();
  await expect(page.getByText("Jan 10, 2026")).toBeVisible();
  await expect(page.getByText("Ran weekly Python sessions")).toBeVisible();
  await expect(page.getByText("Volunteering")).toBeVisible();
  // Still a draft: not on the public page.
  await page.goto("/experience");
  await expect(page.getByRole("heading", { name: "Workshop mentor" })).toHaveCount(0);
});

test("unpublish, visibility and permanent delete work through the UI", async ({ page }) => {
  const editUrl = await createAndPublish(page, "resources", async (p) => {
    await field(p, "Title").fill("Temporary resource");
    await select(p, "Type").selectOption("tool");
  });
  const visible = async () => {
    await page.goto("/resources?q=Temporary");
    return page.getByRole("heading", { name: "Temporary resource" }).isVisible();
  };
  expect(await visible()).toBe(true);

  await page.goto(editUrl);
  await select(page, "Visibility").selectOption("private");
  await expect(page.getByText("Not visible to visitors.")).toBeVisible();
  expect(await visible()).toBe(false);

  await page.goto(editUrl);
  await select(page, "Visibility").selectOption("public");
  await expect(page.getByText("Visible to visitors.")).toBeVisible();
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Moved back to draft.")).toBeVisible();
  expect(await visible()).toBe(false);

  await page.goto(editUrl);
  await page.getByRole("button", { name: "Delete permanently" }).click();
  const dialog = page.getByRole("dialog", { name: /Delete this resource/ });
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/resources\?deleted=1/);
  await expect(page.getByText("Deleted.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Temporary resource" })).toHaveCount(0);
  expect((await page.goto(editUrl))?.status()).toBe(404);
});

test("a cover image chosen in the form appears on the public project page", async ({ page }) => {
  const png = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: "#18181b" },
  })
    .png()
    .toBuffer();
  await page.goto("/admin/content/projects");
  await page.getByRole("link", { name: "Uptime Monitor" }).click();
  await page
    .getByRole("group", { name: "Cover image" })
    .getByRole("button", { name: "Choose file" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Choose a file" });
  await dialog.getByLabel(/Alt text/).fill("Uptime dashboard screenshot");
  await dialog
    .getByLabel("Choose a file to upload")
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/projects/uptime-monitor");
  const cover = page.getByRole("img", { name: "Uptime dashboard screenshot" });
  await expect(cover).toBeVisible();
  expect(await cover.getAttribute("srcset")).toContain("960w");
  // Open Graph uses the cover image.
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/media\//);
});

test("private content is not reachable without signing in", async ({ browser, page }) => {
  // A draft project and a private file, created as the owner.
  await page.goto("/admin/content/projects/new");
  await field(page, "Title").fill("Secret draft");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  const id = page.url().match(/projects\/([0-9a-f-]{36})/)![1]!;

  const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const visitor = await anon.newPage();
  expect((await visitor.goto("/projects/secret-draft"))?.status()).toBe(404);
  await visitor.goto(`/admin/preview/projects/${id}`);
  await expect(visitor).toHaveURL(/\/admin\/login/);
  for (const path of [
    `/api/v1/admin/collections/projects/${id}`,
    "/api/v1/admin/media",
    "/api/v1/admin/profile",
  ]) {
    expect((await visitor.request.get(path)).status()).toBe(401);
  }
  const write = await visitor.request.post("/api/v1/admin/collections/projects", {
    data: { title: "x" },
  });
  expect([401, 403]).toContain(write.status());
  await anon.close();
});

test("a journal entry can carry a PDF attachment", async ({ page }) => {
  const pdf = Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\ntrailer\n%%EOF\n");
  await page.goto("/admin/content/journal/new");
  await field(page, "Title").fill("Notes on transactions");
  await field(page, "What I learned (key takeaways)").fill("Isolation levels, explained.");
  await page
    .getByRole("group", { name: "Images and attachments" })
    .getByRole("button", { name: "Add file" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Choose a file" });
  await dialog.getByLabel("Choose a file to upload").setInputFiles({
    name: "isolation-levels.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It is now visible on the site.")).toBeVisible();

  await page.goto("/journal/notes-on-transactions");
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
  const link = page.getByRole("link", { name: /isolation-levels\.pdf/ });
  await expect(link).toHaveAttribute("href", /^\/media\/.+\.pdf$/);
  const response = await page.request.get((await link.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
});

test("an email link can be published on the Links page", async ({ page }) => {
  await page.goto("/admin/content/links/new");
  await field(page, "Label").fill("Email me");
  await field(page, "URL").fill("mailto:hello@example.test?cc=boss@example.test");
  await select(page, "Category").selectOption("email");
  await select(page, "Icon").selectOption("mail");
  await page.getByRole("button", { name: "Create draft" }).click();
  // Extra mailto parameters are refused.
  await expect(field(page, "URL")).toHaveAttribute("aria-invalid", "true");
  await field(page, "URL").fill("mailto:Hello@Example.test");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It is now visible on the site.")).toBeVisible();

  await page.goto("/links");
  const link = page.getByRole("link", { name: /Email me/ });
  await expect(link).toHaveAttribute("href", "mailto:hello@example.test");
  await expect(link).not.toHaveAttribute("target", "_blank");
  await expect(link).toContainText("hello@example.test");
});

test("skill workflow: categorise, publish, update", async ({ page }) => {
  // Categories are always live: no draft or publish step.
  await page.goto("/admin/content/categories/new");
  await select(page, "Used for").selectOption("skill");
  await field(page, "Name").fill("Programming Languages");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Created.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
  await page.goto("/admin/content/categories");
  await expect(page.getByRole("link", { name: "Programming Languages" })).toBeVisible();

  const editUrl = await createAndPublish(page, "skills", async (p) => {
    await field(p, "Skill").fill("TypeScript");
    await select(p, "Category").selectOption({ label: "Programming Languages" });
    await select(p, "Learning status").selectOption("learning");
    await field(p, "Description").fill("Typed JavaScript for larger codebases.");
  });
  await page.goto("/skills");
  const group = page.getByRole("region", { name: "Programming Languages" });
  await expect(group.getByRole("heading", { name: "TypeScript" })).toBeVisible();
  await expect(group.locator("#typescript").getByText("Learning")).toBeVisible();

  await page.goto(editUrl);
  await select(page, "Learning status").selectOption("practicing");
  await field(page, "Description").fill("Used for every project on this site.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/skills");
  const card = page.locator("#typescript");
  await expect(card.getByText("Practicing")).toBeVisible();
  await expect(card.getByText("Used for every project on this site.")).toBeVisible();
});

test("journal workflow: draft → publish → read → archive", async ({ page }) => {
  await page.goto("/admin/content/journal/new");
  await field(page, "Title").fill("Weekly review");
  await field(page, "Topic").fill("Reflection");
  await field(page, "What I learned (key takeaways)").fill("Small daily steps add up.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  const editUrl = page.url().replace(/\?.*$/, "");

  expect((await page.request.get("/journal/weekly-review")).status()).toBe(404);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It is now visible on the site.")).toBeVisible();
  await page.goto("/journal");
  await page.getByRole("link", { name: "Weekly review" }).click();
  await expect(page.getByText("Small daily steps add up.")).toBeVisible();
  await expect(page.getByText("Reflection")).toBeVisible();

  await page.goto(editUrl);
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived.")).toBeVisible();
  expect((await page.request.get("/journal/weekly-review")).status()).toBe(404);
  await page.goto("/journal");
  await expect(page.getByRole("link", { name: "Weekly review" })).toHaveCount(0);
});

test("media: a file can be replaced from the library", async ({ page }) => {
  const red = await sharp({
    create: { width: 800, height: 400, channels: 3, background: "#cc0000" },
  })
    .png()
    .toBuffer();
  await page.goto("/admin/media?q=blue");
  const card = page.getByRole("listitem").filter({ hasText: "blue.png" });
  await card.getByLabel("Replace file").setInputFiles({
    name: "red.png",
    mimeType: "image/png",
    buffer: red,
  });
  // The card now shows the new file name, so look for the confirmation page-wide.
  await expect(page.getByText("File replaced everywhere it is used.")).toBeVisible();
  await page.goto("/admin/media?q=red");
  const replaced = page.getByRole("listitem").filter({ hasText: "red.png" });
  await expect(replaced).toBeVisible();
  // Same item: its alt text survived the replacement.
  await expect(replaced.getByLabel("Alt text")).toHaveValue("Solid blue test image");
  await expect(replaced.getByText("800×400")).toBeVisible();
});

test("a certification linked to a skill appears on the skills page", async ({ page }) => {
  await page.goto("/admin/content/certifications/new");
  await select(page, "Type").selectOption("certification");
  await field(page, "Title").fill("PostgreSQL Associate");
  await field(page, "Issuing organization").fill("Example Academy");
  const skills = page.getByRole("group", { name: "Related skills" });
  await skills.getByRole("textbox", { name: "Filter related skills" }).fill("Postgre");
  await skills.getByRole("checkbox", { name: "PostgreSQL" }).check();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It is now visible on the site.")).toBeVisible();

  await page.goto("/skills");
  const card = page.locator("#postgresql");
  await expect(card.getByText("Certified through")).toBeVisible();
  await card.getByRole("link", { name: "PostgreSQL Associate" }).click();
  await expect(page).toHaveURL(/\/achievements#c-/);
  await expect(page.getByRole("heading", { name: "PostgreSQL Associate" })).toBeVisible();
});

const ADMIN_PAGES = [
  "/admin",
  "/admin/profile",
  "/admin/content/projects",
  "/admin/content/projects/new",
  "/admin/content/journal",
  "/admin/media",
  "/admin/messages",
  "/admin/settings",
  "/admin/account",
  "/admin/design",
];

async function expectNoAxeViolations(page: Page) {
  // Infinite animations (loading skeletons, spinners) never finish; wait for the rest.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

test("dashboard pages pass axe checks in both themes", async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  for (const theme of ["light", "dark"] as const) {
    await context.addCookies([{ name: "theme", value: theme, url: baseURL! }]);
    for (const path of ADMIN_PAGES) {
      await test.step(`${path} (${theme})`, async () => {
        expect((await page.goto(path))?.status()).toBe(200);
        await expectNoAxeViolations(page);
      });
    }
  }
});

test("the dashboard works on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of [
    "/admin",
    "/admin/content/projects",
    "/admin/content/journal/new",
    "/admin/media",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBe(0);
  }
  await page.goto("/admin");
  await page.getByRole("button", { name: "Open dashboard menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Skills" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Skills" })).toBeVisible();
});

test("the sign-in page is accessible", async ({ browser }) => {
  const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await anon.newPage();
  await page.goto("/admin/login");
  await expectNoAxeViolations(page);
  await anon.close();
});
