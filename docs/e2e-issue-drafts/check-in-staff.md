# [M5 E2E][Check-in Staff] Scan assigned-event QR passes and reject duplicate or invalid scans

Local issue draft — not published. Parent: [Task 03 / #86](https://github.com/EIRMIS-org/eirmis/issues/86). Implementation target: Milestone 5, Playwright. Suggested categorization: E2E, QA, Check-in Staff; select existing labels when publishing. Add to the EIRMIS board and record publication links in the [test specification](../mock-backend-test-spec.md).

## Role(s) Affected

- [x] Organizer (supporting attendance observer)
- [ ] Admin
- [ ] Guest
- [x] Check-in Staff

## State / Authorization Rule

Staff may scan only events for which they have an active assignment. The server verifies token integrity and records a successful check-in once. A repeated/invalid scan must not increase attendance or overwrite the original accepted scan metadata. Staff must not obtain unrelated-event attendee data.

## Preconditions and fixtures

- Seed Staff A actively assigned to event A; Staff B unassigned; a revoked assignment; and event B belonging to another organizer.
- Issue a valid approved attendee token for event A plus an event B token. Prepare malformed, tampered, expired, and unknown-token inputs.
- Start with unchecked attendee and attendance count N. Use a deterministic QR image/video or injectable scanner adapter so Playwright does not require a physical camera.
- Use an independent Organizer context to observe event A attendance; verify scan results against persisted backend state.

## Test Case

| Step | Action | Expected result / current contract |
|---|---|---|
| 1 | Staff A opens assigned-event scanner | Scoped event read 200; correct event displayed |
| 2 | Scan valid event A attendee token | POST /functions/v1/checkin/scan returns 200, result=accepted; attendee checked_in=true with timestamp/actor; count becomes N+1 |
| 3 | Scan the same token again | No second check-in, count remains N+1; issue expects 409, current contract returns 200 with already_checked_in (GAP-05) |
| 4 | Scan malformed, tampered, expired, and unknown tokens | No attendance change or attendee leakage; issue expects 422, current contract exposes invalid_token result but no 422 response (GAP-05) |
| 5 | Scan event B token or scan after assignment revocation | Declared 403 for unauthorized scan; no event B data or mutation |
| 6 | Reload scanner and Organizer attendance view | Exactly one accepted check-in remains, original timestamp/actor preserved, persisted attendance agrees |

## Validation / Error Behavior

- Missing/expired authentication: 401; useful sign-in feedback and no scan mutation.
- Force `Prefer: example=Accepted` and `Prefer: example=AlreadyCheckedIn` in dedicated mock UI scenarios to exercise current response handling.
- Force documented `Prefer: code=403` with a valid-shaped request to check UI error handling. Test real assignment denial separately against Supabase.
- Final duplicate 409 and invalid 422 assertions remain blocked pending GAP-05 agreement. Do not change expectations to 200 solely to make the issue green.
- Network failure must not show a false accepted state; retry/re-scan behavior must preserve the one-check-in invariant.
- Current ScanCheckInResponse requires attendee even for invalid_token. Agree absent/null attendee and error schema before defining invalid-token fixtures.

## Coverage and unresolved gaps

- Covers POS-08, AUTH-01/02/03, QR-01, and QR-02.
- GAP-05 blocks final duplicate/invalid HTTP and payload assertions; retain separate tests of the current contract and the requested future behavior.
- GAP-07: the attendee-list description permits assigned staff, but the role tags and existing smoke coverage omit this read; include a scoped live read without exposing other events.
- Prism is stateless: two identical requests alone cannot demonstrate duplicate detection. Select named responses in mock mode; scan the same signed token twice against live backend for enforcement.
- Do not simulate approval, token signing, or attendance persistence by accepting a static fake JWT as live evidence.

## Acceptance Criteria

- [ ] Assigned-event scan succeeds with accepted result and verified persisted actor/timestamp.
- [ ] Duplicate scan does not increment attendance or replace original metadata.
- [ ] Invalid-token variants reveal no attendee data and cause no attendance changes.
- [ ] Other-event, revoked, unassigned, and expired-session scenarios are covered.
- [ ] GAP-05 statuses/payloads are resolved before blocked scenarios count as passing.
- [ ] Scanner simulation is deterministic; CI stores sanitized evidence and cleans fixtures.

## Administrative

- Owner / reviewer: unassigned; select during triage.
- Milestone: Milestone 5 Playwright E2E implementation; actual milestone selection pending publication.
- Dependencies: #83, scan contract resolution, signed-token fixtures, and scanner UI implementation.
- Issue URL / project board item: pending publication.
