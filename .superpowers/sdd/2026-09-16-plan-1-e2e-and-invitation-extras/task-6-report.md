# Task 6 implementation report

## Implemented

- Added pure calendar helpers for RFC 5545 output, Google and Outlook deep links, four-hour default duration, and safe download filenames.
- Added the public event `.ics` route with attachment, calendar content type, and private no-cache headers.
- Added localized calendar controls beneath the invitation date/time block.
- Added the Apple/iPhone download assertion to the primary invitation flow before RSVP, preserving the personal-link redirect assertion after RSVP.
- Preserved Arabic punctuation and tested ASCII semicolon escaping separately, per the binding correction.
- Added explicit UTC coverage across Cairo's 2026 daylight-saving fall-back boundary.

## TDD evidence

### RED

Command: `npx.cmd vitest run tests/unit/calendar.test.ts`

Result: exit 1. Vitest failed to import `@/lib/calendar` because the module did not exist. This was the expected feature-missing failure before production code was added.

### GREEN

Command: `npx.cmd vitest run tests/unit/calendar.test.ts`

Result: exit 0; 1 test file passed, 7 tests passed.

## Full gate

- `npm.cmd run typecheck`: exit 0.
- `npm.cmd run lint`: exit 0.
- `npx.cmd vitest run`: exit 0; 11 files passed, 1 skipped; 70 tests passed, 5 skipped.
- `npm.cmd run test:e2e`: exit 0; 3 passed, 3 project-specific skips. The seeded guest-mobile Chrome `/e/lhtestev01` smoke test passed and asserted no console errors.

Playwright emitted the existing `NO_COLOR`/`FORCE_COLOR` environment warning while starting processes; it did not affect the test results.

## Files changed

- `src/lib/calendar.ts`
- `src/app/(guest)/e/[slug]/event.ics/route.ts`
- `src/components/invitation/add-to-calendar.tsx`
- `src/components/invitation/invitation-card.tsx`
- `src/messages/ar.json`
- `src/messages/en.json`
- `tests/unit/calendar.test.ts`
- `tests/e2e/invitation.spec.ts`
- `docs/superpowers/plans/2026-09-16-plan-1-e2e-and-invitation-extras.md`
- `.superpowers/sdd/2026-09-16-plan-1-e2e-and-invitation-extras/task-6-report.md`

## Self-review

- Confirmed all Task 6 interfaces and placement requirements are implemented.
- Confirmed each physical ICS line stays within 75 UTF-8 octets, including multibyte Arabic content.
- Confirmed the route uses the explicit promise-based params type documented by the installed Next.js 16.3.5 package.
- Confirmed the download runs before RSVP so the redirect to the personal invitation does not require reopening the envelope.
- No unresolved correctness concerns found.
