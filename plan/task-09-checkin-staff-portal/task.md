# Task 09 — Check-in Staff Portal (Core Flows)

| Field | Value |
|---|---|
| **Order** | After 04 + 05 — least-blocked portal |
| **Owner** | Gian + Pete (Gian after handing task 11 to Cerna) |
| **Lane** | D (Portals) — parallel with 07, 08, 10 |
| **Branch** | `feat/m4-w1-checkin-portal` |

---

## Scope

Build the event-day scanning surface: assigned-event header, scan flow with the result state machine, manual search, and walk-in registration. This is the **final leg of the main checkpoint flow** (check-in) and the lightest portal — one mutation + one state machine.

## Visual contract

[`mockup-plan/checkin-staff-portal/checkin-staff-portal.html`](../../mockup-plan/checkin-staff-portal/checkin-staff-portal.html) — scoped scanning screen, scan-result state machine, manual search, walk-ins. Reuse [`scan-result.tsx`](../../src/components/eirmis/scan-result.tsx).

## Week-1 page set

| Page / view | Route | Key operations |
|---|---|---|
| Scan screen (index) | `/staff` | `useAssignedEvent`, `useScanCheckIn` |
| Manual search | `/staff/search` | `useListAttendees` (staff-scoped query) |
| Walk-in registration | within search | `useSubmitAttendee` (walk-in variant) |

## Scan-result state machine (from the mockup)

| State | Trigger | UI |
|---|---|---|
| `success` | 200 from `scanCheckIn` | Green confirmation: guest name, party size, check-in time |
| `already-checked-in` | Documented failure variant | Amber warning with the original check-in time |
| `invalid-token` | 404/422 variant | Red error, rescan prompt |
| `wrong-event` | 403/422 variant | Red error naming the event mismatch |
| `capacity-full` | 422 variant | Red error; offer manual-search fallback |

The state machine lives in `src/features/checkin/lib/scan-result-machine.ts` as a pure reducer — trivially unit-testable in Week 2.

## Key interactions

- **Scan input:** camera QR scanning is out of scope for the mock — provide a paste-token input + "simulate scan" buttons that cover every state above (this is what makes the checkpoint demonstrable).
- **Manual search:** name/email search over the staff-scoped attendee list; check in from the result row.
- **Walk-in:** register a new party member on-site (`useSubmitAttendee`), then check them in.
- **Cross-portal visibility (checkpoint requirement):** every successful scan increments the organizer's attendance dashboard count.

## Steps

1. Scan screen shell: assigned-event header via `useAssignedEvent`.
2. Scan-result state machine as a pure reducer + the five UI states via [`scan-result.tsx`](../../src/components/eirmis/scan-result.tsx).
3. Wire `useScanCheckIn` → machine transitions; "simulate scan" buttons for each documented outcome.
4. Manual search page with staff-scoped attendee query + row check-in action.
5. Walk-in registration flow.
6. Verify the cross-portal loop: scan here → organizer attendance count moves.

## Files touched

- `src/pages/staff/` — fill layout outlets
- `src/features/checkin/components/` — **new** (scan screen, result states, search list, walk-in form)
- `src/features/checkin/lib/scan-result-machine.ts` — **new** (pure reducer)

## Out of scope

- Real camera scanning (M5, outside the contract)
- Exhaustive states + a11y (Week 2)
