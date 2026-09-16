import { expect, test, type Browser } from "@playwright/test";

import { createPublishedEvent, openInvitation } from "./helpers";

async function guestPage(browser: Browser, baseURL: string) {
  const ctx = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "ar-EG",
  });
  return { ctx, page: await ctx.newPage() };
}

test.describe("invitation flow", () => {
  test("host publishes, guest opens the envelope and RSVPs, dashboard counts update", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "host-desktop", "Host setup runs in the authenticated project");

    const { eventId, slug } = await createPublishedEvent(page);

    const guest = await guestPage(browser, baseURL!);
    await openInvitation(guest.page, slug);
    // No photo on this event: names are visible without scratching.
    await expect(guest.page.getByRole("heading", { level: 1 })).toContainText("أحمد");

    const attendingChoice = guest.page.getByLabel(/سأحضر|I will attend/);
    await guest.page.getByText(/سأحضر|I will attend/, { exact: true }).click();
    await expect(attendingChoice).toBeChecked();
    await guest.page.fill('input[name="name"]', "عمر e2e");
    await guest.page.fill('input[name="phone"]', "01012345678");
    await guest.page.selectOption('select[name="seats"]', "2");
    await guest.page.getByRole("button", { name: /إرسال الرد|Send reply/ }).click();
    await guest.page.waitForURL(/\/i\/[A-Za-z0-9_-]{16}\?rsvp=1$/, { timeout: 30_000 });
    await guest.ctx.close();

    await page.goto(`/dashboard/events/${eventId}`);
    const attending = page
      .getByText(/سيحضرون|Attending/)
      .first()
      .locator("..");
    await expect(attending.getByText("1", { exact: true })).toBeVisible();
  });

  test("published invitation opens on mobile without console errors", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "guest-mobile", "Mobile smoke coverage runs in the guest project");
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await openInvitation(page, "lhtestev01");

    expect(consoleErrors).toEqual([]);
  });
});
