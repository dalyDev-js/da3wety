# Plan A — Brand design system + landing page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

The product (invitations, RSVP, gallery, check-in) is live at `da3wety.vercel.app`, but the host surface has no marketing presence: `/` is a bare wordmark with two buttons, and the app theme is pure neutral grey while the invitations themselves carry a rich ivory/gold/burgundy identity. The business owner wants a landing page that drives Google sign-ups, shows the three tiers with EGP prices, and a host UI that feels like the product. Decisions made in brainstorming:

- **Goal:** drive sign-ups (primary CTA → `/dashboard`, which redirects to `/login` when signed out).
- **Pricing:** shown with EGP prices; placeholder values in seed data until real prices are set in the DB.
- **Direction:** brand-forward everywhere — swap the shadcn neutral token values for the ivory theme's palette so every primitive inherits it.
- **Sequencing:** two plans. **Plan A (this one):** tokens + brand primitives + marketing components + landing/login/not-found. **Plan B (later, separate brainstorm):** dashboard redesign on top of A, keeping top bar + event tabs navigation.

**Goal:** Ship a brand-forward landing page built from reusable shadcn-based components, with the app theme re-tokenised to the invitation identity.

**Architecture:** Token swap in `globals.css` (option A) so `Button`, `Card`, etc. become burgundy/ivory/gold with zero component edits. New `src/components/brand/` holds cross-surface marks (wordmark, gold rule, frame corners, eyebrow) — the invitation components are refactored to import from there. New `src/components/marketing/` holds server-component sections that take translated props; `src/app/(host)/page.tsx` just composes them. Pricing reads live `packages` rows and derives bullets through a pure, unit-tested `packageHighlights()`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn (radix-nova, `rtl: true`), next-intl, tw-animate-css (CSS-only motion on the landing — no `motion` JS), lucide-react, vitest, Playwright.

**Spec:** Task 1 writes this design into `docs/superpowers/specs/2026-09-20-plan-a-landing-design-system-design.md` and copies this plan to `docs/superpowers/plans/2026-09-20-plan-a-landing-and-design-system.md`.

## Global Constraints

- Follow `AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` before Next.js code.
- `src/components/**` must not import `zod` or `@/lib/validation/*` (except `state`); import animation from `motion/react` never `framer-motion` (ESLint enforces).
- Every new UI string goes in both `src/messages/ar.json` and `src/messages/en.json`; key sets must be identical and Arabic plurals need all six CLDR forms (`tests/unit/messages.test.ts`).
- Arabic is the default locale and RTL; use logical utilities (`ps-`, `pe-`, `start-`, `end-`, `text-start`), never `left/right`.
- Landing must stay a server-rendered page with no `motion` JS; the only client components allowed are `LocaleToggle` and the shadcn `Accordion`.
- Do not change dashboard layouts or flows (Plan B). Existing E2E selectors in `tests/e2e/invitation.spec.ts` must keep passing.
- Never touch `.env.prod`. Prices in prod are set by operators in the DB (`seed.ts` deliberately does not overwrite `price_egp`).
- Prettier `printWidth: 120`; run `npm run format` before each commit.
- Branch: `feat/plan-a-landing-design-system` from `main`.
- Commit trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File map

**Modify**

- `src/app/globals.css` — brand token values + `gold`, `gold-soft`, `paper`, `ink` colours
- `src/app/(host)/layout.tsx` — `themeColor` → paper
- `src/app/(host)/page.tsx` — compose marketing sections
- `src/app/(host)/login/page.tsx`, `src/app/(host)/not-found.tsx` — brand pass
- `src/components/invitation/gold-rule.tsx` → re-export from brand; `invitation-hero.tsx` → use `FrameCorners`
- `src/lib/packages.ts` — `packageHighlights()`
- `src/db/seed-data.ts` — placeholder prices
- `src/messages/ar.json`, `src/messages/en.json` — `Landing.*`, `Auth.*`, `Errors.*` additions
- `tests/unit/packages.test.ts`

**Create**

- `src/components/brand/wordmark.tsx`, `gold-rule.tsx`, `frame-corners.tsx`, `eyebrow.tsx`
- `src/components/marketing/section.tsx`, `site-header.tsx`, `site-footer.tsx`, `hero.tsx`, `invitation-preview.tsx`, `feature-grid.tsx`, `how-it-works.tsx`, `theme-strip.tsx`, `pricing.tsx`, `faq.tsx`, `cta-band.tsx`
- `src/components/ui/accordion.tsx` (via `npx shadcn@latest add accordion`)
- `src/lib/whatsapp.ts` — `supportWhatsAppUrl()`
- `tests/e2e/landing.spec.ts`
- `docs/superpowers/specs/2026-09-20-plan-a-landing-design-system-design.md`, `docs/superpowers/plans/2026-09-20-plan-a-landing-and-design-system.md`

---

### Task 1: Branch, spec and plan documents

**Files:** create the two docs above.

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only && git checkout -b feat/plan-a-landing-design-system
```

- [ ] **Step 2: Write the spec** — the "Context", "Architecture" and section list from this document (tokens, brand primitives, marketing components, landing order, pricing data, login/not-found, tests, out-of-scope) into `docs/superpowers/specs/2026-09-20-plan-a-landing-design-system-design.md`. Copy this plan verbatim to `docs/superpowers/plans/2026-09-20-plan-a-landing-and-design-system.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers && git commit -m "docs: Plan A spec and plan (landing + design system)"
```

---

### Task 2: Brand tokens

**Files:** Modify `src/app/globals.css:56-90` (`:root` block), `src/app/globals.css:6-44` (`@theme inline`), `src/app/(host)/layout.tsx:27` (`themeColor`).

**Interfaces — Produces:** Tailwind utilities `bg-paper`, `text-ink`, `bg-gold`, `text-gold`, `border-gold`, `bg-gold-soft`; CSS vars `--color-gold`, `--color-gold-soft`, `--color-paper`, `--color-ink`.

- [ ] **Step 1: Add the four brand colours to `@theme inline`** (after `--color-foreground`):

```css
--color-paper: var(--paper);
--color-ink: var(--ink);
--color-gold: var(--gold);
--color-gold-soft: var(--gold-soft);
```

- [ ] **Step 2: Replace the `:root` values** (keep `.dark` untouched — dark mode is dormant and out of scope). Values are the ivory invitation palette from `src/components/invitation/invitation-theme.ts`, with a lighter paper for app backgrounds:

```css
:root {
  /* Brand: ivory invitation theme (see components/invitation/invitation-theme.ts) */
  --paper: #f3ebdd;
  --ink: #2a1a1d;
  --gold: #b9933e;
  --gold-soft: #e2d3a6;

  --background: #faf6ee;
  --foreground: var(--ink);
  --card: #ffffff;
  --card-foreground: var(--ink);
  --popover: #ffffff;
  --popover-foreground: var(--ink);
  --primary: #5e1f2a;
  --primary-foreground: var(--paper);
  --secondary: var(--paper);
  --secondary-foreground: var(--ink);
  --muted: #f1eadc;
  --muted-foreground: #7a6a66;
  --accent: #f6efe1;
  --accent-foreground: var(--ink);
  --destructive: oklch(0.577 0.245 27.325);
  --border: #e6dcc8;
  --input: #e6dcc8;
  --ring: var(--gold);
  --chart-1: var(--gold);
  --chart-2: #5e1f2a;
  --chart-3: #3f5a3f;
  --chart-4: #233457;
  --chart-5: var(--ink);
  --radius: 0.625rem;
  --sidebar: var(--paper);
  --sidebar-foreground: var(--ink);
  --sidebar-primary: #5e1f2a;
  --sidebar-primary-foreground: var(--paper);
  --sidebar-accent: #f6efe1;
  --sidebar-accent-foreground: var(--ink);
  --sidebar-border: #e6dcc8;
  --sidebar-ring: var(--gold);
}
```

- [ ] **Step 3: Update `themeColor`** in `src/app/(host)/layout.tsx` from `"#ffffff"` to `"#faf6ee"`.

- [ ] **Step 4: Verify** — `npm run lint && npm run typecheck && npm run build` pass. Start `npm run dev`, open `/dashboard` (dev host) and `/dashboard/events/<id>/guests`: buttons are burgundy, background warm ivory, tables readable, focus rings gold. Screenshot for the PR.

- [ ] **Step 5: Commit** — `git commit -m "feat(theme): brand tokens from the ivory invitation palette"`

---

### Task 3: Brand primitives

**Files:** Create `src/components/brand/{wordmark,gold-rule,frame-corners,eyebrow}.tsx`. Modify `src/components/invitation/gold-rule.tsx` (re-export), `src/components/invitation/invitation-hero.tsx:26-29,56-64` (use `FrameCorners`).

**Interfaces — Produces:**

- `Wordmark({ size?: "sm"|"md"|"lg"|"xl", href?: string, className? })` — Amiri "Da3wety" from `Common.appName`; renders `<Link>` when `href` given, else `<span>`. Server component (uses `getTranslations`).
- `GoldRule({ className? })` — colour `var(--inv-gold, var(--color-gold))` so it works inside an invitation theme scope and on brand surfaces.
- `FrameCorners({ className? })` — the double-hairline bracketed SVG frame, absolutely positioned, `text-[var(--inv-gold,var(--color-gold))]`.
- `eyebrowClass(locale: string, size?: string): string` — re-export of `captionClass` from `components/invitation/caption.ts`; plus `Eyebrow({ locale, children, className? })` rendering a `<p>` with that class and `text-gold`.

- [ ] **Step 1: `src/components/brand/gold-rule.tsx`**

```tsx
/** The double hairline of a printed invitation, with a small lozenge at the centre. */
export function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-[var(--inv-gold,var(--color-gold))] opacity-70" />
      <span className="block size-2 rotate-45 border border-[var(--inv-gold,var(--color-gold))]" />
      <span className="h-px flex-1 bg-[var(--inv-gold,var(--color-gold))] opacity-70" />
    </div>
  );
}
```

Replace the body of `src/components/invitation/gold-rule.tsx` with `export { GoldRule } from "@/components/brand/gold-rule";`.

- [ ] **Step 2: `src/components/brand/frame-corners.tsx`** — move `OUTER`/`INNER` from `invitation-hero.tsx`:

```tsx
/* Double hairline frame with bracketed corners; hairlines stay 1px at any size. */
const OUTER = "M14 6H86A8 8 0 0 0 94 14V146A8 8 0 0 0 86 154H14A8 8 0 0 0 6 146V14A8 8 0 0 0 14 6Z";
const INNER =
  "M15.5 8.5H84.5A8 8 0 0 0 91.5 15.5V144.5A8 8 0 0 0 84.5 151.5H15.5A8 8 0 0 0 8.5 144.5V15.5A8 8 0 0 0 15.5 8.5Z";

export function FrameCorners({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 160"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full text-[var(--inv-gold,var(--color-gold))] ${className}`}
    >
      <path d={OUTER} fill="none" stroke="currentColor" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
      <path d={INNER} fill="none" stroke="currentColor" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
```

In `invitation-hero.tsx` delete the constants and replace the inline `<svg …>…</svg>` with `<FrameCorners />` (import from `@/components/brand/frame-corners`).

- [ ] **Step 3: `src/components/brand/eyebrow.tsx`**

```tsx
import { captionClass } from "@/components/invitation/caption";

export { captionClass as eyebrowClass };

type Props = { locale: string; children: React.ReactNode; className?: string };

/** Small-caps label above a heading (Latin: tracked uppercase; Arabic: medium weight, no tracking). */
export function Eyebrow({ locale, children, className = "" }: Props) {
  return <p className={`${captionClass(locale, "text-[12px]")} text-gold ${className}`}>{children}</p>;
}
```

- [ ] **Step 4: `src/components/brand/wordmark.tsx`**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { cn } from "cn";

const SIZES = { sm: "text-xl", md: "text-2xl", lg: "text-3xl", xl: "text-5xl" } as const;

type Props = { size?: keyof typeof SIZES; href?: string; className?: string };

/** The "Da3wety" mark in Amiri. Link when `href` is given. */
export async function Wordmark({ size = "md", href, className }: Props) {
  const t = await getTranslations("Common");
  const cls = cn("font-heading font-bold tracking-tight text-foreground", SIZES[size], className);
  return href ? (
    <Link href={href} className={cls}>
      {t("appName")}
    </Link>
  ) : (
    <span className={cls}>{t("appName")}</span>
  );
}
```

- [ ] **Step 5: Verify** — `npm run lint && npm run typecheck`; open a published `/e/<slug>` locally: frame and gold rule unchanged.

- [ ] **Step 6: Commit** — `git commit -m "refactor(brand): shared wordmark, gold rule, frame corners and eyebrow"`

---

### Task 4: `packageHighlights()` and placeholder prices

**Files:** Modify `src/lib/packages.ts`, `src/db/seed-data.ts` (`priceEgp` 499 / 999 / 1999), `tests/unit/packages.test.ts`.

**Interfaces — Produces:**

```ts
export type PackageHighlight =
  | { key: "guests"; count: number | null } // null = unlimited
  | { key: "gallery"; included: boolean }
  | { key: "photos"; count: number } // only when gallery
  | { key: "retention"; days: number } // only when gallery
  | { key: "moderation"; included: boolean } // only when gallery
  | { key: "checkin"; included: boolean };
export function packageHighlights(
  pkg: Pick<
    Package,
    "maxGuests" | "galleryEnabled" | "moderationEnabled" | "maxPhotos" | "photoRetentionDays" | "checkinEnabled"
  >,
): PackageHighlight[];
```

- [ ] **Step 1: Failing test** — append to `tests/unit/packages.test.ts`:

```ts
import { packageHighlights } from "@/lib/packages";

describe("packageHighlights", () => {
  it("basic: guests, gallery off, checkin off — no photo rows", () => {
    expect(packageHighlights(byTier.basic)).toEqual([
      { key: "guests", count: 300 },
      { key: "gallery", included: false },
      { key: "checkin", included: false },
    ]);
  });
  it("premium: full list in display order", () => {
    expect(packageHighlights(byTier.premium)).toEqual([
      { key: "guests", count: 1000 },
      { key: "gallery", included: true },
      { key: "photos", count: 1000 },
      { key: "retention", days: 7 },
      { key: "moderation", included: true },
      { key: "checkin", included: true },
    ]);
  });
  it("null maxGuests means unlimited", () => {
    expect(packageHighlights({ ...byTier.basic, maxGuests: null })[0]).toEqual({ key: "guests", count: null });
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/packages.test.ts` → FAIL (`packageHighlights` is not exported).

- [ ] **Step 3: Implement** in `src/lib/packages.ts`:

```ts
export type PackageHighlight =
  | { key: "guests"; count: number | null }
  | { key: "gallery"; included: boolean }
  | { key: "photos"; count: number }
  | { key: "retention"; days: number }
  | { key: "moderation"; included: boolean }
  | { key: "checkin"; included: boolean };

type HighlightSource = Pick<
  Package,
  "maxGuests" | "galleryEnabled" | "moderationEnabled" | "maxPhotos" | "photoRetentionDays" | "checkinEnabled"
>;

/** Display bullets for a tier, in marketing order. Photo rows only appear when the gallery is included. */
export function packageHighlights(pkg: HighlightSource): PackageHighlight[] {
  const out: PackageHighlight[] = [
    { key: "guests", count: pkg.maxGuests },
    { key: "gallery", included: pkg.galleryEnabled },
  ];
  if (pkg.galleryEnabled) {
    out.push(
      { key: "photos", count: pkg.maxPhotos },
      { key: "retention", days: pkg.photoRetentionDays },
      { key: "moderation", included: pkg.moderationEnabled },
    );
  }
  out.push({ key: "checkin", included: pkg.checkinEnabled });
  return out;
}
```

- [ ] **Step 4: Placeholder prices** in `src/db/seed-data.ts`: basic `499`, standard `999`, premium `1999`, with a comment `// Placeholder launch prices; operators set the real value in the DB (seed.ts never overwrites price_egp).`

- [ ] **Step 5: Run** `npx vitest run tests/unit/packages.test.ts` → PASS. Run `npm run db:seed` locally (inserts prices on a fresh DB; existing rows keep their price — set them with `update packages set price_egp = …` locally to see numbers on the landing).

- [ ] **Step 6: Commit** — `git commit -m "feat(packages): packageHighlights for pricing display and placeholder prices"`

---

### Task 5: Landing copy (ar + en)

**Files:** Modify `src/messages/en.json` (`Landing` namespace), `src/messages/ar.json`.

**Interfaces — Produces:** keys used by Tasks 6–10. Replace the existing `Landing` object entirely.

- [ ] **Step 1: `en.json` → `Landing`**

```json
"Landing": {
  "title": "Da3wety — digital invitations for weddings and occasions",
  "description": "Create your event page, send the invitation on WhatsApp, and track guest replies in one place.",
  "nav": { "features": "Features", "howItWorks": "How it works", "pricing": "Pricing", "faq": "FAQ", "login": "Sign in", "cta": "Create your invitation" },
  "hero": {
    "eyebrow": "Digital invitations, made in Egypt",
    "title": "A digital invitation worthy of your celebration",
    "subtitle": "An envelope that opens, a photo that is revealed, and RSVPs that reach you instantly — all from one link you share on WhatsApp.",
    "cta": "Create your invitation",
    "secondary": "See how it works",
    "trust": "No app to install · Works on any phone · Arabic and English"
  },
  "preview": { "eyebrow": "You are invited", "primary": "Ahmed", "and": "&", "secondary": "Sara", "date": "Friday 12 June · 7:00 PM", "attending": "Attending", "declined": "Apologies" },
  "features": {
    "eyebrow": "Everything an occasion needs",
    "title": "More than a card",
    "subtitle": "Each invitation is a small experience for your guests and a control room for you.",
    "items": {
      "envelope": { "title": "An envelope that opens", "body": "Guests tap to open a sealed envelope and scratch to reveal your photo." },
      "rsvp": { "title": "RSVPs with seats", "body": "Guests confirm, choose their seats and leave a wish. You see it instantly." },
      "whatsapp": { "title": "Share on WhatsApp", "body": "One public link, or a personal link per guest, with ready-made reminders." },
      "tickets": { "title": "QR tickets", "body": "Every confirmed guest gets a ticket with a QR code and a short code." },
      "gallery": { "title": "Shared photo gallery", "body": "Guests upload their photos to one gallery you can moderate. Kept for a week." },
      "checkin": { "title": "Door check-in", "body": "Your staff scan tickets at the door from any phone. Live attendance counts." }
    }
  },
  "howItWorks": {
    "eyebrow": "Three steps",
    "title": "From idea to invitation in minutes",
    "steps": {
      "create": { "title": "Create your event", "body": "Names, date, place, a photo and the colours you like." },
      "share": { "title": "Share the link", "body": "Send the public link or a personal link to each guest on WhatsApp." },
      "track": { "title": "Track replies", "body": "Watch RSVPs, wishes and seats come in. Remind those who haven't answered." }
    }
  },
  "themes": { "eyebrow": "Four palettes", "title": "Pick the colours of your day", "names": { "ivory": "Ivory", "sage": "Sage", "navy": "Navy", "noir": "Noir" } },
  "pricing": {
    "eyebrow": "Pricing",
    "title": "One price per event",
    "subtitle": "Pay once for your occasion. Packages are activated after sign-up.",
    "perEvent": "per event",
    "contactForPrice": "Contact us for pricing",
    "popular": "Most popular",
    "cta": "Start with this package",
    "note": "Prices shown are launch prices. Need something custom? Message us on WhatsApp.",
    "highlights": {
      "guests": "{count, plural, =0 {Unlimited guests} one {Up to # guest} other {Up to # guests}}",
      "guestsUnlimited": "Unlimited guests",
      "galleryOn": "Shared photo gallery",
      "galleryOff": "No photo gallery",
      "photos": "{count, plural, one {Up to # photo} other {Up to # photos}}",
      "retention": "{days, plural, one {Photos kept for # day} other {Photos kept for # days}}",
      "moderationOn": "Photo moderation",
      "moderationOff": "No photo moderation",
      "checkinOn": "QR door check-in",
      "checkinOff": "No door check-in"
    }
  },
  "faq": {
    "eyebrow": "Questions",
    "title": "Frequently asked",
    "items": {
      "app": { "q": "Do my guests need an app?", "a": "No. The invitation is a web page that opens in any browser on any phone." },
      "whatsapp": { "q": "How do I send the invitation?", "a": "Copy the link from your dashboard and share it on WhatsApp, or send each guest their personal link." },
      "edit": { "q": "Can I change the invitation after sending it?", "a": "Yes. The link stays the same; guests always see the latest version." },
      "photos": { "q": "How long are gallery photos kept?", "a": "Seven days after the event, then they are deleted automatically." },
      "payment": { "q": "How do I pay?", "a": "Sign in, create your event, then message us on WhatsApp to activate your package." }
    }
  },
  "ctaBand": { "title": "Your celebration deserves a beautiful invitation", "subtitle": "Create it in minutes, share it in seconds.", "cta": "Create your invitation", "whatsapp": "Talk to us on WhatsApp" },
  "footer": { "tagline": "Elegant digital invitations for your occasions", "whatsapp": "WhatsApp", "rights": "© {year} Da3wety. All rights reserved." }
}
```

- [ ] **Step 2: `ar.json` → `Landing`** (same keys; Arabic plurals carry all six forms)

```json
"Landing": {
  "title": "دعوتي — دعوات رقمية للأفراح والمناسبات",
  "description": "أنشئ صفحة مناسبتك، أرسل الدعوة على واتساب، وتابع ردود الضيوف في مكان واحد.",
  "nav": { "features": "المميزات", "howItWorks": "كيف تعمل", "pricing": "الأسعار", "faq": "الأسئلة الشائعة", "login": "تسجيل الدخول", "cta": "أنشئ دعوتك" },
  "hero": {
    "eyebrow": "دعوات رقمية، صُنعت في مصر",
    "title": "دعوة رقمية تليق باحتفالك",
    "subtitle": "ظرف يُفتح، وصورة تُكشف، وردود تصلك في لحظتها — كل ذلك من رابط واحد تشاركه على واتساب.",
    "cta": "أنشئ دعوتك",
    "secondary": "شاهد كيف تعمل",
    "trust": "بدون تطبيق · تعمل على أي هاتف · بالعربية والإنجليزية"
  },
  "preview": { "eyebrow": "أنتم مدعوون", "primary": "أحمد", "and": "و", "secondary": "سارة", "date": "الجمعة ١٢ يونيو · ٧:٠٠ مساءً", "attending": "سأحضر", "declined": "أعتذر" },
  "features": {
    "eyebrow": "كل ما تحتاجه المناسبة",
    "title": "أكثر من مجرد بطاقة",
    "subtitle": "كل دعوة تجربة صغيرة لضيوفك، وغرفة تحكم كاملة لك.",
    "items": {
      "envelope": { "title": "ظرف يُفتح", "body": "يضغط الضيف ليفتح الظرف المختوم، ويكشط ليكشف صورتكم." },
      "rsvp": { "title": "ردود مع عدد المقاعد", "body": "يؤكد الضيف حضوره، يختار مقاعده، ويترك أمنية. تراها فورًا." },
      "whatsapp": { "title": "مشاركة على واتساب", "body": "رابط عام واحد، أو رابط شخصي لكل ضيف، مع رسائل تذكير جاهزة." },
      "tickets": { "title": "تذاكر QR", "body": "كل ضيف مؤكد يحصل على تذكرة برمز QR ورمز قصير." },
      "gallery": { "title": "معرض صور مشترك", "body": "يرفع الضيوف صورهم إلى معرض واحد يمكنك مراجعته. يبقى لأسبوع." },
      "checkin": { "title": "تسجيل الحضور عند الباب", "body": "يمسح فريقك التذاكر عند الباب من أي هاتف. أعداد الحضور مباشرة." }
    }
  },
  "howItWorks": {
    "eyebrow": "ثلاث خطوات",
    "title": "من الفكرة إلى الدعوة في دقائق",
    "steps": {
      "create": { "title": "أنشئ مناسبتك", "body": "الأسماء، الموعد، المكان، صورة، والألوان التي تحبها." },
      "share": { "title": "شارك الرابط", "body": "أرسل الرابط العام أو رابطًا شخصيًا لكل ضيف على واتساب." },
      "track": { "title": "تابع الردود", "body": "شاهد الردود والأمنيات والمقاعد وهي تصل. ذكّر من لم يردّ." }
    }
  },
  "themes": { "eyebrow": "أربع لوحات ألوان", "title": "اختر ألوان يومك", "names": { "ivory": "عاجي", "sage": "زيتي", "navy": "كحلي", "noir": "أسود" } },
  "pricing": {
    "eyebrow": "الأسعار",
    "title": "سعر واحد لكل مناسبة",
    "subtitle": "ادفع مرة واحدة لمناسبتك. تُفعَّل الباقة بعد تسجيل الدخول.",
    "perEvent": "لكل مناسبة",
    "contactForPrice": "تواصل معنا لمعرفة السعر",
    "popular": "الأكثر طلبًا",
    "cta": "ابدأ بهذه الباقة",
    "note": "الأسعار المعروضة أسعار الإطلاق. تحتاج شيئًا مخصصًا؟ راسلنا على واتساب.",
    "highlights": {
      "guests": "{count, plural, zero {حتى # ضيف} one {حتى ضيف واحد} two {حتى ضيفين} few {حتى # ضيوف} many {حتى # ضيفًا} other {حتى # ضيف}}",
      "guestsUnlimited": "عدد غير محدود من الضيوف",
      "galleryOn": "معرض صور مشترك",
      "galleryOff": "بدون معرض صور",
      "photos": "{count, plural, zero {حتى # صورة} one {حتى صورة واحدة} two {حتى صورتين} few {حتى # صور} many {حتى # صورة} other {حتى # صورة}}",
      "retention": "{days, plural, zero {تُحفظ الصور # يوم} one {تُحفظ الصور يومًا واحدًا} two {تُحفظ الصور يومين} few {تُحفظ الصور # أيام} many {تُحفظ الصور # يومًا} other {تُحفظ الصور # يوم}}",
      "moderationOn": "مراجعة الصور قبل نشرها",
      "moderationOff": "بدون مراجعة الصور",
      "checkinOn": "تسجيل الحضور بـ QR عند الباب",
      "checkinOff": "بدون تسجيل حضور"
    }
  },
  "faq": {
    "eyebrow": "أسئلة",
    "title": "الأسئلة الشائعة",
    "items": {
      "app": { "q": "هل يحتاج ضيوفي إلى تطبيق؟", "a": "لا. الدعوة صفحة ويب تُفتح في أي متصفح على أي هاتف." },
      "whatsapp": { "q": "كيف أرسل الدعوة؟", "a": "انسخ الرابط من لوحة التحكم وشاركه على واتساب، أو أرسل لكل ضيف رابطه الشخصي." },
      "edit": { "q": "هل يمكنني تعديل الدعوة بعد إرسالها؟", "a": "نعم. الرابط يبقى كما هو، ويرى الضيوف دائمًا أحدث نسخة." },
      "photos": { "q": "كم تبقى صور المعرض؟", "a": "سبعة أيام بعد المناسبة، ثم تُحذف تلقائيًا." },
      "payment": { "q": "كيف أدفع؟", "a": "سجّل الدخول، أنشئ مناسبتك، ثم راسلنا على واتساب لتفعيل باقتك." }
    }
  },
  "ctaBand": { "title": "احتفالك يستحق دعوة جميلة", "subtitle": "أنشئها في دقائق، وشاركها في ثوانٍ.", "cta": "أنشئ دعوتك", "whatsapp": "تواصل معنا على واتساب" },
  "footer": { "tagline": "دعوات رقمية أنيقة لمناسباتك", "whatsapp": "واتساب", "rights": "© {year} دعوتي. جميع الحقوق محفوظة." }
}
```

- [ ] **Step 3: Run** `npx vitest run tests/unit/messages.test.ts` → PASS (identical key sets, six plural forms).

- [ ] **Step 4: Commit** — `git commit -m "feat(i18n): landing page copy in Arabic and English"`

---

### Task 6: `supportWhatsAppUrl`, `Section`, `SiteHeader`, `SiteFooter`

**Files:** Create `src/lib/whatsapp.ts`, `src/components/marketing/section.tsx`, `site-header.tsx`, `site-footer.tsx`. Modify `src/app/(host)/dashboard/events/[eventId]/gallery/page.tsx:47-57` to use `supportWhatsAppUrl()` instead of the inline `wa.me` string.

**Interfaces — Produces:**

- `supportWhatsAppUrl(text?: string): string | null` — `https://wa.me/<digits>` (+ `?text=` encoded) from `publicEnv().NEXT_PUBLIC_SUPPORT_WHATSAPP`; `null` when unset.
- `Section({ id, tone?: "paper"|"card"|"primary", children, className? })` — `<section id>` with `mx-auto w-full max-w-6xl px-4 py-16 sm:py-24`.
- `SectionHeading({ locale, eyebrow, title, subtitle?, align?: "center"|"start" })`.
- `SiteHeader({ locale })`, `SiteFooter({ locale })` — server components; header sticky, uses `Wordmark`, anchor nav, `LocaleToggle`, `Button` ghost (Sign in) + default (CTA).

- [ ] **Step 1: `src/lib/whatsapp.ts`**

```ts
import { publicEnv } from "@/lib/public-env";

/** wa.me deep link to the support number, or null when NEXT_PUBLIC_SUPPORT_WHATSAPP is unset. */
export function supportWhatsAppUrl(text?: string): string | null {
  const raw = publicEnv().NEXT_PUBLIC_SUPPORT_WHATSAPP;
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}
```

Replace the inline `https://wa.me/${…}` construction in `gallery/page.tsx` with `supportWhatsAppUrl()` (render the button only when non-null).

- [ ] **Step 2: `src/components/marketing/section.tsx`**

```tsx
import { cn } from "cn";

import { Eyebrow } from "@/components/brand/eyebrow";
import { GoldRule } from "@/components/brand/gold-rule";

const TONES = {
  paper: "bg-background",
  card: "bg-card",
  primary: "bg-primary text-primary-foreground",
} as const;

type SectionProps = { id?: string; tone?: keyof typeof TONES; className?: string; children: React.ReactNode };

export function Section({ id, tone = "paper", className, children }: SectionProps) {
  return (
    <section id={id} className={cn(TONES[tone], "scroll-mt-16")}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 py-16 sm:py-24", className)}>{children}</div>
    </section>
  );
}

type HeadingProps = {
  locale: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  className?: string;
};

export function SectionHeading({ locale, eyebrow, title, subtitle, align = "center", className }: HeadingProps) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" ? "mx-auto text-center" : "text-start", className)}>
      <Eyebrow locale={locale}>{eyebrow}</Eyebrow>
      <h2 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{title}</h2>
      {subtitle ? <p className="text-lg text-pretty text-muted-foreground">{subtitle}</p> : null}
      <GoldRule className={cn("w-40", align === "center" ? "mx-auto" : "")} />
    </div>
  );
}
```

- [ ] **Step 3: `src/components/marketing/site-header.tsx`**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Wordmark } from "@/components/brand/wordmark";
import { LocaleToggle } from "@/components/dashboard/locale-toggle";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/config";

const NAV = [
  { href: "#features", key: "features" },
  { href: "#how-it-works", key: "howItWorks" },
  { href: "#pricing", key: "pricing" },
  { href: "#faq", key: "faq" },
] as const;

export async function SiteHeader({ locale }: { locale: AppLocale }) {
  const [t, common] = await Promise.all([getTranslations("Landing.nav"), getTranslations("Common")]);
  return (
    <header className="border-gold/30 sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Wordmark size="sm" href="/" />
        <nav aria-label="primary" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleToggle
            current={locale}
            labels={{ ar: common("arabic"), en: common("english"), language: common("language") }}
          />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">{t("cta")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: `src/components/marketing/site-footer.tsx`**

```tsx
import { MessageCircleIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GoldRule } from "@/components/brand/gold-rule";
import { Wordmark } from "@/components/brand/wordmark";
import type { AppLocale } from "@/lib/i18n/config";
import { supportWhatsAppUrl } from "@/lib/whatsapp";

export async function SiteFooter({ locale }: { locale: AppLocale }) {
  const [t, nav] = await Promise.all([getTranslations("Landing.footer"), getTranslations("Landing.nav")]);
  const whatsapp = supportWhatsAppUrl();
  void locale;
  return (
    <footer className="border-gold/30 bg-paper border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center">
        <Wordmark size="md" href="/" />
        <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        <GoldRule className="w-40" />
        <nav aria-label="footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">
            {nav("pricing")}
          </a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground">
            {nav("faq")}
          </a>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            {nav("login")}
          </Link>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <MessageCircleIcon className="size-4" /> {t("whatsapp")}
            </a>
          ) : null}
        </nav>
        <p className="text-xs text-muted-foreground">{t("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
```

(Remove the `void locale` line and the prop if the footer ends up not needing the locale — keep the signature symmetric with `SiteHeader` only if used.)

- [ ] **Step 5: Verify** — `npm run lint && npm run typecheck`.

- [ ] **Step 6: Commit** — `git commit -m "feat(marketing): section, site header and footer; shared WhatsApp link helper"`

---

### Task 7: Hero and `InvitationPreview`

**Files:** Create `src/components/marketing/invitation-preview.tsx`, `src/components/marketing/hero.tsx`.

**Interfaces — Produces:** `Hero({ locale })`, `InvitationPreview({ locale })` — both server components. Preview is a static card styled with `invitationThemeStyle("ivory")` from `@/components/invitation/invitation-theme`, `FrameCorners`, `GoldRule`, `Eyebrow`; CSS-only entrance via tw-animate-css classes (`animate-in fade-in slide-in-from-bottom-4 duration-700`).

- [ ] **Step 1: `invitation-preview.tsx`**

```tsx
import { getTranslations } from "next-intl/server";

import { Eyebrow } from "@/components/brand/eyebrow";
import { FrameCorners } from "@/components/brand/frame-corners";
import { GoldRule } from "@/components/brand/gold-rule";
import { invitationThemeStyle } from "@/components/invitation/invitation-theme";
import type { AppLocale } from "@/lib/i18n/config";

/** Static product shot of an ivory invitation. Purely presentational: no data, no interaction. */
export async function InvitationPreview({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.preview");
  return (
    <div
      aria-hidden="true"
      style={invitationThemeStyle("ivory")}
      className="shadow-ink/20 relative mx-auto aspect-[5/8] w-full max-w-[320px] rounded-sm bg-(--inv-paper) text-(--inv-ink) shadow-2xl motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
    >
      <FrameCorners />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-[14%] py-[12%] text-center">
        <Eyebrow locale={locale} className="text-(--inv-gold)">
          {t("eyebrow")}
        </Eyebrow>
        <p className="font-heading text-4xl leading-tight font-bold">
          {t("primary")}
          <span className="mx-2 text-(--inv-gold)">{t("and")}</span>
          {t("secondary")}
        </p>
        <GoldRule className="w-3/4" />
        <p className="font-heading text-lg">{t("date")}</p>
        <div className="mt-2 flex gap-2">
          <span className="rounded-full bg-(--inv-accent) px-4 py-1.5 text-xs font-medium text-(--inv-paper)">
            {t("attending")}
          </span>
          <span className="rounded-full border border-(--inv-gold) px-4 py-1.5 text-xs font-medium">
            {t("declined")}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `hero.tsx`**

```tsx
import { ArrowDownIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Eyebrow } from "@/components/brand/eyebrow";
import { InvitationPreview } from "@/components/marketing/invitation-preview";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/config";

export async function Hero({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.hero");
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2">
        <div className="space-y-6 text-center lg:text-start">
          <Eyebrow locale={locale}>{t("eyebrow")}</Eyebrow>
          <h1 className="font-heading text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-xl text-lg text-pretty text-muted-foreground lg:mx-0">{t("subtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="h-11 px-6 text-base">
              <Link href="/dashboard">{t("cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-6 text-base">
              <a href="#how-it-works">
                {t("secondary")} <ArrowDownIcon data-icon="inline-end" />
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("trust")}</p>
        </div>
        <InvitationPreview locale={locale} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify** — temporarily render `<Hero locale="ar" />` in `page.tsx` (final assembly is Task 10) and check `/` in both locales; the preview animates once, respects reduced motion.

- [ ] **Step 4: Commit** — `git commit -m "feat(marketing): hero with static invitation preview"`

---

### Task 8: `FeatureGrid`, `HowItWorks`, `ThemeStrip`

**Files:** Create `src/components/marketing/feature-grid.tsx`, `how-it-works.tsx`, `theme-strip.tsx`.

**Interfaces — Produces:** `FeatureGrid({ locale })`, `HowItWorks({ locale })`, `ThemeStrip({ locale })`; all server components using `Section` + `SectionHeading` from Task 6 and shadcn `Card`.

- [ ] **Step 1: `feature-grid.tsx`**

```tsx
import { ImagesIcon, MailOpenIcon, MessageCircleIcon, QrCodeIcon, ScanLineIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n/config";

const FEATURES = [
  { key: "envelope", Icon: MailOpenIcon },
  { key: "rsvp", Icon: UsersIcon },
  { key: "whatsapp", Icon: MessageCircleIcon },
  { key: "tickets", Icon: QrCodeIcon },
  { key: "gallery", Icon: ImagesIcon },
  { key: "checkin", Icon: ScanLineIcon },
] as const;

export async function FeatureGrid({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.features");
  return (
    <Section id="features">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, Icon }) => (
          <li key={key}>
            <Card className="h-full">
              <CardHeader>
                <span className="bg-gold-soft/40 mb-2 inline-flex size-10 items-center justify-center rounded-full text-primary">
                  <Icon className="size-5" />
                </span>
                <CardTitle className="text-xl">{t(`items.${key}.title`)}</CardTitle>
                <CardDescription className="text-base">{t(`items.${key}.body`)}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 2: `how-it-works.tsx`**

```tsx
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import type { AppLocale } from "@/lib/i18n/config";

const STEPS = ["create", "share", "track"] as const;

export async function HowItWorks({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.howItWorks");
  return (
    <Section id="how-it-works" tone="card">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} />
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map((key, i) => (
          <li key={key} className="relative flex flex-col items-center gap-3 text-center">
            <span className="relative flex size-12 items-center justify-center">
              <span aria-hidden="true" className="border-gold absolute inset-0 rotate-45 border" />
              <span className="font-heading text-xl font-bold text-primary" dir="ltr">
                {i + 1}
              </span>
            </span>
            <h3 className="font-heading text-2xl font-bold">{t(`steps.${key}.title`)}</h3>
            <p className="max-w-xs text-muted-foreground">{t(`steps.${key}.body`)}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
```

- [ ] **Step 3: `theme-strip.tsx`** — real palettes from `THEMES`:

```tsx
import { getTranslations } from "next-intl/server";

import { THEMES } from "@/components/invitation/invitation-theme";
import { Section, SectionHeading } from "@/components/marketing/section";
import { THEME_IDS } from "@/db/schema/enums";
import type { AppLocale } from "@/lib/i18n/config";

export async function ThemeStrip({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.themes");
  return (
    <Section>
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} />
      <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        {THEME_IDS.map((id) => {
          const theme = THEMES[id];
          return (
            <li key={id} className="space-y-3 text-center">
              <div
                className="mx-auto aspect-[5/6] w-full max-w-[180px] rounded-sm border shadow-md"
                style={{ backgroundColor: theme.paper, borderColor: theme.gold }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                  <span className="font-heading text-2xl font-bold" style={{ color: theme.ink }}>
                    أ <span style={{ color: theme.gold }}>و</span> س
                  </span>
                  <span className="h-px w-2/3" style={{ backgroundColor: theme.gold }} />
                  <span
                    className="rounded-full px-3 py-1 text-[10px]"
                    style={{ backgroundColor: theme.accent, color: theme.paper }}
                  >
                    {t("names." + id)}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium">{t(`names.${id}`)}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 4: Verify** — `npm run lint && npm run typecheck`; render each in `page.tsx` temporarily and eyeball at 375px and 1280px widths.

- [ ] **Step 5: Commit** — `git commit -m "feat(marketing): feature grid, how-it-works steps and theme strip"`

---

### Task 9: `Pricing`, `Faq` (accordion), `CtaBand`

**Files:** Run `npx shadcn@latest add accordion` (creates `src/components/ui/accordion.tsx`; add `font-heading` to the trigger like other title slots). Create `src/components/marketing/pricing.tsx`, `faq.tsx`, `cta-band.tsx`.

**Interfaces — Consumes:** `listPackages()` from `@/db/queries/packages`; `packageHighlights()` from Task 4; `supportWhatsAppUrl()` from Task 6. **Produces:** `Pricing()`, `Faq({ locale })`, `CtaBand({ locale })`.

- [ ] **Step 1: `pricing.tsx`**

```tsx
import { CheckIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { listPackages } from "@/db/queries/packages";
import type { Package } from "@/db/schema";
import { toAppLocale } from "@/lib/i18n/config";
import { packageHighlights, type PackageHighlight } from "@/lib/packages";
import { supportWhatsAppUrl } from "@/lib/whatsapp";

const POPULAR_TIER: Package["tier"] = "standard";

type HighlightTranslator = (key: string, values?: Record<string, number>) => string;

function highlightLabel(h: PackageHighlight, t: HighlightTranslator): { text: string; on: boolean } {
  switch (h.key) {
    case "guests":
      return { text: h.count === null ? t("guestsUnlimited") : t("guests", { count: h.count }), on: true };
    case "gallery":
      return { text: h.included ? t("galleryOn") : t("galleryOff"), on: h.included };
    case "photos":
      return { text: t("photos", { count: h.count }), on: true };
    case "retention":
      return { text: t("retention", { days: h.days }), on: true };
    case "moderation":
      return { text: h.included ? t("moderationOn") : t("moderationOff"), on: h.included };
    case "checkin":
      return { text: h.included ? t("checkinOn") : t("checkinOff"), on: h.included };
  }
}

export async function Pricing() {
  const [t, th, format, locale, packages] = await Promise.all([
    getTranslations("Landing.pricing"),
    getTranslations("Landing.pricing.highlights"),
    getFormatter(),
    getLocale(),
    listPackages(),
  ]);
  const appLocale = toAppLocale(locale);
  const whatsapp = supportWhatsAppUrl();

  return (
    <Section id="pricing" tone="card">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {packages
          .filter((p) => p.isActive)
          .map((pkg) => {
            const popular = pkg.tier === POPULAR_TIER;
            return (
              <li key={pkg.tier}>
                <Card data-tier={pkg.tier} className={popular ? "ring-gold relative h-full ring-2" : "h-full"}>
                  {popular ? <Badge className="bg-gold text-ink absolute start-4 -top-3">{t("popular")}</Badge> : null}
                  <CardHeader>
                    <CardTitle className="text-2xl">{appLocale === "ar" ? pkg.nameAr : pkg.nameEn}</CardTitle>
                    <CardDescription>
                      {pkg.priceEgp > 0 ? (
                        <span className="flex items-baseline gap-2">
                          <span className="font-heading text-4xl font-bold text-foreground" dir="ltr">
                            {format.number(pkg.priceEgp, "egp")}
                          </span>
                          <span>{t("perEvent")}</span>
                        </span>
                      ) : (
                        <span className="text-base">{t("contactForPrice")}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {packageHighlights(pkg).map((h) => {
                        const { text, on } = highlightLabel(h, th);
                        return (
                          <li
                            key={h.key}
                            className={on ? "flex items-center gap-2" : "flex items-center gap-2 text-muted-foreground"}
                          >
                            {on ? <CheckIcon className="size-4 text-primary" /> : <MinusIcon className="size-4" />}
                            {text}
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" variant={popular ? "default" : "outline"}>
                      <Link href="/dashboard">{t("cta")}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
      </ul>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("note")}{" "}
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            WhatsApp
          </a>
        ) : null}
      </p>
    </Section>
  );
}
```

Note: the `egp` named number format already exists in `src/lib/i18n/config.ts`.

- [ ] **Step 2: `faq.tsx`**

```tsx
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { AppLocale } from "@/lib/i18n/config";

const ITEMS = ["app", "whatsapp", "edit", "photos", "payment"] as const;

export async function Faq({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.faq");
  return (
    <Section id="faq">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} />
      <Accordion type="single" collapsible className="mx-auto mt-12 max-w-2xl">
        {ITEMS.map((key) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-start text-base">{t(`items.${key}.q`)}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{t(`items.${key}.a`)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
```

- [ ] **Step 3: `cta-band.tsx`**

```tsx
import { MessageCircleIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GoldRule } from "@/components/brand/gold-rule";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/config";
import { supportWhatsAppUrl } from "@/lib/whatsapp";

export async function CtaBand({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.ctaBand");
  const whatsapp = supportWhatsAppUrl();
  void locale;
  return (
    <Section tone="primary" className="text-center">
      <h2 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{t("title")}</h2>
      <p className="mx-auto mt-3 max-w-xl text-lg text-primary-foreground/80">{t("subtitle")}</p>
      <GoldRule className="mx-auto mt-6 w-40" />
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="bg-gold text-ink hover:bg-gold/90 h-11 px-6 text-base">
          <Link href="/dashboard">{t("cta")}</Link>
        </Button>
        {whatsapp ? (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 border-primary-foreground/40 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon data-icon="inline-start" /> {t("whatsapp")}
            </a>
          </Button>
        ) : null}
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: Verify** — `npm run lint && npm run typecheck`; pricing shows three cards with EGP numbers (after local `update packages set price_egp` if needed) and "contact us" when price is 0.

- [ ] **Step 5: Commit** — `git commit -m "feat(marketing): pricing from package tiers, FAQ accordion and CTA band"`

---

### Task 10: Assemble the landing page

**Files:** Modify `src/app/(host)/page.tsx` (replace entirely).

- [ ] **Step 1: `page.tsx`**

```tsx
import { getLocale } from "next-intl/server";

import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ThemeStrip } from "@/components/marketing/theme-strip";
import { toAppLocale } from "@/lib/i18n/config";

export default async function LandingPage() {
  const locale = toAppLocale(await getLocale());
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="flex-1">
        <Hero locale={locale} />
        <FeatureGrid locale={locale} />
        <HowItWorks locale={locale} />
        <ThemeStrip locale={locale} />
        <Pricing />
        <Faq locale={locale} />
        <CtaBand locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
```

- [ ] **Step 2: Verify** — `/` in ar and en, 375px and 1280px: single `h1`, anchors scroll to sections (`scroll-mt-16` clears the sticky header), no horizontal scroll, RTL mirrors correctly. `npm run build` → `/` is `ƒ` (dynamic, because pricing reads the DB via cookies-scoped locale) — acceptable.

- [ ] **Step 3: Commit** — `git commit -m "feat(landing): compose the marketing landing page"`

---

### Task 11: Login and not-found brand pass

**Files:** Modify `src/app/(host)/login/page.tsx:26-31`, `src/app/(host)/not-found.tsx`.

- [ ] **Step 1: Login** — replace the inline wordmark `<Link>` inside `CardHeader` with:

```tsx
<div className="mb-2 flex flex-col items-center gap-3">
  <Wordmark size="lg" href="/" />
  <GoldRule className="w-24" />
</div>
```

(imports from `@/components/brand/wordmark` and `@/components/brand/gold-rule`). Keep every form field, name, and `devLoginEnabled()` branch exactly as-is.

- [ ] **Step 2: Not-found** — replace the `font-mono` "404" line with `<Wordmark size="lg" href="/" />` followed by `<GoldRule className="w-24" />`, keep the heading, body and button.

- [ ] **Step 3: Verify** — `npm run lint && npm run typecheck`; `/login` renders and dev-login still posts (`tests/e2e/global-setup.ts` path).

- [ ] **Step 4: Commit** — `git commit -m "feat(auth): brand wordmark on login and not-found"`

---

### Task 12: Landing E2E

**Files:** Create `tests/e2e/landing.spec.ts`.

- [ ] **Step 1: Spec**

```ts
import { expect, test } from "@playwright/test";

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
```

Runs in both projects: `host-desktop` (signed in → CTA lands on `/dashboard`) and `guest-mobile` (no session → `/login`).

- [ ] **Step 2: Run** `npx playwright test tests/e2e/landing.spec.ts` → 6 passed (3 × 2 projects).

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): landing page smoke in both projects"`

---

### Task 13: Full gate, visual QA, ship

- [ ] **Step 1: Gate** — `npm run format && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e` all green (existing `invitation.spec.ts` unaffected).

- [ ] **Step 2: Visual QA** — with the dev server, screenshot `/`, `/login`, `/dashboard`, `/dashboard/events/<id>` in `ar` and `en` at 375px and 1280px (agent-browser or Claude-in-Chrome). Check: contrast of burgundy on paper (AA), gold only as accent never as body text, focus rings visible, no clipped Arabic ascenders in Amiri headings (`leading-tight` minimum).

- [ ] **Step 3: Lighthouse (mobile)** on `/`: accessibility, best practices, SEO = 100; performance ≥ 90 (page ships no `motion` JS; only `LocaleToggle` + Accordion are client components).

- [ ] **Step 4: Push and PR**

```bash
git push -u origin feat/plan-a-landing-design-system
gh pr create --title "feat: brand design system and landing page (Plan A)" --body "…summary, screenshots, gate output… 🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

After merge: set real prices on prod with `update packages set price_egp = … where tier = …` (operator step; `seed.ts` never overwrites prices), then verify `https://da3wety.vercel.app/#pricing`.

---

## Verification summary

- Unit: `npx vitest run tests/unit/packages.test.ts tests/unit/messages.test.ts`
- Full: `npm run lint && npm run typecheck && npm run test && npm run build`
- E2E: `npm run test:e2e` (needs `DEV_LOGIN_ENABLED=true` + dev host from `scripts/create-dev-host.mjs`)
- Manual: ar/en × mobile/desktop screenshots of `/`, `/login`, `/dashboard`; Lighthouse mobile on `/`.

## Deferred to Plan B (dashboard redesign)

Shared dashboard composites (`PageHeader`, `StatCard`/`StatGrid`, `SectionCard`, `LockedFeature`, `CopyableLink`, `SimplePager`, `EventBadges`), replacing the `🔒` emoji in `EventTabs` with `LockIcon`, the hard-coded emerald banner in `edit/page.tsx`, consistent table wrappers, a landing OG image, dark mode.
