# Plan 1 — E2E harness + invitation extras (sub-project E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Playwright e2e harness the product has been missing, then ship the four invitation extras: colour themes, digital gift section, countdown + add-to-calendar, wishes wall + remind-pending.

**Architecture:** Server components keep rendering all invitation text; new client components (`Countdown`, `ThemePicker`, `CopyHandle`) are small leaves. Theme colours become CSS variables set once on `InvitationStage` and read by the envelope gate, foil and confetti, so a theme is data, not code. Schema grows by one enum and four nullable columns via a generated Drizzle migration.

**Tech Stack:** Next 16 App Router, Drizzle 0.45 + Postgres (local Supabase CLI stack for dev/e2e), zod 4, next-intl 4, motion 13, Playwright 1.63 (Chrome channel), vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-16-v1.1-growth-features-design.md` (sections "Sub-project E" and "Cross-cutting").

## Global Constraints

- Every Server Action validates with zod and re-derives authorization (`requireHost()` + `getEventForHost(eventId, host.id)`); client-supplied ids are never trusted.
- Client components must not import anything under `src/lib/validation/` except `state.ts`, nor `zod` (ESLint enforces).
- Guest-facing text is rendered server-side in the event locale via `getTranslations({ locale, namespace })`; Arabic plurals list all six CLDR forms (unit test enforces); `ar.json` and `en.json` keep identical key sets.
- Arabic text never gets `tracking-*` (letter-spacing breaks joining); use `captionClass(locale)` from `src/components/invitation/caption.ts` for small labels.
- Invitation page JS budget: +15 KB gzipped max for this plan.
- Migrations: change schema files, run `npm run db:generate`, commit the generated SQL + `drizzle/meta`; never hand-edit generated SQL.
- Every task ends green: `npm run typecheck && npm run lint && npm run test`. Prettier: `npx prettier --write <files>` before committing.
- Local prerequisites: Docker Desktop running, `npx supabase start`, `.env.local` pointing at it with `DEV_LOGIN_ENABLED=true`, dev host created with `node --env-file=.env.local scripts/create-dev-host.mjs`.
- Commit messages end with the attribution trailer used in this repo (`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` and the `Claude-Session:` line).

---

## File map

| Path | Responsibility |
|---|---|
| `playwright.config.ts` | Playwright config: Chrome channel, `next dev` web server on 3000, `baseURL`, `storageState` from global setup |
| `tests/e2e/global-setup.ts` | Logs in through `/auth/dev-login` once, saves `tests/e2e/.auth/host.json` |
| `tests/e2e/helpers.ts` | `createPublishedEvent(page, overrides)` — drives the new-event form and publish toggle, returns `{ eventId, slug }` |
| `tests/e2e/invitation.spec.ts` | Full guest flow: create → publish → envelope → reveal → RSVP → dashboard counts; extended in later tasks for theme, gift, countdown, calendar, wishes |
| `src/db/schema/enums.ts` | `+ THEME_IDS`, `themeIdEnum` |
| `src/db/schema/events.ts` | `+ theme`, `giftEnabled`, `giftHandle`, `giftNote` |
| `drizzle/0002_*.sql`, `drizzle/meta/*` | Generated migration |
| `src/lib/validation/event.ts` | `+ theme`, `giftEnabled`, `giftHandle`, `giftNote` in schema and `eventFormFromFormData` |
| `src/actions/events.ts` | `updateEvent` writes the new columns |
| `src/components/invitation/invitation-theme.ts` | `THEMES`, `ThemeId`, envelope/foil/confetti colours, `invitationThemeStyle(themeId)` |
| `src/components/invitation/invitation-stage.tsx` | `theme` prop |
| `src/components/invitation/envelope-gate.tsx` | Reads `--inv-env-*` variables instead of literal colours |
| `src/components/invitation/scratch-photo.tsx` | Foil + confetti colours from props |
| `src/components/invitation/invitation-hero.tsx` | Passes theme foil/confetti to `ScratchPhoto`, renders `Countdown` slot |
| `src/components/dashboard/theme-picker.tsx` | Client: 4 swatches (radio inputs) with a mini envelope preview |
| `src/components/dashboard/event-form.tsx` | `+ ThemePicker` section, `+ gift` section |
| `src/components/invitation/gift-section.tsx` | Server: gift note + `CopyHandle` |
| `src/components/invitation/copy-handle.tsx` | Client: copies the handle, shows a check for 2 s |
| `src/lib/calendar.ts` | `buildIcs`, `googleCalendarUrl`, `outlookCalendarUrl`, `icsFilename` (pure) |
| `src/app/(guest)/e/[slug]/event.ics/route.ts` | `GET` → `text/calendar` |
| `src/components/invitation/add-to-calendar.tsx` | Server: three links |
| `src/components/invitation/countdown.tsx` | Client: days/hours/minutes ticking once a minute |
| `src/lib/countdown.ts` | `countdownParts(target, now)` (pure) |
| `src/db/queries/guests.ts` | `+ listWishes(eventId, page)` |
| `src/components/dashboard/wishes-list.tsx` | Server: wishes table with pagination |
| `src/app/(host)/dashboard/events/[eventId]/page.tsx` | `+ WishesList` |
| `src/app/(host)/dashboard/events/[eventId]/checkin/export/route.ts` | `+ message` column |
| `src/components/dashboard/guest-actions.tsx` | `+ remind` button for pending guests |
| `src/components/dashboard/copy-pending-links.tsx` | Client: copies `name — link` lines |
| `src/app/(host)/dashboard/events/[eventId]/guests/page.tsx` | Wires `reminderText` and `CopyPendingLinks` |
| `src/messages/ar.json`, `src/messages/en.json` | New keys under `Event.theme`, `Event.gift`, `Gift`, `Calendar`, `Guests`, `Dashboard.wishes` |
| `tests/unit/calendar.test.ts`, `tests/unit/countdown.test.ts`, `tests/unit/themes.test.ts` | Unit tests |

---

### Task 1: Playwright harness with dev-login and a first guest-flow spec

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/global-setup.ts`
- Create: `tests/e2e/helpers.ts`
- Create: `tests/e2e/invitation.spec.ts`
- Modify: `package.json` (`test:e2e` already exists; add `test:e2e:ui`)
- Modify: `.gitignore` (`tests/e2e/.auth/`)
- Modify: `vitest.config.mts` (exclude `tests/e2e/**`)

**Interfaces:**
- Produces: `createPublishedEvent(page: Page, overrides?: Partial<EventInput>): Promise<{ eventId: string; slug: string }>` where `EventInput = { title: string; honoreePrimary: string; honoreeSecondary?: string; startsAt: string /* yyyy-MM-ddTHH:mm */ }`.
- Produces: `openInvitation(page: Page, slug: string): Promise<void>` — navigates, taps the envelope, waits for the gate to unmount.

- [x] **Step 1: Exclude e2e from vitest and ignore auth state**

In `vitest.config.mts` add `exclude: ["tests/e2e/**", "node_modules/**"]` inside `test`. Append `tests/e2e/.auth/` and `playwright-report/` and `test-results/` to `.gitignore`.

- [x] **Step 2: Write the Playwright config**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    locale: "ar-EG",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    storageState: "tests/e2e/.auth/host.json",
  },
  projects: [
    { name: "host-desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "guest-mobile", use: { ...devices["iPhone 13"], channel: "chrome", storageState: { cookies: [], origins: [] } } },
  ],
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DEV_LOGIN_ENABLED: "true" },
  },
});
```

- [x] **Step 3: Write the global setup (login once, save cookies)**

```ts
// tests/e2e/global-setup.ts
import { mkdirSync } from "node:fs";
import { chromium, type FullConfig } from "@playwright/test";

export const DEV_HOST = { email: "admin@local.test", password: "local-dev-password" };

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";
  mkdirSync("tests/e2e/.auth", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ baseURL });
  const res = await context.request.post("/auth/dev-login", { form: DEV_HOST, maxRedirects: 0 });
  if (res.status() !== 303) {
    throw new Error(`dev-login failed (${res.status()}). Is DEV_LOGIN_ENABLED=true and the dev host created?`);
  }
  await context.storageState({ path: "tests/e2e/.auth/host.json" });
  await browser.close();
}
```

- [x] **Step 4: Write the helpers**

```ts
// tests/e2e/helpers.ts
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
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}\/edit/);
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)![1];

  await page.goto(`/dashboard/events/${eventId}`);
  const preview = page.locator('a[href^="/e/"]').first();
  const slug = (await preview.getAttribute("href"))!.split("/e/")[1].split(/[/?]/)[0];
  await page.getByRole("button", { name: /نشر الدعوة|Publish/ }).click();
  await expect(page.getByRole("button", { name: /إلغاء النشر|Unpublish/ })).toBeVisible();
  return { eventId, slug };
}

/** Opens the public invitation, taps the envelope and waits for the gate to leave. */
export async function openInvitation(page: Page, slug: string) {
  await page.goto(`/e/${slug}`);
  const gate = page.getByRole("button", { name: /اضغط لفتح الدعوة|Tap to open/ });
  await expect(gate).toBeVisible();
  await gate.click();
  await expect(gate).toBeHidden({ timeout: 8_000 });
}
```

- [x] **Step 5: Write the first spec (create → publish → open → RSVP → counts)**

```ts
// tests/e2e/invitation.spec.ts
import { expect, test, type Browser } from "@playwright/test";

import { createPublishedEvent, openInvitation } from "./helpers";

async function guestPage(browser: Browser, baseURL: string) {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ar-EG" });
  return { ctx, page: await ctx.newPage() };
}

test.describe("invitation flow", () => {
  test("host publishes, guest opens the envelope and RSVPs, dashboard counts update", async ({ page, browser, baseURL }) => {
    const { eventId, slug } = await createPublishedEvent(page);

    const guest = await guestPage(browser, baseURL!);
    await openInvitation(guest.page, slug);
    // No photo on this event: names are visible without scratching.
    await expect(guest.page.getByRole("heading", { level: 1 })).toContainText("أحمد");

    await guest.page.getByLabel(/سأحضر|Attending/).check();
    await guest.page.fill('input[name="name"]', "عمر e2e");
    await guest.page.fill('input[name="phone"]', "01012345678");
    await guest.page.selectOption('select[name="seats"]', "2");
    await guest.page.click('button[type="submit"]');
    await expect(guest.page.getByText(/شكرًا لك|Thank you/)).toBeVisible();
    await guest.ctx.close();

    await page.goto(`/dashboard/events/${eventId}`);
    await expect(page.getByText(/سيحضرون|Attending/).first()).toBeVisible();
    await expect(page.locator("text=/^1$/").first()).toBeVisible();
  });
});
```

- [x] **Step 6: Run it**

Run: `npx supabase start` (if not running), then `npm run test:e2e`
Expected: 1 passed. If the RSVP submit button selector is ambiguous, use `page.getByRole("button", { name: /إرسال الرد|Send/ })`.

- [x] **Step 7: Add the UI script and commit**

`package.json` scripts: `"test:e2e:ui": "playwright test --ui"`.

```bash
git add playwright.config.ts tests/e2e vitest.config.mts .gitignore package.json
git commit -m "test(e2e): Playwright harness with dev-login and the guest RSVP flow"
```

---

### Task 2: Schema — theme enum and gift columns, generated migration

**Files:**
- Modify: `src/db/schema/enums.ts`
- Modify: `src/db/schema/events.ts`
- Create: `drizzle/0002_<generated>.sql` + `drizzle/meta/*` (generated)
- Modify: `src/lib/validation/event.ts`
- Modify: `src/actions/events.ts:96-150` (`updateEvent`)
- Test: `tests/unit/event-schema.test.ts`

**Interfaces:**
- Produces: `THEME_IDS = ["ivory", "sage", "navy", "noir"] as const`, `type ThemeId`, `themeIdEnum` (pg enum `theme_id`).
- Produces: `events.theme: ThemeId` (default `"ivory"`), `events.giftEnabled: boolean` (default false), `events.giftHandle: string | null`, `events.giftNote: string | null`.
- Produces: `eventFormSchema` accepts `theme`, `giftEnabled`, `giftHandle`, `giftNote`; output has `giftHandle`/`giftNote` as `string | null`.

- [x] **Step 1: Write the failing schema test**

```ts
// tests/unit/event-schema.test.ts
import { describe, expect, it } from "vitest";

import { eventFormSchema } from "@/lib/validation/event";

const base = {
  title: "زفاف أحمد وسارة",
  eventType: "wedding",
  honoreePrimary: "أحمد",
  startsAt: "2026-10-15T19:00",
  timezone: "Africa/Cairo",
  locale: "ar",
  rsvpMode: "open",
  openRsvpMaxSeats: "2",
  galleryEnabled: false,
  galleryModeration: false,
  theme: "ivory",
  giftEnabled: false,
};

describe("eventFormSchema extras", () => {
  it("defaults theme to ivory and gift to off", () => {
    const out = eventFormSchema.parse(base);
    expect(out.theme).toBe("ivory");
    expect(out.giftEnabled).toBe(false);
    expect(out.giftHandle).toBeNull();
    expect(out.giftNote).toBeNull();
  });

  it("rejects an unknown theme", () => {
    expect(eventFormSchema.safeParse({ ...base, theme: "neon" }).success).toBe(false);
  });

  it("requires a handle when the gift section is enabled", () => {
    const res = eventFormSchema.safeParse({ ...base, giftEnabled: true });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toEqual(["giftHandle"]);
  });

  it("trims the handle and caps the note at 200", () => {
    const out = eventFormSchema.parse({ ...base, giftEnabled: true, giftHandle: " ahmed@instapay ", giftNote: "x".repeat(200) });
    expect(out.giftHandle).toBe("ahmed@instapay");
    expect(eventFormSchema.safeParse({ ...base, giftEnabled: true, giftHandle: "a", giftNote: "x".repeat(201) }).success).toBe(false);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/event-schema.test.ts`
Expected: FAIL — `theme` unknown key stripped / `giftEnabled` missing.

- [x] **Step 3: Add the enum and columns**

In `src/db/schema/enums.ts` (after `qrStatusEnum`):

```ts
export const THEME_IDS = ["ivory", "sage", "navy", "noir"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const themeIdEnum = pgEnum("theme_id", THEME_IDS);
```

In `src/db/schema/events.ts` import `themeIdEnum` and add after `revealImagePath`:

```ts
    /** Invitation palette; see components/invitation/invitation-theme.ts. */
    theme: themeIdEnum().notNull().default("ivory"),
    /** Digital gift (نقوط): InstaPay address or wallet number shown with a copy button. */
    giftEnabled: boolean().notNull().default(false),
    giftHandle: text(),
    giftNote: text(),
```

- [x] **Step 4: Generate the migration**

Run: `npm run db:generate`
Expected: `drizzle/0002_*.sql` containing `CREATE TYPE "public"."theme_id"` and four `ALTER TABLE "events" ADD COLUMN` lines. Open it and confirm nothing else changed (no drops).

Run: `npm run db:migrate` (local stack)
Expected: `migrations applied successfully!`

- [x] **Step 5: Extend the validation schema**

In `src/lib/validation/event.ts` import `THEME_IDS` from `@/db/schema/enums`. Add to the object:

```ts
    theme: z.enum(THEME_IDS).default("ivory"),
    giftEnabled: z.boolean(),
    giftHandle: optionalText(80),
    giftNote: optionalText(200),
```

In the `.transform`, after the `endsAt <= startsAt` check:

```ts
    if (v.giftEnabled && !v.giftHandle) {
      ctx.addIssue({ code: "custom", path: ["giftHandle"], message: VALIDATION_KEYS.required });
    }
```

and in the returned object:

```ts
      giftHandle: v.giftEnabled ? (v.giftHandle ?? null) : null,
      giftNote: v.giftEnabled ? (v.giftNote ?? null) : null,
```

In `eventFormFromFormData` add:

```ts
    theme: (formString(fd, "theme") ?? "ivory") as EventFormInput["theme"],
    giftEnabled: formCheckbox(fd, "giftEnabled"),
    giftHandle: formString(fd, "giftHandle"),
    giftNote: formString(fd, "giftNote"),
```

- [x] **Step 6: Persist in `updateEvent`**

In `src/actions/events.ts` `updateEvent` `.set({...})` add:

```ts
      theme: values.theme,
      giftEnabled: values.giftEnabled,
      giftHandle: values.giftHandle,
      giftNote: values.giftNote,
```

(`createEvent` only takes the basics; leave it.)

- [x] **Step 7: Run tests, typecheck, lint**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: all green, new test file 4 passed.

- [x] **Step 8: Commit**

```bash
git add src/db/schema drizzle src/lib/validation/event.ts src/actions/events.ts tests/unit/event-schema.test.ts
git commit -m "feat(db): theme enum and digital gift columns on events"
```

---

### Task 3: Theme registry and CSS variables (envelope, foil, confetti read the theme)

**Files:**
- Modify: `src/components/invitation/invitation-theme.ts`
- Modify: `src/components/invitation/invitation-stage.tsx`
- Modify: `src/components/invitation/envelope-gate.tsx`
- Modify: `src/components/invitation/scratch-photo.tsx`
- Modify: `src/components/invitation/invitation-hero.tsx`
- Modify: `src/components/invitation/invitation-card.tsx`
- Modify: `src/app/(guest)/e/[slug]/page.tsx`, `src/app/(guest)/i/[token]/page.tsx`, `src/app/(guest)/q/[qrToken]/page.tsx`
- Test: `tests/unit/themes.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type InvitationTheme = {
    paper: string; ink: string; muted: string; accent: string; gold: string; goldSoft: string;
    envelope: { flap: string; flapDeep: string; fold: string; foldDeep: string; liner: string; back: string; monogram: string };
    foil: { base: string; light: string; dark: string; bright: string; glitter: string };
    confetti: string[];
  };
  export const THEMES: Record<ThemeId, InvitationTheme>;
  export const DEFAULT_THEME_ID: ThemeId = "ivory";
  export function getTheme(id: ThemeId | null | undefined): InvitationTheme;
  export function invitationThemeStyle(id: ThemeId | null | undefined): CSSProperties; // sets --inv-* and --inv-env-*
  ```
- Consumes: `ThemeId`, `THEME_IDS` from `@/db/schema/enums`.
- `InvitationStage` gets `theme?: ThemeId`; `InvitationHero` gets `foil: InvitationTheme["foil"]`, `confetti: string[]`; `ScratchPhoto` gets `foil`, `confetti`.

- [x] **Step 1: Write the failing theme test**

```ts
// tests/unit/themes.test.ts
import { describe, expect, it } from "vitest";

import { THEME_IDS } from "@/db/schema/enums";
import { getTheme, invitationThemeStyle, THEMES } from "@/components/invitation/invitation-theme";

const HEX = /^#[0-9a-f]{6}$/i;

describe("invitation themes", () => {
  it("defines every theme id with complete colours", () => {
    for (const id of THEME_IDS) {
      const t = THEMES[id];
      for (const v of [t.paper, t.ink, t.muted, t.accent, t.gold, t.goldSoft, ...Object.values(t.envelope), ...Object.values(t.foil), ...t.confetti]) {
        expect(v, `${id}`).toMatch(HEX);
      }
      expect(t.confetti.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("falls back to ivory for unknown ids", () => {
    expect(getTheme(undefined)).toBe(THEMES.ivory);
    expect(getTheme("nope" as never)).toBe(THEMES.ivory);
  });

  it("emits the CSS variables the components read", () => {
    const style = invitationThemeStyle("navy") as Record<string, string>;
    for (const key of ["--inv-paper", "--inv-ink", "--inv-accent", "--inv-gold", "--inv-env-flap", "--inv-env-fold", "--inv-env-liner", "--inv-env-back", "--inv-env-monogram"]) {
      expect(style[key], key).toMatch(HEX);
    }
    expect(style["--inv-paper"]).toBe(THEMES.navy.paper);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/themes.test.ts`
Expected: FAIL — `THEMES`/`getTheme` not exported.

- [x] **Step 3: Rewrite `invitation-theme.ts`**

```ts
import type { CSSProperties } from "react";

import { THEME_IDS, type ThemeId } from "@/db/schema/enums";

/**
 * Invitation palettes. Everything colour-related on guest pages derives from
 * one of these: card stock and ink, the envelope's paper shades, the scratch
 * foil tones and the confetti. Exposed as CSS variables by
 * `invitationThemeStyle` so server and client components share one source.
 */
export type InvitationTheme = {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  gold: string;
  goldSoft: string;
  envelope: { flap: string; flapDeep: string; fold: string; foldDeep: string; liner: string; back: string; monogram: string };
  foil: { base: string; light: string; dark: string; bright: string; glitter: string };
  confetti: string[];
};

export const THEMES: Record<ThemeId, InvitationTheme> = {
  ivory: {
    paper: "#f3ebdd", ink: "#2a1a1d", muted: "#7a6a66", accent: "#5e1f2a", gold: "#b9933e", goldSoft: "#e2d3a6",
    envelope: { flap: "#f4ede0", flapDeep: "#e4dac8", fold: "#efe7d8", foldDeep: "#e8dfcd", liner: "#d9cfbb", back: "#e3d9c6", monogram: "#dcd2bf" },
    foil: { base: "#ded0b0", light: "#ece2c8", dark: "#bea878", bright: "#f6eeda", glitter: "#fffaeb" },
    confetti: ["#b9933e", "#d4b96a", "#e2d3a6", "#f3ebdd", "#8c6d2f"],
  },
  sage: {
    paper: "#eef0e6", ink: "#1f2a22", muted: "#66715f", accent: "#3f5a3f", gold: "#a8925a", goldSoft: "#d9d0b0",
    envelope: { flap: "#e9ecdf", flapDeep: "#d6dbc9", fold: "#e3e7d8", foldDeep: "#d9decc", liner: "#c6ccb4", back: "#d2d8c3", monogram: "#cfd5c0" },
    foil: { base: "#cfd4bd", light: "#e0e4d0", dark: "#a9b08f", bright: "#eef1e2", glitter: "#fbfcf4" },
    confetti: ["#a8925a", "#c9b985", "#d9d0b0", "#eef0e6", "#6f7f5a"],
  },
  navy: {
    paper: "#f6efe9", ink: "#1a2238", muted: "#6b6f7c", accent: "#233457", gold: "#c39a5a", goldSoft: "#e9d6b5",
    envelope: { flap: "#2a3b63", flapDeep: "#1e2c4c", fold: "#26365b", foldDeep: "#1f2e4f", liner: "#f1e4d6", back: "#34466f", monogram: "#c39a5a" },
    foil: { base: "#e4d3b6", light: "#f0e3cc", dark: "#c3a878", bright: "#f8f0e0", glitter: "#fffaf0" },
    confetti: ["#c39a5a", "#e9d6b5", "#f6efe9", "#d9b88a", "#233457"],
  },
  noir: {
    paper: "#111111", ink: "#f2e9d8", muted: "#a89f90", accent: "#d4af61", gold: "#d4af61", goldSoft: "#7a6435",
    envelope: { flap: "#1c1c1c", flapDeep: "#0d0d0d", fold: "#181818", foldDeep: "#101010", liner: "#3a3122", back: "#242424", monogram: "#d4af61" },
    foil: { base: "#2b2519", light: "#4a3f2a", dark: "#1a160f", bright: "#6b5a38", glitter: "#f0d68a" },
    confetti: ["#d4af61", "#f0d68a", "#7a6435", "#f2e9d8", "#b28f4a"],
  },
};

export const DEFAULT_THEME_ID: ThemeId = "ivory";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function getTheme(id: ThemeId | null | undefined): InvitationTheme {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME_ID];
}

export function invitationThemeStyle(id: ThemeId | null | undefined): CSSProperties {
  const t = getTheme(id);
  return {
    "--inv-paper": t.paper,
    "--inv-ink": t.ink,
    "--inv-muted": t.muted,
    "--inv-accent": t.accent,
    "--inv-gold": t.gold,
    "--inv-gold-soft": t.goldSoft,
    "--inv-env-flap": t.envelope.flap,
    "--inv-env-flap-deep": t.envelope.flapDeep,
    "--inv-env-fold": t.envelope.fold,
    "--inv-env-fold-deep": t.envelope.foldDeep,
    "--inv-env-liner": t.envelope.liner,
    "--inv-env-back": t.envelope.back,
    "--inv-env-monogram": t.envelope.monogram,
  } as CSSProperties;
}
```

- [x] **Step 4: Run the theme test**

Run: `npx vitest run tests/unit/themes.test.ts`
Expected: PASS.

- [x] **Step 5: Thread the theme through the stage and pages**

`invitation-stage.tsx`:

```tsx
import type { ReactNode } from "react";

import type { ThemeId } from "@/db/schema/enums";
import { invitationThemeStyle } from "@/components/invitation/invitation-theme";

/** Full-viewport paper background with safe-area padding; hosts the card. */
export function InvitationStage({ theme, children }: { theme?: ThemeId; children: ReactNode }) {
  return (
    <main
      style={invitationThemeStyle(theme)}
      className="flex min-h-dvh flex-1 flex-col bg-(--inv-paper) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-(--inv-ink)"
    >
      {children}
    </main>
  );
}
```

In `e/[slug]/page.tsx`, `i/[token]/page.tsx`, `q/[qrToken]/page.tsx` change `<InvitationStage>` to `<InvitationStage theme={event.theme}>` (in `q` the event is `row.event`).

- [x] **Step 6: Envelope reads CSS variables**

In `envelope-gate.tsx` replace literal colours:

- liner: `background: "linear-gradient(180deg, var(--inv-env-liner) 0%, color-mix(in srgb, var(--inv-env-liner) 70%, var(--inv-paper)) 60%)"`
- `<Fold clip={FOLD_LEFT} shade="linear-gradient(90deg, var(--inv-env-fold), var(--inv-env-fold-deep))" />`, right: `270deg`, bottom: `linear-gradient(0deg, var(--inv-env-fold), var(--inv-env-fold-deep))`
- flap front: `background: "linear-gradient(180deg, var(--inv-env-flap) 0%, color-mix(in srgb, var(--inv-env-flap) 60%, var(--inv-env-flap-deep)) 42%, var(--inv-env-flap-deep) 58%)"`
- flap back: replace `bg-[#e3d9c6]` with `bg-(--inv-env-back)`
- monogram: replace `text-[#dcd2bf]` with `text-(--inv-env-monogram)`
- the seam shadow and veil already use the paper/ink variables — for `noir` the shadow `rgba(42,26,29,…)` is invisible; change the seam shadow to `background: "color-mix(in srgb, var(--inv-ink) 10%, transparent)"`.

- [x] **Step 7: Foil and confetti from props**

In `scratch-photo.tsx`: add props `foil: InvitationTheme["foil"]` and `confetti: string[]`; delete the `GOLD` constant; replace the literal `rgba(...)` tints with `withAlpha(foil.base, 0.97)` etc. Add the helper at the bottom of the file:

```ts
/** "#rrggbb" + alpha → "rgba(r, g, b, a)" for canvas fills. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(2)})`;
}
```

Mapping: base fill → `withAlpha(foil.base, 0.97)`; fine grain three tones → `foil.light` / `foil.dark` / `foil.bright`; coarse flecks the same three; glitter → `foil.glitter`. `burst(kind, colors)` takes the palette as a second argument; call sites pass `confetti`.

In `invitation-hero.tsx` add props `foil` and `confetti` and pass them to `ScratchPhoto`. In `invitation-card.tsx` compute `const theme = getTheme(event.theme)` and pass `foil={theme.foil} confetti={theme.confetti}`.

- [x] **Step 8: OG image uses the theme**

In `src/app/(guest)/e/[slug]/opengraph-image.tsx` replace the literal paper/ink colours with `const theme = getTheme(event.theme)` → `theme.paper` for the background and `theme.ink` for the names (import `getTheme` from `@/components/invitation/invitation-theme`). Open `/e/lhtestev01/opengraph-image` after the next step to confirm.

- [x] **Step 9: Verify visually and run the gate**

Run: `npm run typecheck && npm run lint && npx vitest run`
Then temporarily set the local test event to `navy`:
`node --env-file=.env.local --input-type=module -e "import postgres from 'postgres'; const s=postgres(process.env.DATABASE_URL,{max:1,prepare:false}); await s\`update events set theme='navy' where slug='lhtestev01'\`; await s.end();"`
and open `http://localhost:3000/e/lhtestev01` in `npm run dev`: navy envelope, gold monogram, cream foil. Set it back to `ivory` afterwards.

- [x] **Step 10: Commit**

```bash
git add src/components/invitation src/app/(guest) tests/unit/themes.test.ts
git commit -m "feat(invitation): four colour themes driving envelope, foil and confetti"
```

---

### Task 4: Theme picker and gift section in the event form

**Files:**
- Create: `src/components/dashboard/theme-picker.tsx`
- Modify: `src/components/dashboard/event-form.tsx` (after the invitation section, before RSVP)
- Modify: `src/messages/ar.json`, `src/messages/en.json`
- Test: `tests/e2e/invitation.spec.ts` (extend)

**Interfaces:**
- Produces: `ThemePicker({ name, defaultValue }: { name: "theme"; defaultValue: ThemeId })` — renders four labelled radio inputs (`value` = theme id) so the existing `FormData` flow needs no JS.

- [ ] **Step 1: Messages**

`ar.json` → `Event`:

```json
    "sectionTheme": "ألوان الدعوة",
    "themeHint": "تتغير ألوان الظرف والبطاقة والقصاصات معًا.",
    "themes": { "ivory": "عاجي وعنابي", "sage": "زيتي وذهبي", "navy": "كحلي وذهبي", "noir": "أسود وذهبي" },
    "sectionGift": "هدية رقمية (نقوط)",
    "giftHint": "يظهر للضيوف رقم المحفظة أو عنوان إنستاباي مع زر نسخ. اختياري.",
    "giftEnabled": "عرض قسم الهدية في الدعوة",
    "giftHandle": "رقم المحفظة أو عنوان إنستاباي",
    "giftHandleHint": "مثال: 01012345678 أو ahmed@instapay",
    "giftNote": "رسالة قصيرة",
    "giftNoteHint": "مثال: حضوركم أغلى هدية، ولمن أحب المشاركة:",
```

`en.json` → `Event`:

```json
    "sectionTheme": "Invitation colours",
    "themeHint": "Envelope, card and confetti change together.",
    "themes": { "ivory": "Ivory & oxblood", "sage": "Sage & gold", "navy": "Navy & gold", "noir": "Black & gold" },
    "sectionGift": "Digital gift",
    "giftHint": "Shows a wallet number or InstaPay address with a copy button. Optional.",
    "giftEnabled": "Show the gift section on the invitation",
    "giftHandle": "Wallet number or InstaPay address",
    "giftHandleHint": "e.g. 01012345678 or ahmed@instapay",
    "giftNote": "Short note",
    "giftNoteHint": "e.g. Your presence is the best gift; for those who wish to contribute:",
```

Run `npx vitest run tests/unit/messages.test.ts` → PASS (key parity).

- [ ] **Step 2: Theme picker component**

```tsx
// src/components/dashboard/theme-picker.tsx
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { THEMES } from "@/components/invitation/invitation-theme";
import { THEME_IDS, type ThemeId } from "@/db/schema/enums";
import { cn } from "@/lib/utils";

type Props = { name: "theme"; defaultValue: ThemeId };

/** Four swatches as native radios; the preview is a tiny envelope in the palette. */
export function ThemePicker({ name, defaultValue }: Props) {
  const t = useTranslations("Event.themes");
  const [value, setValue] = useState<ThemeId>(defaultValue);

  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {THEME_IDS.map((id) => {
        const theme = THEMES[id];
        const selected = value === id;
        return (
          <label
            key={id}
            className={cn(
              "cursor-pointer rounded-lg border p-2 transition-colors focus-within:ring-2 focus-within:ring-ring",
              selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={selected}
              onChange={() => setValue(id)}
              className="sr-only"
            />
            <div
              aria-hidden="true"
              className="relative aspect-[4/3] overflow-hidden rounded-md"
              style={{ background: theme.paper }}
            >
              <div className="absolute inset-x-[12%] top-[30%] h-[60%] rounded-sm" style={{ background: theme.envelope.fold }} />
              <div
                className="absolute inset-x-[12%] top-[30%] h-[35%]"
                style={{ background: theme.envelope.flap, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
              />
              <span
                className="font-heading absolute top-[38%] left-1/2 -translate-x-1/2 text-xs"
                style={{ color: theme.envelope.monogram }}
              >
                A&amp;S
              </span>
              <span className="absolute right-2 bottom-2 size-3 rounded-full" style={{ background: theme.accent }} />
              <span className="absolute right-6 bottom-2 size-3 rounded-full" style={{ background: theme.gold }} />
            </div>
            <p className="mt-2 text-center text-sm">{t(id)}</p>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Add the two sections to the form**

In `event-form.tsx`, between the invitation card (`sectionInvitation`) and the RSVP card, add:

```tsx
      <Card>
        <CardHeader>
          <CardTitle>{t("sectionTheme")}</CardTitle>
          <CardDescription>{t("themeHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker name="theme" defaultValue={d.theme ?? "ivory"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionGift")}</CardTitle>
          <CardDescription>{t("giftHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox id="giftEnabled" name="giftEnabled" defaultChecked={Boolean(d.giftEnabled)} />
              <FieldLabel htmlFor="giftEnabled" className="font-normal">
                {t("giftEnabled")}
              </FieldLabel>
            </Field>
            <Field>
              <FieldLabel htmlFor="giftHandle">{t("giftHandle")}</FieldLabel>
              <Input id="giftHandle" name="giftHandle" defaultValue={d.giftHandle ?? ""} dir="ltr" inputMode="email" placeholder={t("giftHandleHint")} />
              <Err errors={errors} field="giftHandle" />
            </Field>
            <Field>
              <FieldLabel htmlFor="giftNote">{t("giftNote")}</FieldLabel>
              <Textarea id="giftNote" name="giftNote" defaultValue={d.giftNote ?? ""} rows={2} maxLength={200} placeholder={t("giftNoteHint")} />
              <Err errors={errors} field="giftNote" />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
```

Import `ThemePicker`. `d` is the existing defaults object typed from `EventFormInput`; `theme`, `giftEnabled`, `giftHandle`, `giftNote` exist on it after Task 2 (check how `d` is built — if it maps from `Event`, add the four fields there).

- [ ] **Step 4: Extend the e2e spec**

Add to `tests/e2e/invitation.spec.ts`:

```ts
  test("host picks a theme and enables the gift section; the invitation reflects both", async ({ page, browser, baseURL }) => {
    const { eventId, slug } = await createPublishedEvent(page);
    await page.goto(`/dashboard/events/${eventId}/edit`);
    await page.getByRole("radio", { name: /كحلي|Navy/ }).check({ force: true });
    await page.getByLabel(/عرض قسم الهدية|Show the gift section/).check();
    await page.fill('input[name="giftHandle"]', "01012345678");
    await page.fill('textarea[name="giftNote"]', "حضوركم أغلى هدية");
    await page.getByRole("button", { name: /حفظ|Save/ }).first().click();
    await expect(page.getByText(/تم حفظ التغييرات|Changes saved/)).toBeVisible();

    const guest = await guestPage(browser, baseURL!);
    await openInvitation(guest.page, slug);
    const paper = await guest.page.locator("main").evaluate((el) => getComputedStyle(el).getPropertyValue("--inv-paper").trim());
    expect(paper).toBe("#f6efe9");
    await expect(guest.page.getByText("حضوركم أغلى هدية")).toBeVisible();
    await expect(guest.page.getByRole("button", { name: /نسخ|Copy/ })).toBeVisible();
    await guest.ctx.close();
  });
```

(The gift assertions pass after Task 5; leave the test in place — it fails red until then, which is the point.)

- [ ] **Step 5: Run unit + lint, then commit**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: green. `npm run test:e2e` → the new test fails on the gift assertions (expected until Task 5).

```bash
git add src/components/dashboard/theme-picker.tsx src/components/dashboard/event-form.tsx src/messages tests/e2e
git commit -m "feat(dashboard): theme picker and digital gift settings"
```

---

### Task 5: Gift section on the invitation

**Files:**
- Create: `src/components/invitation/copy-handle.tsx`
- Create: `src/components/invitation/gift-section.tsx`
- Modify: `src/components/invitation/invitation-card.tsx` (after the venue block, before the second `GoldRule`)
- Modify: `src/messages/*.json` (`Gift` namespace)

**Interfaces:**
- Produces: `GiftSection({ event, locale })` server component; renders nothing unless `event.giftEnabled && event.giftHandle`.

- [ ] **Step 1: Messages**

`ar.json` root:

```json
  "Gift": {
    "title": "هدية رقمية",
    "copy": "نسخ",
    "copied": "تم النسخ",
    "hint": "انسخ الرقم أو العنوان وحوّل من تطبيق البنك أو المحفظة."
  },
```

`en.json`:

```json
  "Gift": {
    "title": "Digital gift",
    "copy": "Copy",
    "copied": "Copied",
    "hint": "Copy the number or address and transfer from your bank or wallet app."
  },
```

- [ ] **Step 2: Copy button (client)**

```tsx
// src/components/invitation/copy-handle.tsx
"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

type Props = { value: string; label: string; copiedLabel: string };

/** Copies the gift handle; falls back to selecting the text when the clipboard is blocked. */
export function CopyHandle({ value, label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const range = document.createRange();
      const el = document.getElementById("gift-handle");
      if (el) {
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-(--inv-gold) px-4 py-2 text-sm text-(--inv-accent) hover:bg-(--inv-gold-soft)/40 focus-visible:ring-2 focus-visible:ring-(--inv-gold) focus-visible:outline-none"
    >
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
```

- [ ] **Step 3: Gift section (server)**

```tsx
// src/components/invitation/gift-section.tsx
import { getTranslations } from "next-intl/server";

import { CopyHandle } from "@/components/invitation/copy-handle";
import type { Event } from "@/db/schema";
import type { IntlLocale } from "@/lib/i18n/config";

type Props = { event: Pick<Event, "giftEnabled" | "giftHandle" | "giftNote">; locale: IntlLocale };

/** Optional نقوط block: note, the handle in large ltr text, and a copy button. */
export async function GiftSection({ event, locale }: Props) {
  if (!event.giftEnabled || !event.giftHandle) return null;
  const t = await getTranslations({ locale, namespace: "Gift" });
  return (
    <section className="w-full space-y-3 text-center">
      <p className="font-heading text-xl">{t("title")}</p>
      {event.giftNote ? <p className="text-(--inv-muted)">{event.giftNote}</p> : null}
      <p id="gift-handle" dir="ltr" className="font-mono text-lg tracking-wide select-all">
        {event.giftHandle}
      </p>
      <CopyHandle value={event.giftHandle} label={t("copy")} copiedLabel={t("copied")} />
      <p className="text-xs text-(--inv-muted)">{t("hint")}</p>
    </section>
  );
}
```

- [ ] **Step 4: Wire into the card**

In `invitation-card.tsx` after the `</address>` block (still inside the body `div`), add `<GiftSection event={event} locale={locale} />`.

- [ ] **Step 5: Run e2e and gate**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run test:e2e`
Expected: both e2e tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/invitation src/messages
git commit -m "feat(invitation): digital gift section with copy button"
```

---

### Task 6: Calendar links and `.ics` route

**Files:**
- Create: `src/lib/calendar.ts`
- Create: `src/app/(guest)/e/[slug]/event.ics/route.ts`
- Create: `src/components/invitation/add-to-calendar.tsx`
- Modify: `src/components/invitation/invitation-card.tsx` (below the date/time block)
- Modify: `src/messages/*.json` (`Calendar` namespace)
- Test: `tests/unit/calendar.test.ts`

**Interfaces:**
- Produces (pure, `src/lib/calendar.ts`):
  ```ts
  export type CalendarEvent = { uid: string; title: string; description?: string | null; location?: string | null; start: Date; end: Date | null; url?: string };
  export const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;
  export function resolveEnd(start: Date, end: Date | null): Date;
  export function buildIcs(ev: CalendarEvent, now?: Date): string;      // CRLF, folded at 75 octets, escaped
  export function googleCalendarUrl(ev: CalendarEvent): string;
  export function outlookCalendarUrl(ev: CalendarEvent): string;
  export function icsFilename(title: string): string;                    // "da3wety-<slugified>.ics"
  ```

- [ ] **Step 1: Write the failing unit tests**

```ts
// tests/unit/calendar.test.ts
import { describe, expect, it } from "vitest";

import { buildIcs, googleCalendarUrl, icsFilename, outlookCalendarUrl, resolveEnd } from "@/lib/calendar";

const ev = {
  uid: "abc123@da3wety.com",
  title: "زفاف أحمد وسارة",
  description: "يسعدنا حضوركم؛ العنوان: كورنيش المعادي\nالقاهرة",
  location: "قاعة النيل, كورنيش المعادي",
  start: new Date("2026-10-15T16:00:00.000Z"),
  end: null,
  url: "https://da3wety.com/e/lhtestev01",
};

describe("calendar", () => {
  it("defaults the end to start + 4h", () => {
    expect(resolveEnd(ev.start, null).toISOString()).toBe("2026-10-15T20:00:00.000Z");
    expect(resolveEnd(ev.start, new Date("2026-10-15T18:00:00.000Z")).toISOString()).toBe("2026-10-15T18:00:00.000Z");
  });

  it("builds a valid ICS with UTC times, escaping and CRLF", () => {
    const ics = buildIcs(ev, new Date("2026-09-16T10:00:00.000Z"));
    const unfolded = ics.replace(/\r\n /g, ""); // RFC 5545 unfolding: long lines are split with CRLF + space
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261015T160000Z");
    expect(ics).toContain("DTEND:20261015T200000Z");
    expect(ics).toContain("DTSTAMP:20260916T100000Z");
    expect(ics).toContain("UID:abc123@da3wety.com");
    expect(unfolded).toContain("LOCATION:قاعة النيل\\, كورنيش المعادي");
    expect(unfolded).toContain("DESCRIPTION:يسعدنا حضوركم\\; العنوان: كورنيش المعادي\\nالقاهرة");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });

  it("folds long lines with a leading space", () => {
    const ics = buildIcs({ ...ev, description: "x".repeat(200) });
    expect(ics).toMatch(/\r\n x+/);
  });

  it("builds Google and Outlook links", () => {
    const g = new URL(googleCalendarUrl(ev));
    expect(g.searchParams.get("dates")).toBe("20261015T160000Z/20261015T200000Z");
    expect(g.searchParams.get("text")).toBe(ev.title);
    const o = new URL(outlookCalendarUrl(ev));
    expect(o.searchParams.get("startdt")).toBe("2026-10-15T16:00:00.000Z");
    expect(o.searchParams.get("subject")).toBe(ev.title);
  });

  it("makes a safe filename", () => {
    expect(icsFilename("زفاف أحمد وسارة")).toBe("da3wety-invitation.ics");
    expect(icsFilename("Ahmed & Sara's Wedding")).toBe("da3wety-ahmed-sara-s-wedding.ics");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/calendar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/calendar.ts`**

```ts
/**
 * Calendar helpers for the invitation: an RFC 5545 .ics body (Apple/other) and
 * deep links for Google and Outlook. Pure functions; times are UTC instants.
 */
export type CalendarEvent = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date | null;
  url?: string;
};

export const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;

export function resolveEnd(start: Date, end: Date | null): Date {
  return end ?? new Date(start.getTime() + DEFAULT_DURATION_MS);
}

/** 20261015T160000Z */
function stampUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const next = current + ch;
    if (Buffer.byteLength(next, "utf8") > 75 - (out.length ? 1 : 0)) {
      out.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  out.push(current);
  return out.map((l, i) => (i ? ` ${l}` : l)).join("\r\n");
}

export function buildIcs(ev: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Da3wety//Invitation//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${stampUtc(now)}`,
    `DTSTART:${stampUtc(ev.start)}`,
    `DTEND:${stampUtc(resolveEnd(ev.start, ev.end))}`,
    `SUMMARY:${escapeText(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${stampUtc(ev.start)}/${stampUtc(resolveEnd(ev.start, ev.end))}`,
  });
  if (ev.description) p.set("details", ev.description);
  if (ev.location) p.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function outlookCalendarUrl(ev: CalendarEvent): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    startdt: ev.start.toISOString(),
    enddt: resolveEnd(ev.start, ev.end).toISOString(),
  });
  if (ev.description) p.set("body", ev.description);
  if (ev.location) p.set("location", ev.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`;
}

/** ASCII-only filename; Arabic titles fall back to a generic name. */
export function icsFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `da3wety-${slug || "invitation"}.ics`;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/calendar.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Route handler**

```ts
// src/app/(guest)/e/[slug]/event.ics/route.ts
import { notFound } from "next/navigation";

import { buildIcs, icsFilename } from "@/lib/calendar";
import { publicEnv } from "@/lib/env";
import { getVisibleEventBySlug } from "@/lib/invitation-access";

export async function GET(_req: Request, { params }: RouteContext<"/e/[slug]/event.ics">) {
  const { slug } = await params;
  const ctx = await getVisibleEventBySlug(slug);
  if (!ctx) notFound();
  const { event } = ctx;
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const body = buildIcs({
    uid: `${event.id}@da3wety.com`,
    title: event.title,
    description: event.description,
    location: [event.venueName, event.venueAddress].filter(Boolean).join(", ") || null,
    start: event.startsAt,
    end: event.endsAt,
    url: `${site}/e/${slug}`,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(event.title)}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
```

(`RouteContext` is Next 16's generated helper type, like `PageProps`; if typecheck complains, type the second argument as `{ params: Promise<{ slug: string }> }`.)

- [ ] **Step 6: Messages and the component**

`ar.json` root `"Calendar": { "add": "أضف إلى التقويم", "google": "Google", "apple": "Apple / iPhone", "outlook": "Outlook" }`; `en.json` `"Calendar": { "add": "Add to calendar", "google": "Google", "apple": "Apple / iPhone", "outlook": "Outlook" }`.

```tsx
// src/components/invitation/add-to-calendar.tsx
import { CalendarPlusIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Event } from "@/db/schema";
import { googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { publicEnv } from "@/lib/env";
import type { IntlLocale } from "@/lib/i18n/config";

type Props = { event: Event; locale: IntlLocale };

/** Google and Outlook open in a new tab; Apple downloads the .ics route. */
export async function AddToCalendar({ event, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Calendar" });
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const cal: CalendarEvent = {
    uid: `${event.id}@da3wety.com`,
    title: event.title,
    description: event.description,
    location: [event.venueName, event.venueAddress].filter(Boolean).join(", ") || null,
    start: event.startsAt,
    end: event.endsAt,
    url: `${site}/e/${event.slug}`,
  };
  const linkClass =
    "inline-flex items-center gap-1.5 rounded-full border border-(--inv-gold) px-3 py-1.5 text-xs text-(--inv-accent) hover:bg-(--inv-gold-soft)/40 focus-visible:ring-2 focus-visible:ring-(--inv-gold) focus-visible:outline-none";
  return (
    <div className="space-y-2">
      <p className="inline-flex items-center gap-1.5 text-sm text-(--inv-muted)">
        <CalendarPlusIcon className="size-4" />
        {t("add")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <a className={linkClass} href={googleCalendarUrl(cal)} target="_blank" rel="noreferrer noopener">{t("google")}</a>
        <a className={linkClass} href={`/e/${event.slug}/event.ics`}>{t("apple")}</a>
        <a className={linkClass} href={outlookCalendarUrl(cal)} target="_blank" rel="noreferrer noopener">{t("outlook")}</a>
      </div>
    </div>
  );
}
```

In `invitation-card.tsx`, directly after the date/time `div`, add `<AddToCalendar event={event} locale={locale} />`.

- [ ] **Step 7: E2E assertion**

Append to the first e2e test, after the RSVP thanks assertion:

```ts
    const [download] = await Promise.all([
      guest.page.waitForEvent("download"),
      guest.page.getByRole("link", { name: /Apple/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.ics$/);
```

- [ ] **Step 8: Gate and commit**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run test:e2e`
Expected: green.

```bash
git add src/lib/calendar.ts "src/app/(guest)/e/[slug]/event.ics" src/components/invitation src/messages tests
git commit -m "feat(invitation): add-to-calendar links and .ics download"
```

---

### Task 7: Countdown in the hero

**Files:**
- Create: `src/lib/countdown.ts`
- Create: `src/components/invitation/countdown.tsx`
- Modify: `src/components/invitation/invitation-hero.tsx` (new `countdown` slot after `date`)
- Modify: `src/components/invitation/invitation-card.tsx`
- Modify: `src/messages/*.json` (`Countdown` namespace)
- Test: `tests/unit/countdown.test.ts`

**Interfaces:**
- Produces: `countdownParts(target: Date, now: Date): { days: number; hours: number; minutes: number } | null` (null once `now >= target`).
- Produces: `Countdown({ target: string /* ISO */ })` client component; renders nothing when null.

- [ ] **Step 1: Failing unit test**

```ts
// tests/unit/countdown.test.ts
import { describe, expect, it } from "vitest";

import { countdownParts } from "@/lib/countdown";

describe("countdownParts", () => {
  it("splits the remaining time into days, hours, minutes (floored)", () => {
    const target = new Date("2026-10-15T16:00:00.000Z");
    expect(countdownParts(target, new Date("2026-10-13T13:30:20.000Z"))).toEqual({ days: 2, hours: 2, minutes: 29 });
  });

  it("is null at or after the target", () => {
    const t = new Date("2026-10-15T16:00:00.000Z");
    expect(countdownParts(t, t)).toBeNull();
    expect(countdownParts(t, new Date(t.getTime() + 1))).toBeNull();
  });

  it("ignores the DST change (uses absolute time)", () => {
    // Cairo clocks jump on 2026-04-24 00:00; 24 h of wall time before the jump is still 24 h.
    expect(countdownParts(new Date("2026-04-24T02:00:00+03:00"), new Date("2026-04-23T02:00:00+02:00"))).toEqual({ days: 0, hours: 23, minutes: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/countdown.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/countdown.ts
export type CountdownParts = { days: number; hours: number; minutes: number };

/** Whole days/hours/minutes until `target`; null once it has passed. */
export function countdownParts(target: Date, now: Date): CountdownParts | null {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;
  const minutesTotal = Math.floor(ms / 60_000);
  return {
    days: Math.floor(minutesTotal / (60 * 24)),
    hours: Math.floor((minutesTotal % (60 * 24)) / 60),
    minutes: minutesTotal % 60,
  };
}
```

Run the test → PASS.

- [ ] **Step 4: Messages**

`ar.json` root: `"Countdown": { "days": "يوم", "hours": "ساعة", "minutes": "دقيقة", "label": "باقي على المناسبة" }`
`en.json` root: `"Countdown": { "days": "Days", "hours": "Hours", "minutes": "Mins", "label": "Until the big day" }`

- [ ] **Step 5: Component**

```tsx
// src/components/invitation/countdown.tsx
"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { captionClass } from "@/components/invitation/caption";
import { countdownParts, type CountdownParts } from "@/lib/countdown";

type Props = { target: string };

/**
 * Days / hours / minutes to the event, re-computed once a minute. Renders null
 * until mounted (server and client clocks differ) and once the event has begun.
 */
export function Countdown({ target }: Props) {
  const t = useTranslations("Countdown");
  const locale = useLocale();
  const format = useFormatter();
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const goal = new Date(target);
    const tick = () => setParts(countdownParts(goal, new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [target]);

  if (!parts) return null;

  const cell = (value: number, label: string) => (
    <div className="flex flex-col items-center">
      <span className="font-heading text-3xl leading-none tabular-nums">{format.number(value)}</span>
      <span className={`mt-1 text-(--inv-muted) ${captionClass(locale, "text-[10px]")}`}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-2" aria-live="off">
      <p className={`text-(--inv-muted) ${captionClass(locale)}`}>{t("label")}</p>
      <div className="flex items-center justify-center gap-4">
        {cell(parts.days, t("days"))}
        <span className="h-7 w-px bg-(--inv-gold)/40" />
        {cell(parts.hours, t("hours"))}
        <span className="h-7 w-px bg-(--inv-gold)/40" />
        {cell(parts.minutes, t("minutes"))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Hero slot**

In `invitation-hero.tsx` add prop `countdown?: ReactNode` and render after the `date` block:

```tsx
          {countdown ? (
            <m.div className="w-full" {...appear(3.1)}>
              {countdown}
            </m.div>
          ) : null}
```

In `invitation-card.tsx` pass `countdown={<Countdown target={event.startsAt.toISOString()} />}`.

- [ ] **Step 7: Gate and commit**

Run: `npm run typecheck && npm run lint && npx vitest run`
Open the local test event: after the reveal, the countdown fades in last.

```bash
git add src/lib/countdown.ts src/components/invitation tests/unit/countdown.test.ts src/messages
git commit -m "feat(invitation): countdown to the event in the hero"
```

---

### Task 8: Wishes wall on the event overview + CSV message column

**Files:**
- Modify: `src/db/queries/guests.ts` (`+ listWishes`)
- Create: `src/components/dashboard/wishes-list.tsx`
- Modify: `src/app/(host)/dashboard/events/[eventId]/page.tsx`
- Modify: `src/app/(host)/dashboard/events/[eventId]/checkin/export/route.ts`
- Modify: `src/messages/*.json` (`Dashboard.wishes`)
- Test: `tests/e2e/invitation.spec.ts` (extend the first test)

**Interfaces:**
- Produces: `listWishes(eventId: string, page = 1, pageSize = 50): Promise<{ items: { guestName: string; status: RsvpStatus; message: string; respondedAt: Date }[]; total: number }>` — only rsvps with a non-empty message, newest first.

- [ ] **Step 1: Query**

Append to `src/db/queries/guests.ts`:

```ts
export type Wish = { guestName: string; status: Rsvp["status"]; message: string; respondedAt: Date };

/** RSVP messages for the host's wishes wall, newest first. */
export const listWishes = cache(async (eventId: string, page = 1, pageSize = 50): Promise<{ items: Wish[]; total: number }> => {
  const where = and(eq(rsvps.eventId, eventId), isNotNull(rsvps.message), ne(rsvps.message, ""));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ guestName: guests.name, status: rsvps.status, message: rsvps.message, respondedAt: rsvps.respondedAt })
      .from(rsvps)
      .innerJoin(guests, eq(guests.id, rsvps.guestId))
      .where(where)
      .orderBy(desc(rsvps.respondedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(rsvps).where(where),
  ]);
  return { items: rows.map((r) => ({ ...r, message: r.message ?? "" })), total };
});
```

Add `isNotNull`, `ne`, `desc`, `count` to the drizzle-orm import if missing.

- [ ] **Step 2: Messages**

`ar.json` `Dashboard`: `"wishes": { "title": "تهاني الضيوف", "empty": "لم يكتب أحد رسالة بعد.", "count": "{count, plural, zero {لا رسائل} one {رسالة واحدة} two {رسالتان} few {# رسائل} many {# رسالة} other {# رسالة}}" }`
`en.json` `Dashboard`: `"wishes": { "title": "Guest wishes", "empty": "No messages yet.", "count": "{count, plural, one {# message} other {# messages}}" }`

- [ ] **Step 3: Component**

```tsx
// src/components/dashboard/wishes-list.tsx
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWishes } from "@/db/queries/guests";

export async function WishesList({ eventId }: { eventId: string }) {
  const [{ items, total }, t, tg, format] = await Promise.all([
    listWishes(eventId),
    getTranslations("Dashboard.wishes"),
    getTranslations("Guests.filters"),
    getFormatter(),
  ]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("count", { count: total })}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {items.map((w, i) => (
              <li key={i} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{w.guestName}</span>
                  <Badge variant={w.status === "attending" ? "default" : "secondary"}>{tg(w.status === "attending" ? "attending" : "declined")}</Badge>
                  <span className="text-xs text-muted-foreground">{format.dateTime(w.respondedAt, "shortWithTime")}</span>
                </div>
                <p className="whitespace-pre-line">{w.message}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

Add `<WishesList eventId={eventId} />` at the end of the overview page's `space-y-6` div.

- [ ] **Step 4: CSV column**

In the export route add `"message"` to `header` after `"rsvp"`, and the matching value from the row's rsvp (`row.rsvp?.message ?? ""`). Check how rows are built in that file and add the field in the same place the `rsvp` status is read.

- [ ] **Step 5: E2E**

In the first e2e test, fill `textarea[name="message"]` with `"ألف مبروك!"` before submitting the RSVP, and after returning to the dashboard: `await expect(page.getByText("ألف مبروك!")).toBeVisible();`

- [ ] **Step 6: Gate and commit**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run test:e2e`

```bash
git add src/db/queries/guests.ts src/components/dashboard/wishes-list.tsx "src/app/(host)/dashboard/events/[eventId]" src/messages tests/e2e
git commit -m "feat(dashboard): guest wishes wall and message column in the CSV export"
```

---

### Task 9: Remind pending guests + copy all pending links

**Files:**
- Modify: `src/components/dashboard/guest-actions.tsx`
- Create: `src/components/dashboard/copy-pending-links.tsx`
- Modify: `src/app/(host)/dashboard/events/[eventId]/guests/page.tsx`
- Modify: `src/messages/*.json` (`Guests.reminderText`, `Guests.remind`, `Guests.copyPending`, `Guests.copiedPending`)
- Test: `tests/unit/share-text.test.ts`

**Interfaces:**
- `GuestActions` gains props `reminderText: string` and `pending: boolean`; when `pending`, a second WhatsApp button (bell icon) opens `wa.me` with `${reminderText}\n${personalLink}`.
- Produces: `pendingLinksText(rows: { name: string; link: string }[]): string` in `src/lib/share-text.ts` — `"name — link"` per line.

- [ ] **Step 1: Messages**

`ar.json` `Guests`: `"remind": "تذكير على واتساب"`, `"reminderText": "تذكير لطيف 🌷 لم يصلنا ردكم على دعوة {title} بعد. يسعدنا تأكيد حضوركم من هنا:"`, `"copyPending": "نسخ روابط من لم يردّوا"`, `"copiedPending": "{count, plural, zero {لا روابط} one {تم نسخ رابط واحد} two {تم نسخ رابطين} few {تم نسخ # روابط} many {تم نسخ # رابطًا} other {تم نسخ # رابط}}"`.
`en.json` `Guests`: `"remind": "Remind on WhatsApp"`, `"reminderText": "A gentle reminder 🌷 we have not received your reply to the invitation for {title}. Please confirm here:"`, `"copyPending": "Copy links of pending guests"`, `"copiedPending": "{count, plural, one {Copied # link} other {Copied # links}}"`.

- [ ] **Step 2: Pure helper + test**

```ts
// src/lib/share-text.ts
/** One "name — link" per line; the link is last on its line so RTL text cannot wrap it. */
export function pendingLinksText(rows: { name: string; link: string }[]): string {
  return rows.map((r) => `${r.name} — ${r.link}`).join("\n");
}
```

```ts
// tests/unit/share-text.test.ts
import { describe, expect, it } from "vitest";

import { pendingLinksText } from "@/lib/share-text";

describe("pendingLinksText", () => {
  it("puts each guest on its own line with the link last", () => {
    expect(pendingLinksText([{ name: "عمر", link: "https://x/i/a" }, { name: "Sara", link: "https://x/i/b" }])).toBe(
      "عمر — https://x/i/a\nSara — https://x/i/b",
    );
  });
  it("is empty for no rows", () => {
    expect(pendingLinksText([])).toBe("");
  });
});
```

Run: `npx vitest run tests/unit/share-text.test.ts` → PASS.

- [ ] **Step 3: Remind button in `GuestActions`**

Add props `reminderText: string; pending: boolean`. Next to the existing WhatsApp button add:

```tsx
        {pending ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("remind")}
            onClick={() => window.open(remindUrl, "_blank", "noopener")}
          >
            <BellRingIcon />
          </Button>
        ) : null}
```

with `const remindUrl = guest.phone ? \`https://wa.me/${whatsappDigits(guest.phone)}?text=${encodeURIComponent(\`${reminderText}\n${personalLink}\`)}\` : \`https://wa.me/?text=${encodeURIComponent(\`${reminderText}\n${personalLink}\`)}\`;` and `BellRingIcon` from `lucide-react`.

- [ ] **Step 4: Copy-pending button**

```tsx
// src/components/dashboard/copy-pending-links.tsx
"use client";

import { ClipboardListIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { pendingLinksText } from "@/lib/share-text";

type Props = { rows: { name: string; link: string }[] };

export function CopyPendingLinks({ rows }: Props) {
  const t = useTranslations("Guests");
  async function copy() {
    try {
      await navigator.clipboard.writeText(pendingLinksText(rows));
      toast.success(t("copiedPending", { count: rows.length }));
    } catch {
      toast.error(t("copyPending"));
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} disabled={rows.length === 0}>
      <ClipboardListIcon />
      {t("copyPending")}
    </Button>
  );
}
```

- [ ] **Step 5: Wire the guests page**

In `guests/page.tsx`: `const reminderText = tGuests("reminderText", { title: ctx.event.title });` (the page already has a `Guests` translator; use it). Pass `reminderText={reminderText} pending={row.rsvp === null}` to each `GuestActions`. Compute `const pendingRows = list.rows.filter((r) => r.rsvp === null).map((r) => ({ name: r.guest.name, link: \`${siteUrl}/i/${r.guest.token}\` }));` and render `<CopyPendingLinks rows={pendingRows} />` next to the existing toolbar buttons. (Current page only — the helper text says so via the button count.)

- [ ] **Step 6: Gate and commit**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run test:e2e`

```bash
git add src/lib/share-text.ts src/components/dashboard "src/app/(host)/dashboard/events/[eventId]/guests/page.tsx" src/messages tests/unit/share-text.test.ts
git commit -m "feat(guests): WhatsApp reminder for pending guests and copy-all-pending links"
```

---

### Task 10: Migrate prod, deploy, verify

**Files:** none (operations)

- [ ] **Step 1: Bundle check**

Run: `npm run build` and compare the `/e/[slug]` first-load JS to the previous build (`git stash`-free: read the sizes printed by `next build` before/after, or `ls -la .next/static/chunks`). Must be ≤ +15 KB gz. If over, lazy-load `Countdown` with `next/dynamic`.

- [ ] **Step 2: Apply the migration to prod**

Run: `node --env-file=.env.prod node_modules/drizzle-kit/bin.cjs migrate`
Expected: `migrations applied successfully!`; re-run → no-op.

- [ ] **Step 3: Push and watch**

```bash
git push origin main
```

Wait for the Vercel deployment to be READY, then: `curl -sI https://da3wety.vercel.app/e/<any-published-slug>/event.ics | grep -i content-type` → `text/calendar`.

- [ ] **Step 4: Update the README feature list**

Add one line each for themes, gift, calendar/countdown, wishes/reminders under a "Features" heading; commit `docs: readme features for v1.1 plan 1`.
