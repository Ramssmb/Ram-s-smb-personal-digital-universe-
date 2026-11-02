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
    .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
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

test("every kind of page carries complete social metadata and the feed link", async ({ page }) => {
  for (const path of ["/", "/about", "/projects", "/journal/learned-how-b-tree-indexes-work"]) {
    await page.goto(path);
    const meta = (selector: string) => page.locator(selector).first().getAttribute("content");
    expect(await meta('meta[property="og:site_name"]'), path).toBe("E2E Person");
    expect(await meta('meta[property="og:type"]'), path).toMatch(/^(website|article)$/);
    expect(await meta('meta[property="og:url"]'), path).toMatch(/^https?:\/\//);
    expect(await meta('meta[name="twitter:card"]'), path).toMatch(/^summary/);
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
  }
});

test("a project with a cover shares a 1200 × 630 JPEG", async ({ page, request }) => {
  await page.goto("/projects/uptime-monitor");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toMatch(/\/media\/og\/.+\.webp\.jpg$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const response = await request.get(image!);
  expect(response.headers()["content-type"]).toBe("image/jpeg");
  const { default: sharp } = await import("sharp");
  const { width, height, format } = await sharp(await response.body()).metadata();
  expect({ width, height, format }).toEqual({ width: 1200, height: 630, format: "jpeg" });
  expect((await request.get("/media/og/not-a-key.jpg")).status()).toBe(404);
});

test("a missing project renders the regular 404 page", async ({ page }) => {
  const response = await page.goto("/projects/no-such-project");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("form field borders contrast at least 3:1 in both themes", async ({
  page,
  context,
  baseURL,
}) => {
  for (const theme of ["light", "dark"] as const) {
    await context.addCookies([{ name: "theme", value: theme, url: baseURL! }]);
    await page.goto("/contact");
    const ratios = await page.evaluate(() => {
      const rgb = (c: string) =>
        c
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const lum = (c: string) => {
        const [r, g, b] = rgb(c).map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const ratio = (a: string, b: string) => {
        const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
        return (x! + 0.05) / (y! + 0.05);
      };
      const page = getComputedStyle(document.body).backgroundColor;
      return [
        ...document.querySelectorAll<HTMLElement>("main input[name=name], main textarea"),
      ].map((field) => {
        const style = getComputedStyle(field);
        return Math.min(
          ratio(style.borderTopColor, page),
          ratio(style.borderTopColor, style.backgroundColor),
        );
      });
    });
    for (const r of ratios) expect(r, theme).toBeGreaterThanOrEqual(3);
  }
});

test("the current page is marked by more than colour", async ({ page }) => {
  await page.goto("/projects");
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  const current = page.locator('nav[aria-label="Primary"] a[aria-current="page"]').filter({
    visible: true,
  });
  await expect(current).toHaveText("Projects");
  expect(await current.evaluate((a) => getComputedStyle(a).textDecorationLine)).toContain(
    "underline",
  );
});

test("a slow page load shows progress, and contact success receives focus", async ({ page }) => {
  // Hold the next page for a moment so the progress indicator has time to appear.
  await page.route(/\/skills(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Footer" })
    .getByRole("link", { name: "Skills" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Loading page…" })).toBeAttached();
  await expect(page).toHaveURL(/\/skills$/);
  await expect(page.getByRole("status").filter({ hasText: "Loading page…" })).toHaveCount(0);

  // The message is answered locally; nothing reaches the server.
  await page.route("**/api/v1/contact", (route) =>
    route.fulfill({ status: 202, contentType: "application/json", body: '{"ok":true}' }),
  );
  await page.goto("/contact");
  await page.getByLabel("Name").fill("Keyboard tester");
  await page.getByLabel("Email").fill("tester@example.test");
  await page.getByLabel(/^Message/).fill("Checking where focus goes after sending.");
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByRole("heading", { name: "Message sent" })).toBeFocused();
});

test("the dashboard and the API send X-Robots-Tag: noindex", async ({ request }) => {
  const admin = await request.get("/admin", { maxRedirects: 0 });
  expect(admin.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect((await request.get("/api/v1/health")).headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect((await request.get("/about")).headers()["x-robots-tag"]).toBeUndefined();
});

test("API errors use the JSON shape", async ({ request }) => {
  const response = await request.get("/api/v1/nope");
  expect(response.status()).toBe(404);
  expect((await response.json()).error.code).toBe("not_found");
  expect((await request.get("/api/v1/health")).status()).toBe(200);
});
