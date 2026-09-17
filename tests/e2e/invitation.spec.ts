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

  test("host reminds pending guests and copies only pending links on the current page", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "host-desktop", "Host setup runs in the authenticated project");

    const eventTitle = `e2e تذكير ${Date.now()}`;
    const { eventId, slug } = await createPublishedEvent(page, { title: eventTitle });

    const guest = await guestPage(browser, baseURL!);
    await openInvitation(guest.page, slug);
    await guest.page.getByText(/سأحضر|I will attend/, { exact: true }).click();
    await guest.page.fill('input[name="name"]', "عمر e2e");
    await guest.page.fill('input[name="phone"]', "01012345678");
    await guest.page.fill('textarea[name="message"]', "=1+1");
    await guest.page.getByRole("button", { name: /إرسال الرد|Send reply/ }).click();
    await guest.page.waitForURL(/\/i\/[A-Za-z0-9_-]{16}\?rsvp=1$/, { timeout: 30_000 });
    await guest.ctx.close();

    await page.addInitScript(() => {
      const trackedWindow = window as typeof window & {
        __openedUrls: string[];
        __copiedTexts: string[];
      };
      trackedWindow.__openedUrls = [];
      trackedWindow.__copiedTexts = [];
      window.open = ((url?: string | URL) => {
        trackedWindow.__openedUrls.push(String(url));
        return null;
      }) as typeof window.open;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            trackedWindow.__copiedTexts.push(value);
          },
        },
      });
    });

    const pendingGuestName = "ضيف منتظر e2e";
    await page.goto(`/dashboard/events/${eventId}/guests`);
    await page
      .getByRole("button", { name: /إضافة ضيف|Add guest/ })
      .first()
      .click();
    const addGuestDialog = page.getByRole("dialog");
    await addGuestDialog.locator("#guest-name").fill(pendingGuestName);
    await addGuestDialog.locator("#guest-phone").fill("01087654321");
    await addGuestDialog.getByRole("button", { name: /إضافة ضيف|Add guest/ }).click();

    const pendingRow = page.getByRole("row").filter({ hasText: pendingGuestName });
    const respondedRow = page.getByRole("row").filter({ hasText: "عمر e2e" });
    const remindName = /تذكير على واتساب|Remind on WhatsApp/;
    await expect(pendingRow.getByRole("button", { name: remindName })).toBeVisible();
    await expect(respondedRow.getByRole("button", { name: remindName })).toHaveCount(0);
    await expect(page.getByText(/من لم يردّوا في هذه الصفحة: 1|Pending guests on this page: 1/)).toBeVisible();

    await pendingRow.getByRole("button", { name: remindName }).click();
    const [remindUrl] = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __openedUrls: string[];
          }
        ).__openedUrls,
    );
    const parsedReminder = new URL(remindUrl);
    expect(parsedReminder.origin).toBe("https://wa.me");
    expect(parsedReminder.pathname).toBe("/201087654321");
    const reminderMessage = parsedReminder.searchParams.get("text")!;
    const reminderLines = reminderMessage.split("\n");
    expect(reminderLines).toHaveLength(2);
    expect(reminderLines[0]).toContain("تذكير لطيف 🌷");
    expect(reminderLines[0]).toContain(`دعوة ${eventTitle}`);
    expect(reminderLines[1]).toMatch(/^http:\/\/localhost:3000\/i\/[A-Za-z0-9_-]{16}$/);

    await page.getByRole("button", { name: /نسخ روابط من لم يردّوا|Copy links of pending guests/ }).click();
    const [copiedPending] = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __copiedTexts: string[];
          }
        ).__copiedTexts,
    );
    expect(copiedPending).toBe(`${pendingGuestName} — ${reminderLines[1]}`);
    expect(copiedPending).not.toContain("عمر e2e");

    const pendingGuest = await guestPage(browser, baseURL!);
    await pendingGuest.page.goto(reminderLines[1]);
    const gate = pendingGuest.page.getByRole("button", { name: /اضغط لفتح الدعوة|Tap to open/ });
    await gate.click();
    await expect(gate).toBeHidden({ timeout: 8_000 });
    await pendingGuest.page.getByText(/سأحضر|I will attend/, { exact: true }).click();
    await pendingGuest.page.fill('textarea[name="message"]', 'سطر، "مقتبس"\nسطر ثان');
    await pendingGuest.page.getByRole("button", { name: /إرسال الرد|Send reply/ }).click();
    await expect(pendingGuest.page.getByRole("status")).toBeVisible();
    await pendingGuest.ctx.close();

    const csvResponse = await page.request.get(`/dashboard/events/${eventId}/checkin/export`);
    expect(csvResponse.ok()).toBe(true);
    const csv = await csvResponse.text();
    expect(csv).toContain('"attending","\'=1+1"');
    expect(csv).toContain('"attending","سطر، ""مقتبس""\r\nسطر ثان"');

    await page.goto(`/dashboard/events/${eventId}/guests?filter=attending`);
    await expect(
      page.getByRole("button", { name: /نسخ روابط من لم يردّوا|Copy links of pending guests/ }),
    ).toBeDisabled();
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
    await expect(page.getByRole("radiogroup", { name: /ألوان الدعوة|Invitation colours/ })).toBeVisible();
    await page.getByRole("radio", { name: /كحلي|Navy/ }).check({ force: true });
    await page.getByLabel(/عرض قسم الهدية|Show the gift section/).check();
    const giftHandle = page.locator('input[name="giftHandle"]');
    await page
      .getByRole("button", { name: /حفظ|Save/ })
      .first()
      .click();
    await expect(giftHandle).toHaveAttribute("aria-invalid", "true");
    const giftHandleErrorId = await giftHandle.getAttribute("aria-describedby");
    expect(giftHandleErrorId).toBe("giftHandle-error");
    await expect(page.locator(`#${giftHandleErrorId}`)).toContainText(/هذا الحقل مطلوب|This field is required/);

    await page.getByRole("radio", { name: /كحلي|Navy/ }).check({ force: true });
    await page.getByLabel(/عرض قسم الهدية|Show the gift section/).check();
    await giftHandle.fill("01012345678");
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
