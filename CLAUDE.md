# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Da3wety (دعوتي): Arabic-first digital invitations for the Egyptian market. Hosts create an event, share `/e/<slug>` or per-guest `/i/<token>` links, collect RSVPs, run a temporary shared photo gallery (Standard tier) and QR check-in at the door (Premium tier). Next.js 16 App Router on Vercel · Supabase (Postgres, Auth, Storage) · Drizzle · Tailwind v4 + shadcn (RTL) · zod v4 · next-intl · motion.

## Commands

```bash
npm run dev                 # http://localhost:3000
npm run typecheck           # tsc --noEmit
npm run lint                # eslint (enforces the import rules below)
npm run test                # vitest: tests/unit + tests/integration (integration auto-skips)
npx vitest run tests/unit/phone.test.ts        # single test file
npx vitest run -t "ar.json and en.json"        # single test by name
npm run test:e2e            # playwright (starts `next dev` with DEV_LOGIN_ENABLED=true)
npx playwright test tests/e2e/invitation.spec.ts --project=host-desktop
npm run build
npm run format              # prettier, printWidth 120, tailwind class sorting
```

Database (drizzle-kit reads `DATABASE_MIGRATION_URL`, the _session_ pooler; runtime uses `DATABASE_URL`, the _transaction_ pooler):

```bash
npm run db:generate         # after editing src/db/schema/* → new drizzle/NNNN_*.sql
npm run db:migrate
npm run db:seed             # package tiers
npm run db:studio
```

Local auth without Google OAuth: set `DEV_LOGIN_ENABLED=true` in `.env.local`, then `node --env-file=.env.local scripts/create-dev-host.mjs` (creates `admin@local.test` / `local-dev-password`, which `tests/e2e/global-setup.ts` expects). The RLS integration test only runs with `RUN_INTEGRATION=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/integration` against a real Supabase project.

Never touch `.env.prod`. Never hand-edit generated files under `drizzle/` (except the hand-written `0001_supabase_setup.sql`, which holds the profile trigger, storage buckets and PostgREST privilege revokes that Drizzle cannot express).

## Architecture

### Three surfaces, three root layouts

`src/app` has route groups that each own an `<html>` root layout — there is no shared app-wide layout:

- `(host)` — landing, `/login`, `/dashboard/**`, `/admin`, `/auth/*`. Locale comes from the host's `locale` cookie. Only these paths go through `src/proxy.ts` (Supabase session refresh); the matcher deliberately excludes guest and API routes.
- `(guest)` — `/e/[slug]` (public invitation), `/i/[token]` (personal invitation + ticket), `/q/[qrToken]` (ticket landing). Each has its own root `layout.tsx` wrapping `GuestShell`, which renders in the **event's** locale (not the browser's) and ships only guest message namespaces to the client. No auth; drafts are visible only to their host via `getVisibleEventBySlug`.
- `(staff)` — `/scan/[scannerToken]`, the door scanner, authorized solely by the rotating scanner token.
- `api/cron/cleanup-galleries` — Vercel cron (`vercel.json`), fails closed without `Authorization: Bearer $CRON_SECRET`.

### Auth and data access

- Supabase Auth (Google) only issues identity. `src/lib/auth.ts`: `requireHost()` in every dashboard page and host server action, `requireAdmin()` 404s non-admins, `currentProfile()` for optional checks. Profiles are created by a DB trigger on `auth.users` insert; `ADMIN_EMAILS` grants `is_admin` on first login.
- All app data goes through Drizzle (`src/db`) connected as the Postgres role, so **RLS does not protect app queries** — ownership is enforced in code. Host queries take `(eventId, hostId)` (`getEventForHost`); guest lookups resolve by slug/token. PostgREST access from the browser is revoked for `anon` and read-only for hosts (the integration test proves this posture).
- `createAdminClient()` (secret key) is used only for Storage (signed upload/read URLs, deletes) and auth admin.
- `src/db/queries/*` are `server-only`, wrapped in React `cache()`, and return `EventWithPackage = { event, pkg }` — most code needs the package flags alongside the event.

### Server-action pattern

Actions live in `src/actions/*.ts` (`"use server"`) and return `ActionState` (`src/lib/validation/state.ts`) to `useActionState` forms:

1. `requireHost()` (host) or resolve the event by token/slug and validate the identifier with the regexes in `src/lib/tokens.ts` (guest).
2. Parse `FormData` with a zod schema from `src/lib/validation/*`. Import `z` from `@/lib/validation/zod-config` — it configures zod so every error message is a **translation key** in the `Validation` namespace.
3. On failure return `await validationError(err, locale)`; wrap domain errors with `domainError(err, locale)` which maps `FeatureLockedError` (package tier) and `RateLimitedError` to translated form errors and rethrows the rest.
4. `revalidatePath` the affected guest and dashboard paths.

Guest actions and route handlers must pass the event's locale explicitly to `getTranslations({ locale: toIntlLocale(locale) })`; host actions omit it and get the cookie locale. Root params are unavailable in actions/handlers.

Capacity-sensitive writes (RSVP, adding guests, check-in) run in a transaction that first calls `lockEvent(tx, eventId)` (`SELECT … FOR UPDATE`) and then checks limits. Tickets are issued with `ensureActiveTicket`, which relies on the partial unique index rather than application locks. Public endpoints use `enforceRateLimit` (fixed window in the `rate_limits` table).

### Client-bundle rules (ESLint-enforced)

- `src/components/**` must not import `zod` or anything under `@/lib/validation/` except `@/lib/validation/state` (type-only imports allowed). Validate in server actions; client phone helpers are in `@/lib/phone`.
- Import animations from `motion/react`, never `framer-motion`. Never `zod/v3` or `zod/mini`.
- The invitation bundle is the performance budget: guest pages ship React + motion + next-intl (~215 KB gz) plus ~300 KB of Arabic fonts. Don't add client deps to guest routes casually.

### i18n

- `AppLocale` is `"ar" | "en"` (DB, cookie, message files). `IntlLocale` is the BCP 47 tag next-intl/Intl receive: `ar-EG-u-nu-latn` pins Western digits so numbers render identically on server and client. Convert with `toIntlLocale` / `toAppLocale` (`src/lib/i18n/config.ts`).
- `src/messages/ar.json` and `en.json` must have identical key sets; Arabic plurals must list all six CLDR forms (`zero one two few many other`). `tests/unit/messages.test.ts` enforces both — run it after touching messages.
- Named formats (`format.dateTime(d, "eventDate")`, `format.number(n, "egp")`) are defined in `config.ts`. Events carry their own `timezone`; the default is `Africa/Cairo`.
- Default direction is RTL; components use logical properties and the Radix `Direction` provider from `Providers`.

### Packages / feature gating

Tiers `basic < standard < premium` are rows in `packages` (seeded), joined onto every event as `pkg`. Gate with `packageAllows(pkg, feature)` for UI and `assertFeature(pkg, feature)` in actions (`feature` ∈ `gallery | moderation | checkin`). Enum values are exported as const tuples from `src/db/schema/enums.ts` so zod schemas and UI reuse them without importing Drizzle objects.

### Storage

Two buckets (`src/lib/storage.ts`): `event-assets` (public; cover/reveal images, unique path per upload to bust caches) and `event-photos` (private; guest gallery, purged by the cron after the retention window). Object paths are always `{eventId}/…`; check `pathBelongsToEvent` before acting on client-supplied paths. Uploads go direct-to-storage with server-minted signed upload URLs; reads use signed URLs. Guest gallery deletes are tied to an anonymous `da3wety_upload_session` cookie.

### Environment

`serverEnv()` (zod-validated, server-only, fails fast) and `publicEnv()` (explicit `NEXT_PUBLIC_*` references so Next can inline them) in `src/lib/env.ts`. `NEXT_PUBLIC_SITE_URL` is baked into QR payloads and share links. Logging is `log.info|warn|error(scope, message, fields)` — one JSON line per entry; error messages are stripped in production because they may contain query params.

## Testing layout

- `tests/unit/*.test.ts` — vitest, node environment, `@` alias → `src`. Pure-logic modules in `src/lib` are the usual targets.
- `tests/integration/` — real Supabase project, skipped unless `RUN_INTEGRATION=1`.
- `tests/e2e/invitation.spec.ts` — Playwright with two projects: `host-desktop` (Chrome, signed-in via `tests/e2e/.auth/host.json`) and `guest-mobile` (iPhone 13 emulation, no session). Tests skip themselves in the wrong project; that is intentional. Uses the local dev server and dev host; never point it at production.

## Planning docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` hold the design and task plans for in-flight work (currently Plan 1, branch `codex/plan-1-invitation-extras`); `docs/reviews/full-project-review.md` records the latest whole-project review, fixes and known limitations. Read the plan before continuing a task from it.
