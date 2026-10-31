import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

test.describe.configure({ mode: "serial" });

async function createDraft(page: Page, collection: string, fill: (page: Page) => Promise<void>) {
  await page.goto(`/admin/content/${collection}/new`);
  await fill(page);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  return page.url();
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It is now visible on the site.")).toBeVisible();
}

test("anonymous visitors cannot open the dashboard", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  for (const path of ["/admin", "/admin/content/projects", "/admin/media", "/admin/design"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login/);
  }
  const api = await page.request.get("/api/v1/admin/collections/projects");
  expect(api.status()).toBe(401);
  await context.close();
});

test("a wrong password shows a generic error", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("owner@e2e.test");
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();
  await context.close();
});

test("profile: editing the introduction updates the home page", async ({ page }) => {
  await page.goto("/admin/profile");
  await page.getByLabel("Display name").fill("E2E Person");
  await page
    .getByLabel("Professional headline")
    .fill("Computer Science student building backend systems");
  await page.getByLabel("Short biography").fill("I write a daily learning journal.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "E2E Person" })).toBeVisible();
  await expect(page.getByText("Computer Science student building backend systems")).toBeVisible();
});

test("project: draft → preview → publish → edit → archive", async ({ page }) => {
  const editUrl = await createDraft(page, "projects", async (p) => {
    await p.getByRole("textbox", { name: "Title", exact: true }).fill("Uptime Monitor");
    await p.getByLabel("Short description").fill("Checks HTTP endpoints and reports incidents.");
    await p.getByLabel("Problem statement").fill("Teams learn about outages from users.");
  });

  // Drafts are not public.
  const draft = await page.request.get("/projects/uptime-monitor");
  expect(draft.status()).toBe(404);

  // Preview renders the draft for the owner only.
  await page.goto(
    editUrl.replace(/\/admin\/content\/projects\/([^?]+).*/, "/admin/preview/projects/$1"),
  );
  await expect(page.getByText(/not visible to visitors/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Uptime Monitor" })).toBeVisible();

  await page.goto(editUrl);
  await publish(page);

  await page.goto("/projects");
  await expect(page.getByRole("link", { name: "Uptime Monitor" })).toBeVisible();
  await page.getByRole("link", { name: "Uptime Monitor" }).click();
  await expect(page).toHaveURL(/\/projects\/uptime-monitor$/);
  await expect(page.getByRole("heading", { name: "The problem" })).toBeVisible();

  // Edit: the change appears publicly.
  await page.goto(editUrl);
  await page
    .getByLabel("Short description")
    .fill("Checks endpoints, tracks SLOs and sends alerts.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.goto("/projects/uptime-monitor");
  await expect(
    page.getByText("Checks endpoints, tracks SLOs and sends alerts.").first(),
  ).toBeVisible();

  // Featured: shown on the home page.
  await page.goto(editUrl);
  await page.getByRole("switch", { name: "Featured" }).click();
  await expect(page.getByRole("switch", { name: "Featured" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Featured projects" })).toBeVisible();

  // Archive: gone publicly.
  await page.goto(editUrl);
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived.")).toBeVisible();
  expect((await page.request.get("/projects/uptime-monitor")).status()).toBe(404);

  // Publish again for the public checks that follow.
  await publish(page);
});

test("publishing an incomplete item shows what is missing", async ({ page }) => {
  await createDraft(page, "projects", async (p) => {
    await p.getByRole("textbox", { name: "Title", exact: true }).fill("Half-finished idea");
  });
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Complete the highlighted fields before publishing.")).toBeVisible();
  await expect(page.getByLabel("Short description")).toHaveAttribute("aria-invalid", "true");
});

test("journal: today's entry is published and searchable", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "New journal entry" }).click();
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Learned how B-tree indexes work");
  await page.getByLabel("Topic").fill("Databases");
  await page
    .getByLabel("What I learned (key takeaways)")
    .fill("Pages, fan-out and why **range scans** are cheap.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft created.")).toBeVisible();
  await publish(page);

  await page.goto("/journal");
  await page.getByRole("link", { name: "Learned how B-tree indexes work" }).click();
  await expect(page.locator("strong", { hasText: "range scans" })).toBeVisible();

  await page.goto("/search?q=b-tree");
  await expect(page.getByRole("link", { name: "Learned how B-tree indexes work" })).toBeVisible();
});

test("skills, education and links appear after publishing", async ({ page }) => {
  await createDraft(page, "skills", async (p) => {
    await p.getByRole("textbox", { name: "Skill", exact: true }).fill("PostgreSQL");
    await p.getByRole("combobox", { name: "Learning status" }).selectOption("practicing");
  });
  await publish(page);
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: "PostgreSQL" })).toBeVisible();
  await expect(page.getByText("Practicing")).toBeVisible();

  await createDraft(page, "links", async (p) => {
    await p.getByLabel("Label").fill("GitHub");
    await p.getByRole("textbox", { name: "URL", exact: true }).fill("https://github.com/example");
    await p.getByRole("combobox", { name: "Category" }).selectOption("coding");
    await p.getByRole("combobox", { name: "Icon" }).selectOption("github");
  });
  await publish(page);
  await page.goto("/links");
  await expect(page.getByRole("link", { name: /GitHub/ })).toHaveAttribute(
    "href",
    "https://github.com/example",
  );
});

test("media: an uploaded image appears in the library", async ({ page }) => {
  const png = await sharp({
    create: { width: 640, height: 360, channels: 3, background: "#2f5bea" },
  })
    .png()
    .toBuffer();
  await page.goto("/admin/media");
  await page
    .getByLabel(/Alt text/)
    .first()
    .fill("Solid blue test image");
  await page
    .getByLabel("Choose a file to upload")
    .setInputFiles({ name: "blue.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("link", { name: /Open blue\.png/ })).toBeVisible();
});

test("contact: a visitor's message reaches the inbox", async ({ browser, page }) => {
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const tab = await visitor.newPage();
  await tab.goto("/contact");
  await tab.getByLabel("Name").fill("A Visitor");
  await tab.getByLabel("Email").fill("visitor@example.test");
  await tab.getByLabel("Message").fill("Hello! I enjoyed reading your journal.");
  // Real people take a few seconds; instant submissions are treated as spam.
  await tab.waitForTimeout(3_500);
  await tab.getByRole("button", { name: "Send message" }).click();
  await expect(tab.getByRole("heading", { name: "Message sent" })).toBeVisible();
  await visitor.close();

  await page.goto("/admin/messages");
  await expect(page.getByText("Hello! I enjoyed reading your journal.")).toBeVisible();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByRole("button", { name: "Mark as read" })).toBeHidden();
});

test("contact form shows validation errors", async ({ browser }) => {
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const tab = await visitor.newPage();
  await tab.goto("/contact");
  await tab.getByLabel("Name").fill("X");
  await tab.getByLabel("Email").fill("not-an-email");
  await tab.getByLabel("Message").fill("short");
  await tab.waitForTimeout(3_500);
  await tab.getByRole("button", { name: "Send message" }).click();
  await expect(tab.getByText("Enter a valid email address.")).toBeVisible();
  await expect(tab.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await visitor.close();
});

test("sign out ends the session", async ({ browser }) => {
  // Use a separate sign-in so the shared session stays valid for later projects.
  const { email, password } = JSON.parse(readFileSync("playwright/.auth/credentials.json", "utf8"));
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await context.close();
});
