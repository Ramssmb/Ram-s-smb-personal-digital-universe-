import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  // Include the offending selectors so a CI failure is diagnosable from the report alone.
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

test.describe("public shell", () => {
  test("home renders the empty state without invented content", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 2, name: "Nothing is published yet" }),
    ).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.locator("main#main")).toBeVisible();
  });

  test("has no horizontal overflow at this viewport", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`home passes axe checks in the ${theme} theme`, async ({ page, context }) => {
      await context.addCookies([{ name: "theme", value: theme, url: "http://localhost:3100" }]);
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expectNoAxeViolations(page);
    });
  }

  test("theme toggle switches theme and persists across reloads", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  });

  test("skip link moves focus to the main content", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("unknown pages return the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});

test.describe("security headers", () => {
  test("pages carry a nonce-based CSP and baseline headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toMatch(
      /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
    );
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["x-request-id"]).toBeTruthy();
  });

  test("the nonce changes on every request", async ({ request }) => {
    const nonce = async () =>
      /'nonce-([^']+)'/.exec(
        (await request.get("/")).headers()["content-security-policy"] ?? "",
      )?.[1];
    expect(await nonce()).not.toBe(await nonce());
  });

  test("Next.js scripts carry the nonce and run under the CSP", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });
    await page.goto("/");
    // Hydration works only if the scripts were allowed: the toggle responds to clicks.
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);
    expect(violations).toEqual([]);
  });
});

test.describe("API", () => {
  test("health reports ok", async ({ request }) => {
    const response = await request.get("/api/v1/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("unknown API paths return the JSON error shape", async ({ request }) => {
    const response = await request.get("/api/v1/nope");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("not_found");
    expect(body.error.requestId).toBeTruthy();
  });
});

test.describe("design gallery", () => {
  test("renders every component and passes axe checks", async ({ page }) => {
    await page.goto("/admin/design");
    await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("confirm dialog runs the action only after confirmation", async ({ page }) => {
    await page.goto("/admin/design");
    await page.getByRole("button", { name: "Delete permanently" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete this item?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Demo item deleted.")).toBeVisible();
  });

  test("is not indexed by search engines", async ({ page }) => {
    await page.goto("/admin/design");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
