# Task 8 implementation report

## Implemented

- Added `listWishes(eventId, page, pageSize)` with event scoping, non-null/non-empty message filtering, newest-first ordering, a default page size of 50, and a total count.
- Added the server-rendered wishes card with guest name, RSVP status, response time, message, count, empty state, and pagination.
- Parsed `wishesPage` as a finite positive safe integer only after `requireHost()` and `getEventForHost()` authorize the event.
- Rendered active pagination controls as links and boundary controls as actual disabled buttons. The component uses a fixed page size of 50, derives the page count from `total`, and requests the corresponding query offset. This was verified by code review; the E2E fixture does not create 51 RSVP records.
- Added the exact Arabic and English `Dashboard.wishes` messages.
- Added the RSVP message immediately after RSVP status in both the CSV header and each escaped CSV row.
- Extended the first invitation E2E flow to submit `ألف مبروك!`, assert it on the authorized event overview, and assert the authenticated CSV response contains the new header and value.

## TDD evidence

- RED: `npx.cmd playwright test tests/e2e/invitation.spec.ts --project=host-desktop --grep "host publishes"` failed at `getByText("ألف مبروك!", { exact: true })` because the overview did not render RSVP messages.
- GREEN: the same focused command passed after implementation: 1 passed.

## Verification

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npx.cmd vitest run`: 12 files passed, 1 skipped; 73 tests passed, 5 skipped.
- `npm.cmd run test:e2e`: 3 passed, 3 project-intentional skips. This includes the seeded Chrome mobile smoke test with no console errors.
- Focused E2E: 1 passed, covering wish submission/rendering and the CSV response header/value.
- `git diff --check`: passed before the final documentation updates.
- Runner output included the existing Node `NO_COLOR`/`FORCE_COLOR` warnings; there were no test, typecheck, or lint errors.

## Files changed

- `src/db/queries/guests.ts`
- `src/components/dashboard/wishes-list.tsx`
- `src/app/(host)/dashboard/events/[eventId]/page.tsx`
- `src/app/(host)/dashboard/events/[eventId]/checkin/export/route.ts`
- `src/messages/ar.json`
- `src/messages/en.json`
- `tests/e2e/invitation.spec.ts`
- `docs/superpowers/plans/2026-09-16-plan-1-e2e-and-invitation-extras.md`
- `.superpowers/sdd/2026-09-16-plan-1-e2e-and-invitation-extras/task-8-report.md`

## Deviations and self-review

- The supplied component snippet omitted pagination even though the approved spec requires it. Pagination was added using the existing guests-page Link/Button pattern and the controller's binding instructions.
- The status translation scope is `Guests` instead of `Guests.filters` so the same translator can also resolve the existing `Guests.next` label.
- The plan only requested a visible wish assertion. The E2E additionally validates the actual CSV response header and Arabic message value as required by the task ruling.
- A 51-row automated pagination fixture was not added because it would require direct database fixture machinery or 50 extra browser RSVP submissions in this task's E2E file. The page-size, offset, page-count, and true disabled-boundary branches were reviewed directly.
- Self-review confirmed host authorization and event ownership are resolved before the wishes query can render, the total is event-scoped, CSV cells still use `csvCell`, and unrelated files were not changed.

## Concerns

None.

## Review fix round 1

- Fixed a valid but out-of-range `wishesPage` showing the empty state even when wishes exist. `WishesList` now derives the last page from the event-scoped total, clamps the requested page, refetches only when the request is out of range, and uses the recovered page for its label and links.
- Added focused E2E coverage using the existing one-wish event: navigating to `?wishesPage=2` must still render `ألف مبروك!`.
- RED: `npx.cmd playwright test tests/e2e/invitation.spec.ts --project=host-desktop --grep "host publishes"` failed at the new out-of-range wish assertion (`element(s) not found`). An earlier attempt timed out in the existing CSV request before reaching the assertion and was discarded as non-evidence.
- GREEN: the same focused Playwright command passed, 1 test passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- Self-review confirmed normal in-range requests still issue one wishes query, recovery preserves the 50-row page size and event id, and a truly empty event retains its legitimate empty state.
