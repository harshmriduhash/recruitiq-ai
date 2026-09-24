import { test, expect } from "@playwright/test";

test.describe("public marketing journey", () => {
  test("landing page renders hero, nav and SEO metadata", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/RecruitIQ/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{30,}/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("pricing, how it works and security pages load", async ({ page }) => {
    for (const path of ["/pricing", "/how-it-works", "/security"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
  });

  test("sitemap and robots are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain("<urlset");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
  });
});

test.describe("auth gate", () => {
  for (const path of ["/app/dashboard", "/app/jobs", "/app/candidates", "/app/integrations"]) {
    test(`redirects anonymous visitor away from ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/auth/, { timeout: 15_000 });
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
    });
  }

  test("auth page offers email and Google sign-in", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });
});
