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
    await expect(guest.page.getByText(/باقي على المناسبة|Until the big day/)).toBeVisible();
    // No photo on this event: names are visible without scratching.
    await expect(guest.page.getByRole("heading", { level: 1 })).toContainText("أحمد");

    const [download] = await Promise.all([
      guest.page.waitForEvent("download"),
      guest.page.getByRole("link", { name: /Apple/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.ics$/);

    const attendingChoice = guest.page.getByLabel(/سأحضر|I will attend/);
    await guest.page.getByText(/سأحضر|I will attend/, { exact: true }).click();
    await expect(attendingChoice).toBeChecked();
    await guest.page.fill('input[name="name"]', "عمر e2e");
    await guest.page.fill('input[name="phone"]', "01012345678");
    await guest.page.selectOption('select[name="seats"]', "2");
    await guest.page.fill('textarea[name="message"]', "ألف مبروك!");
    await guest.page.getByRole("button", { name: /إرسال الرد|Send reply/ }).click();
    await guest.page.waitForURL(/\/i\/[A-Za-z0-9_-]{16}\?rsvp=1$/, { timeout: 30_000 });
    await guest.ctx.close();

    await page.goto(`/dashboard/events/${eventId}`);
    const attending = page
      .getByText(/سيحضرون|Attending/)
      .first()
      .locator("..");
    await expect(attending.getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByText("ألف مبروك!", { exact: true })).toBeVisible();

    await page.goto(`/dashboard/events/${eventId}?wishesPage=2`);
    await expect(page.getByText("ألف مبروك!", { exact: true })).toBeVisible();

    const csvResponse = await page.request.get(`/dashboard/events/${eventId}/checkin/export`);
    expect(csvResponse.ok()).toBe(true);
    const csv = await csvResponse.text();
    expect(csv).toContain("rsvp,message,seats_attending");
    expect(csv).toContain('"attending","ألف مبروك!"');
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

  test("host picks a theme and enables the gift section; the invitation reflects both", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "host-desktop", "Host setup runs in the authenticated project");

    const { eventId, slug } = await createPublishedEvent(page);
    await page.goto(`/dashboard/events/${eventId}/edit`);
    await page.getByRole("radio", { name: /كحلي|Navy/ }).check({ force: true });
    await page.getByLabel(/عرض قسم الهدية|Show the gift section/).check();
    await page.fill('input[name="giftHandle"]', "01012345678");
    await page.fill('textarea[name="giftNote"]', "حضوركم أغلى هدية");
    await page
      .getByRole("button", { name: /حفظ|Save/ })
      .first()
      .click();
    await expect(page.getByText(/تم حفظ التغييرات|Changes saved/)).toBeVisible();

    await page.reload();
    await expect(page.getByRole("radio", { name: /كحلي|Navy/ })).toBeChecked();
    await expect(page.getByLabel(/عرض قسم الهدية|Show the gift section/)).toBeChecked();
    await expect(page.locator('input[name="giftHandle"]')).toHaveValue("01012345678");
    await expect(page.locator('textarea[name="giftNote"]')).toHaveValue("حضوركم أغلى هدية");

    const guest = await guestPage(browser, baseURL!);
    await openInvitation(guest.page, slug);
    const paper = await guest.page
      .locator("main")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--inv-paper").trim());
    expect(paper).toBe("#f6efe9");
    await expect(guest.page.getByText("حضوركم أغلى هدية")).toBeVisible();
    await expect(guest.page.getByRole("button", { name: /نسخ|Copy/ })).toBeVisible();
    await guest.ctx.close();
  });
});
