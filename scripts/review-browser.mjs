import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";

// Only disposable fixtures on local services; never point this at production.
const base = process.env.REVIEW_BASE_URL || "http://localhost:3100";
for (const value of [base, process.env.DATABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname)) throw new Error("Local services only");
}
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const eventId = randomUUID();
const slug = randomBytes(5).toString("hex");
const token = randomBytes(18).toString("base64url");
const imagePath = `${eventId}/review.jpg`;
let hostId;
let browser;
await mkdir("test-results/review", { recursive: true });
try {
  const account = await admin.auth.admin.createUser({
    email: `review-browser-${randomUUID()}@example.com`,
    email_confirm: true,
  });
  if (account.error) throw account.error;
  hostId = account.data.user.id;
  const [pkg] = await sql`select tier from packages where gallery_enabled and checkin_enabled limit 1`;
  await sql`insert into events (id, host_id, slug, title, honoree_primary, honoree_secondary, starts_at, status, locale, package_tier, gallery_enabled, checkin_enabled, scanner_token, scanner_token_expires_at)
    values (${eventId}, ${hostId}, ${slug}, 'Review browser', 'أحمد محمود', 'سارة علي', now() + interval '1 day', 'published', 'en', ${pkg.tier}, true, true, ${token}, now() + interval '2 days')`;
  const pixels = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#9d7353" } })
    .jpeg()
    .toBuffer();
  const upload = await admin.storage.from("event-photos").upload(imagePath, pixels, { contentType: "image/jpeg" });
  if (upload.error) throw upload.error;
  for (let index = 0; index < 41; index++) {
    await sql`insert into photos (event_id, upload_session, storage_path, thumb_path, upload_state, status) values (${eventId}, 'reviewFixture123', ${imagePath}, ${imagePath}, 'stored', 'approved')`;
  }
  const guestId = randomUUID();
  await sql`insert into guests (id, event_id, name, token, max_seats) values (${guestId}, ${eventId}, 'Review Guest', ${randomBytes(12).toString("base64url")}, 1)`;
  await sql`insert into rsvps (event_id, guest_id, status, seats) values (${eventId}, ${guestId}, 'attending', 1)`;
  browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  for (const locale of ["ar", "en"]) {
    const messages = JSON.parse(await readFile(`src/messages/${locale}.json`, "utf8"));
    await sql`update events set locale = ${locale}, updated_at = now() where id = ${eventId}`;
    await page.goto(`${base}/e/${slug}/gallery`);
    await expect(page.getByRole("button", { name: messages.Gallery.openPhoto, exact: true })).toHaveCount(40);
    await page.getByRole("link", { name: locale === "ar" ? "التالي" : "Next", exact: true }).click();
    await expect(page.getByRole("button", { name: messages.Gallery.openPhoto, exact: true })).toHaveCount(1);
    await page.screenshot({ path: `test-results/review/gallery-${locale}.png`, fullPage: true });
    await expect(page.getByRole("link", { name: locale === "ar" ? "السابق" : "Previous", exact: true })).toBeVisible();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error("Gallery horizontal overflow");
  }
  await page.goto(`${base}/scan/${token}`);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("textbox", { name: "Guest name or last digits of the mobile" }).fill("Review");
  await page.locator("form").getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: /Review Guest/ }).click();
  await expect(page.locator("#admit-seats")).toHaveAttribute("max", "1");
  await page.locator("#admit-seats").fill("2");
  await expect(page.getByRole("button", { name: "Check in", exact: true })).toBeDisabled();
  await page.locator("#admit-seats").fill("1");
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(page.locator("#admit-seats")).toHaveCount(0);
  await page.screenshot({ path: "test-results/review/scanner.png", fullPage: true });

  async function previewUrl() {
    const response = await fetch(`${base}/e/${slug}`, { headers: { "user-agent": "WhatsApp" } });
    const html = await response.text();
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (!response.ok || !match) throw new Error("Missing share metadata");
    const url = new URL(match[1].replaceAll("&amp;", "&"));
    return new URL(url.pathname + url.search, base);
  }
  const before = await previewUrl();
  await sql`update events set honoree_primary = 'أحمد محمد', updated_at = now() where id = ${eventId}`;
  const after = await previewUrl();
  if (before.href === after.href) throw new Error("Stale preview identity");
  const png = await fetch(after);
  if (!png.ok) throw new Error(`Preview HTTP ${png.status}`);
  await writeFile("test-results/review/arabic-og-plain.png", Buffer.from(await png.arrayBuffer()));
  expect(pageErrors).toEqual([]);
  console.log(
    "Passed: Arabic/English mobile gallery pagination, scanner admission bounds, preview revision and PNG, no page errors.",
  );
} finally {
  await browser?.close();
  const removed = await admin.storage.from("event-photos").remove([imagePath]);
  if (removed.error) console.error("Fixture storage cleanup failed", removed.error.name);
  if (hostId) {
    await sql`delete from events where host_id = ${hostId}`;
    const deleted = await admin.auth.admin.deleteUser(hostId);
    if (deleted.error) console.error("Fixture account cleanup failed", deleted.error.name);
  }
  await sql.end();
}
