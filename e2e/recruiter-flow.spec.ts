import { test, expect, type Page } from "@playwright/test";

/**
 * Authenticated end-to-end integration flow.
 *
 * Requires a seeded test user:
 *   E2E_USER=recruiter@example.com E2E_PASS=... bunx playwright test
 * Without those env vars the suite is skipped so CI stays green on forks.
 */
const EMAIL = process.env.E2E_USER;
const PASSWORD = process.env.E2E_PASS;

test.describe("recruiter flow", () => {
  test.skip(!EMAIL || !PASSWORD, "Set E2E_USER and E2E_PASS to run the authenticated flow.");

  async function signIn(page: Page) {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill(EMAIL!);
    await page.getByLabel(/password/i).first().fill(PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/\/app\//, { timeout: 30_000 });
  }

  test("sign in, create a job, extract requirements", async ({ page }) => {
    await signIn(page);

    await page.goto("/app/jobs/new", { waitUntil: "domcontentloaded" });
    const title = `E2E Engineer ${Date.now()}`;
    await page.getByLabel(/title/i).first().fill(title);
    await page
      .getByLabel(/description/i)
      .first()
      .fill(
        "We are hiring a senior full-stack engineer. Required: 5+ years production TypeScript, deep React expertise, Postgres, and SaaS at scale. Nice to have: edge runtimes and fintech experience. Remote-first.",
      );
    await page.getByRole("button", { name: /create|extract/i }).first().click();

    await page.waitForURL(/\/app\/jobs\/[0-9a-f-]{36}/, { timeout: 120_000 });
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText(/requirement/i).first()).toBeVisible({ timeout: 60_000 });
  });

  test("dashboard walkthrough and integrations page are reachable", async ({ page }) => {
    await signIn(page);

    await page.goto("/app/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/welcome back/i)).toBeVisible();

    await page.goto("/app/integrations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /connect an ats/i })).toBeVisible();
    await expect(page.getByText(/greenhouse/i).first()).toBeVisible();
  });

  test("global candidate search responds", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/candidates", { waitUntil: "domcontentloaded" });
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill("engineer");
    await page.waitForTimeout(1500);
    await expect(page.locator("body")).not.toContainText(/something went wrong/i);
  });
});
