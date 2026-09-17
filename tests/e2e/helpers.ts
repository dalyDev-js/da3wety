import { expect, type Page } from "@playwright/test";

export type EventInput = { title: string; honoreePrimary: string; honoreeSecondary?: string; startsAt: string };

function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 15);
  d.setHours(19, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

/** Drives the real new-event form, then publishes from the overview page. */
export async function createPublishedEvent(page: Page, overrides: Partial<EventInput> = {}) {
  const input: EventInput = {
    title: `e2e زفاف ${Date.now()}`,
    honoreePrimary: "أحمد",
    honoreeSecondary: "سارة",
    startsAt: nextMonth(),
    ...overrides,
  };
  await page.goto("/dashboard/events/new");
  await page.fill('input[name="title"]', input.title);
  await page.fill('input[name="honoreePrimary"]', input.honoreePrimary);
  if (input.honoreeSecondary) await page.fill('input[name="honoreeSecondary"]', input.honoreeSecondary);
  await page.fill('input[name="startsAt"]', input.startsAt);
  await page.getByRole("button", { name: /إنشاء المناسبة|Create event/ }).click();
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}\/edit/);
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)![1];

  await page.goto(`/dashboard/events/${eventId}`);
  const preview = page.locator('a[href^="/e/"]').first();
  const slug = (await preview.getAttribute("href"))!.split("/e/")[1].split(/[/?]/)[0];
  await page.getByRole("button", { name: /نشر الدعوة|Publish/ }).click();
  await expect(page.getByRole("button", { name: /إلغاء النشر|Unpublish/ })).toBeVisible({ timeout: 30_000 });
  return { eventId, slug };
}

/** Opens the public invitation, taps the envelope and waits for the gate to leave. */
export async function openInvitation(page: Page, slug: string) {
  await page.goto(`/e/${slug}`);
  const gate = page.getByRole("button", { name: /اضغط لفتح الدعوة|Tap to open/ });
  await expect(gate).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await gate.click();
  await expect(gate).toBeHidden({ timeout: 8_000 });
}
