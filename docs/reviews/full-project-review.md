# Project implementation and full review handoff

Review completed locally on 2026-09-20. Starting commit: `8f54765`, branch `codex/plan-1-invitation-extras`. This records implemented fixes, evidence, and remaining limitations; it is not proof that every possible defect has been eliminated.

## Scope and provenance

The original Plan 1 authorized Tasks 1–9 and Task 10 Step 1 only. Those were already implemented before this review. Production migration, push, deployment, and the original plan's README work remain outside the authorized scope. See the [original handoff](../superpowers/plans/plan-1-codex-handoff.md) for task-by-task commits and migration history.

This subsequent review covered authentication/authorization, public bearer links, server actions, database concurrency, upload/storage lifecycle, cleanup, invitation rendering, host/admin workflows, scanner, localization, accessibility, and performance. The user authorized broader cleanup and justified dependencies. No new schema migration or production operation was needed.

Guidance: installed Next.js 16.3 documentation, Vercel React Best Practices skill, and [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). The agent-browser skill was inspected, but its CLI was unavailable; installed Playwright/Chrome supplied browser verification. No skill was installed.

## Project inventory

### Existing application foundation

- Next.js App Router, TypeScript, React, next-intl Arabic/English and RTL, Tailwind/shadcn, and animated invitation presentation.
- Supabase Google OAuth/session handling, profiles, host and administrator authorization, and a development-only local login route.
- Drizzle/Postgres tables for profiles, packages, events, guests, RSVPs, QR credentials, check-ins, photos, package assignment audit records, and rate limits. Server actions authorize writes; RLS limits direct PostgREST access.
- Host event creation/editing/publication, guest management/bulk import, response summaries, gallery moderation, scanner access, and CSV export.
- Public/personal invitations, open and invitation-only RSVP modes, ticket issuance/revocation, QR image downloads, and staff admission by camera/code/search.
- Public event assets and private guest photos in separate Storage buckets, signed upload/read URLs, client image processing, browser-session upload ownership, retention cleanup cron.
- Manual administrator package assignment and package feature/retention rules. This is not automated payment processing.

These capabilities predate this review and are not represented as newly created here.

### Previously completed Plan 1 additions

| Area          | Delivered before this review                                                          |
| ------------- | ------------------------------------------------------------------------------------- |
| E2E harness   | Chrome host/mobile projects, publish → RSVP → dashboard flow, local development login |
| Themes        | Four palettes, stored theme, host picker, envelope/stage/foil/confetti styling        |
| Digital gifts | Optional handle/note, localized display, copy interaction and fallback                |
| Calendar      | Google/Outlook links and ICS download; UTC/DST/escaping tests                         |
| Countdown     | Event-locale countdown, minute updates, expiry behavior                               |
| Wishes        | Paginated dashboard messages and CSV response-message column                          |
| Reminders     | Pending-only WhatsApp links and current-page pending-link copy                        |
| Schema        | Generated `0002_clammy_gorilla_man.sql`, applied locally during earlier work          |

The previous handoff records implementation commits `a7886b7` through `ef57a01`. Its known Arabic OG rendering defect is fixed by this review.

## Findings and implemented changes

| ID  | Severity    | Before                                                                                    | Implemented result                                                                                                                     |
| --- | ----------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | High        | Open RSVP matched a phone, overwrote an existing response, and disclosed its private link | Existing-phone submissions return localized personal-link guidance without modifying the existing response or returning its token      |
| S2  | High        | Check-in lacked remaining-seat, RSVP, and QR ownership checks                             | Transaction locks; current scanner/publication/expiry/package checks; attending RSVP; valid guest-owned QR; remaining-seat enforcement |
| S3  | High        | Outstanding/concurrent reservations bypassed photo quota                                  | All reservations count toward capacity; event lock serializes check and insertion; paths exist at insertion                            |
| S4  | Medium      | Guest capacity checked outside serialized writes                                          | Host additions, bulk imports, and public registration use current package capacity under event locking                                 |
| S5  | Medium      | Name search produced phone `LIKE '%'`, returning unrelated guests                         | Phone matching only included when enough phone characters are present                                                                  |
| S6  | Medium      | Photo confirmation ignored current gallery availability and actual object metadata        | Current gallery/session/age checks plus Storage-reported raster MIME and byte-size validation; state rechecked before commit           |
| S7  | Medium      | Cleanup could delete a reservation confirmed after selection                              | Cleanup rechecks under the shared event lock; expired reservations cannot confirm; active purge claims close uploads                   |
| S8  | Medium      | OAuth redirect trusted forwarded host; control characters altered URL parsing             | Configured production origin; unsafe redirect control characters rejected                                                              |
| S9  | Medium      | Package/event changes could derive flags and retention from stale state                   | Read current event under a transaction lock before applying changes                                                                    |
| C1  | Medium      | Arabic OG generation failed and image identity ignored edits                              | Sharp/Pango shapes names into PNGs; Satori composites; metadata URL includes event revision                                            |
| C2  | Medium      | Invalid SQL offsets and no gallery navigation after 40 photos                             | Bounded integer parsing, public/personal gallery navigation, out-of-range recovery                                                     |
| U1  | Medium      | Scanner exceptions left busy state stuck; inputs lacked names                             | Error/finally handling, input labels, admission controls bounded by remaining seats                                                    |
| H1  | Hardening   | Broad URL/path validation and sensitive error-message logging                             | HTTP(S)-only map links; restricted storage path characters; production structured errors omit parameter-bearing messages               |
| P1  | Performance | Camera/WASM warmed before use; browser Supabase imported server environment validation    | Camera preparation on activation; public environment module separated from Zod/server configuration                                    |

Also fixed: gallery applies the event theme; upload cookies are secure in production; malformed gallery references fail closed; wrapped unique violations produce existing user-facing errors; active cleanup claims no longer monopolize the bounded candidate selection.

### Implementation tradeoffs

`src/db/event-lock.ts` centralizes locking and capacity checks. RSVP/check-in acquire the event before the guest, avoiding reversed lock order between these paths. Critical writes serialize per event, not globally.

Failed signed-URL minting retains the reservation because one token may already exist. Cleanup reclaims it after the two-hour upload lifetime. Stored-file validation trusts Storage metadata rather than the browser; it is not full content decoding or antivirus scanning.

Sharp `0.35.4` was already installed transitively and is now a direct dependency at the same version. The production trace includes `Amiri-Bold.ttf`. No framework/ORM upgrade or schema migration was performed. No anonymous/PostgREST permissions were expanded; private links remain bearer credentials.

## Verification evidence

| Check                        | Result                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting baseline            | Clean tree; lint/typecheck passed; 80 tests passed including local RLS                                                                                           |
| Final unit/integration suite | **102 passed, 17 files, no skips** with `RUN_INTEGRATION=1`                                                                                                      |
| TypeScript and ESLint        | `npm.cmd run typecheck` and `npm.cmd run lint` passed                                                                                                            |
| Production build             | `npm.cmd run build` passed                                                                                                                                       |
| Existing E2E suite           | **4 passed, 4 intentional project skips**: host flows only in host-desktop, mobile smoke only in guest-mobile                                                    |
| Production browser checks    | Arabic/English mobile gallery: 40 photos then 1, working navigation, no horizontal overflow; scanner blocks excess seats and admits a valid seat; no page errors |
| OG image                     | HTTP 200 PNG; Arabic shaping/layout visually inspected with/without cover; fixture edit changes preview URL                                                      |
| Production dependency audit  | **0 advisories** with `npm.cmd audit --omit=dev --json`                                                                                                          |
| Full dependency audit        | **4 moderate development-tool entries remain**, detailed below                                                                                                   |
| Diff hygiene                 | `git diff --check` passed                                                                                                                                        |

New tests cover phone takeover, unrelated scanner matches, missing/random QR references, concurrent last-seat admission, declined RSVP, guest/photo quota races, real signed Storage upload and confirmation, closed-gallery confirmation, file metadata limits, pagination, map protocols, and redirect tab injection.

Security integration tests exercise actual local Postgres locks and Storage but mock Next request/auth/translation/rate-limit boundaries. Existing RLS tests separately exercise direct Supabase permissions. These are not exhaustive authorization or load tests. Initial sandbox `EPERM` worker failures were rerun successfully. The first positive upload test had an invalid fixture cookie; the corrected test verifies both real uploaded files and successful confirmation.

Early audit output showed zero advisories; the final network-enabled full audit found the development chain below and supersedes that early output.

### Bundle measurement

`scripts/review-production.mjs` requests `/e/lhtestev01` with a WhatsApp user agent, extracts unique initial external JavaScript URLs, and sums gzip sizes from `.next`. Same method, route, seed, and production mode before/after the performance cleanup:

| Measurement                                         | Bytes gzip |
| --------------------------------------------------- | ---------: |
| Fresh review measurement before performance cleanup |    274,534 |
| Final measurement                                   |    274,534 |
| Difference                                          |          0 |

This also matches the earlier Plan 1 baseline. It measures initial HTML-referenced JavaScript, not lazy downloads, images, CSS, Web Vitals, or latency. No invitation bundle reduction is claimed. Camera deferral affects scanner behavior; environment separation affects the browser Supabase dependency path.

Ignored artifacts in `test-results/review/`: before/after bundle JSON, gallery/scanner screenshots, and Arabic preview PNGs. The scripts reproduce them.

## Remaining issues and limits

1. **Development advisory:** `drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild` has four moderate audit entries for one underlying [esbuild development-server advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99). npm proposes a breaking Drizzle Kit downgrade to `0.18.1`; it was not applied. Resolve with a separately validated tooling update/override. Production-only audit is clean.
2. **Already-issued upload tokens:** signed upload tokens remain valid for their issued lifetime. Uploads racing deletion/purge can leave orphaned objects after a folder sweep. New checks prevent confirming them into an unavailable gallery, but do not revoke tokens or implement bucket-wide reconciliation. A tombstone/deferred sweep is further lifecycle work.
3. **Native rendering deployment:** Arabic output was verified on Windows. Smoke-test Sharp/Pango native binaries and font tracing on the deployment platform. Earlier sandbox Fontconfig cache warnings did not prevent rendering.
4. **Unperformed operational tests:** production OAuth round trip, target RLS/storage configuration, cron scheduling, real iOS/Safari camera/hardware QR, large-scale load, third-party WhatsApp cache refresh. Mobile browser checks use Chrome emulation. Accessibility checks are scoped, not WCAG certification.
5. **Existing product boundaries:** open registration does not verify a newly registered phone by OTP. The fix prevents takeover of existing invitations. Admin allowlist removal does not automatically demote an already-promoted database profile; operator role management remains necessary.
6. **Locking tradeoff:** correctness is prioritized over per-event concurrent write throughput. Slow Storage removal while cleaning stale reservations can delay writes to that event. No high-contention throughput target was load-tested.

These are explicit follow-ups, not silently marked implemented. No production release is claimed.

## Local testing

Use a Node version supported by the lockfile, Docker Desktop, and local Supabase. Configure `.env.local` from `.env.example`; integration/review fixtures must point to local services, never production. Development login is for local testing only.

```powershell
npm.cmd ci
npx.cmd supabase start
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

The E2E setup expects the local development host documented in `tests/e2e/global-setup.ts` and `DEV_LOGIN_ENABLED=true`. Ensure this local-only account exists. In another terminal:

```powershell
npm.cmd run typecheck
npm.cmd run lint
$env:RUN_INTEGRATION='1'
node --env-file=.env.local node_modules/vitest/vitest.mjs run
Remove-Item Env:RUN_INTEGRATION
npm.cmd run test:e2e
```

Stop development mode before building. For production-mode checks:

```powershell
npm.cmd run build
npm.cmd run start -- --port 3100
```

In another terminal:

```powershell
node scripts/review-production.mjs after
node --env-file=.env.local scripts/review-browser.mjs
npm.cmd audit --omit=dev
npm.cmd audit
```

The measurement script expects the existing `/e/lhtestev01` fixture. Browser review creates a disposable account/event/photos and removes them in `finally`; it checks local hostnames first. Security integration tests also reject non-local service targets.

Manual checks: publish an event, open the envelope on mobile, register and update through the personal link; retry its phone on the public link and confirm no token disclosure; change theme/gift settings; download ICS; inspect wishes/reminders; upload/moderate photos; navigate gallery pages; attempt the last seat from two staff devices; edit an event and inspect its new OG URL.

## Rollout and continuation

- Review implementation commits: `96d5234` (authorization, capacity, gallery/scanner hardening) and `03bf9ef` (Arabic previews, browser environment separation, integration/production verification tooling).
- Install the lockfile, run checks, and smoke-test native Arabic rendering on staging.
- No new migration accompanies this review. Earlier Plan 1 migrations still require the separately authorized deployment process if missing from the target.
- Verify configured site origin, server secrets, existing RLS/storage caps, retention cron, and scanner expiry in the deployment environment.
- Track the development advisory and upload-orphan lifecycle limitation explicitly.
- No push, production migration, or deployment was executed.
- For Claude: read this report, the original handoff, `git log`, `src/db/event-lock.ts`, affected actions, and `tests/integration/review-security.test.ts`. Reproduce checks before extending the work.
