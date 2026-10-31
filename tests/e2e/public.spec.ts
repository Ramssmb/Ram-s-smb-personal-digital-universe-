import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "/",
  "/about",
  "/education",
  "/skills",
  "/projects",
  "/projects/uptime-monitor",
  "/experience",
  "/achievements",
  "/journal",
  "/resources",
  "/links",
  "/contact",
  "/search?q=index",
];

async function expectNoAxeViolations(page: Page) {
  // Measure the settled page: mid-animation opacity would distort the contrast check.
  // Infinite animations (loading skeletons, spinners) never finish; wait for the rest.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

for (const path of PAGES) {
  test(`${path} renders, fits the screen and passes axe in both themes`, async ({
    page,
    context,
    baseURL,
  }) => {
    for (const theme of ["light", "dark"] as const) {
      await context.addCookies([{ name: "theme", value: theme, url: baseURL! }]);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("main#main")).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, "horizontal overflow").toBe(0);
      await expectNoAxeViolations(page);
    }
  });
}

test("drafts and unknown slugs return 404", async ({ page }) => {
  expect((await page.goto("/projects/half-finished-idea"))?.status()).toBe(404);
  expect((await page.goto("/journal/does-not-exist"))?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("navigation works at this screen size", async ({ page, viewport }) => {
  await page.goto("/");
  if ((viewport?.width ?? 1440) < 1024) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Journal" }).click();
  } else {
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Journal" })
      .click();
  }
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByRole("heading", { level: 1, name: "Journal" })).toBeVisible();
});

test("theme toggle persists across reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("filters keep their state in the URL", async ({ page }) => {
  await page.goto("/projects?q=uptime&sort=title");
  await expect(page.getByRole("link", { name: "Uptime Monitor" })).toBeVisible();
  await page.goto("/projects?q=nothing-matches-this");
  await expect(page.getByText("No projects match")).toBeVisible();
});

test("security headers and CSP", async ({ page, request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toMatch(
    /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
  );
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-powered-by"]).toBeUndefined();

  const violations: string[] = [];
  page.on("console", (m) => /Content Security Policy/i.test(m.text()) && violations.push(m.text()));
  await page.goto("/");
  await page.getByTestId("theme-toggle").click();
  expect(violations).toEqual([]);
});

test("SEO endpoints", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/projects/uptime-monitor");
  expect(sitemap).not.toContain("half-finished-idea");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  const feed = await request.get("/journal/feed.xml");
  expect(feed.headers()["content-type"]).toContain("application/rss+xml");
  expect(await feed.text()).toContain("Learned how B-tree indexes work");
});

test("page metadata", async ({ page }) => {
  await page.goto("/projects/uptime-monitor");
  await expect(page).toHaveTitle(/Uptime Monitor/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/projects\/uptime-monitor$/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Uptime Monitor",
  );
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("API errors use the JSON shape", async ({ request }) => {
  const response = await request.get("/api/v1/nope");
  expect(response.status()).toBe(404);
  expect((await response.json()).error.code).toBe("not_found");
  expect((await request.get("/api/v1/health")).status()).toBe(200);
});
