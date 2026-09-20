# Plan A — Brand design system + landing page (design)

Date: 2026-09-20 · Status: approved

## Problem

The product is live at `da3wety.vercel.app`, but `/` is a bare wordmark with two buttons and the host app uses a neutral grey shadcn theme, while the invitations carry a distinct ivory/gold/burgundy identity. The business owner wants a landing page that drives Google sign-ups, shows the three tiers with EGP prices, and a host surface that feels like the product.

## Decisions

- **Primary goal:** sign-ups. Primary CTA → `/dashboard` (redirects to `/login` when signed out).
- **Pricing:** shown with EGP prices from the `packages` table; placeholder prices (499 / 999 / 1999) seeded for fresh databases; operators set real prices in the DB (`seed.ts` never overwrites `price_egp`). Price `0` renders "contact us for pricing".
- **Visual direction:** brand-forward everywhere. The shadcn neutral token values in `globals.css` are replaced with the ivory palette from `components/invitation/invitation-theme.ts` (burgundy `#5e1f2a` primary, gold `#b9933e` ring/accent, warm paper `#faf6ee` background). Four new named tokens: `paper`, `ink`, `gold`, `gold-soft`. Dark mode stays dormant.
- **Sequencing:** Plan A = tokens + brand primitives + marketing components + landing/login/not-found. Plan B (separate brainstorm) = dashboard redesign on top, keeping top bar + event tabs navigation.

## Architecture

- `src/components/brand/` — cross-surface marks: `Wordmark`, `GoldRule`, `FrameCorners`, `Eyebrow`. The invitation components import from here (no duplication).
- `src/components/marketing/` — server-component sections taking translated props: `Section`/`SectionHeading`, `SiteHeader`, `SiteFooter`, `Hero` + static `InvitationPreview`, `FeatureGrid`, `HowItWorks`, `ThemeStrip`, `Pricing`, `Faq`, `CtaBand`.
- `src/app/(host)/page.tsx` composes: header → hero → features → how it works → themes → pricing → FAQ → CTA band → footer.
- `packageHighlights(pkg)` in `src/lib/packages.ts` derives pricing bullets from package flags (unit-tested).
- `supportWhatsAppUrl()` in `src/lib/whatsapp.ts` centralises the `wa.me` link.
- Landing ships no `motion` JS: entrance animation is CSS-only (tw-animate-css, `motion-safe:`). Only `LocaleToggle` and the shadcn `Accordion` are client components.
- Copy lives in `Landing.*` in both message catalogs; parity and Arabic six-form plurals are enforced by `tests/unit/messages.test.ts`.

## Out of scope (Plan B)

Dashboard composites (`PageHeader`, `StatCard`, `LockedFeature`, `CopyableLink`, `SimplePager`, `EventBadges`), layout changes, landing OG image, dark mode, real prices.

## Verification

`npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`; new `tests/e2e/landing.spec.ts`; ar/en × mobile/desktop screenshots; Lighthouse mobile on `/`.
