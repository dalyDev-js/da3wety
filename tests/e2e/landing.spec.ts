import { expect, test } from "@playwright/test";

/** Runs in both projects: host-desktop (signed in) and guest-mobile (no session). */
test.describe("landing", () => {
  test("renders hero, sections and three pricing tiers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /دعوة رقمية تليق باحتفالك|A digital invitation worthy/,
    );
    for (const id of ["features", "how-it-works", "pricing", "faq"]) {
      await expect(page.locator(`section#${id}`)).toBeVisible();
    }
    await expect(page.locator("[data-tier]")).toHaveCount(3);
    await expect(page.locator('[data-tier="standard"]')).toContainText(/الأكثر طلبًا|Most popular/);
  });

  test("primary CTA leads to the dashboard entry point", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("banner")
      .getByRole("link", { name: /أنشئ دعوتك|Create your invitation/ })
      .click();
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });

  test("FAQ items expand", async ({ page }) => {
    await page.goto("/");
    const first = page.locator("#faq button").first();
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "true");
  });
});
