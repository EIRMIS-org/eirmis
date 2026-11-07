# Task 09 — Check-in Staff Portal (Core Flows)

| Field | Value |
|---|---|
| **Order** | After 04 + 05 — least-blocked portal |
| **Owner** | Gian + Pete (Gian after handing task 11 to Cerna) |
| **Lane** | D (Portals) — parallel with 07, 08, 10 |
| **Branch** | `feat/m4-w1-checkin-portal` → PR to `feat/m4-frontend` |

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

## Developer Import Map

```tsx
// 1. Session Context (from Task 03)
import { useSession } from '@/app/providers/session-context'

// 2. Data Hooks (from Task 05 - src/features/checkin/hooks/ and organizer/)
import { useAssignedEvent } from '@/features/checkin/hooks/use-assigned-event'
import { useScanCheckIn } from '@/features/checkin/hooks/use-scan-check-in'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { useSubmitAttendee } from '@/features/guest/hooks/use-submit-attendee'

// 3. Forms & Validation (from Task 11)
import {
  attendeeCreateSchema,
  attendeeCreateResolver,
  FormRow,
  applyContractError,
} from '@/lib/forms'

// 4. Pre-built Domain Components (src/components/eirmis/)
import { ScanResult, type ScanResultStatus } from '@/components/eirmis/scan-result'

// 5. UI Primitives (src/components/ui/)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
```

## Target File Structure

```
src/
├── pages/
│   └── staff/
│       ├── staff-layout.tsx                 (existing layout shell rendering AppChrome + Outlet)
│       ├── staff-scan-page.tsx              ← NEW: Active scanner & simulation screen ("/staff")
│       └── staff-search-page.tsx            ← NEW: Manual search & walk-in registration ("/staff/search")
└── features/
    └── checkin/
        ├── lib/
        │   └── scan-result-machine.ts       ← NEW: Pure reducer state machine for scan outcomes
        └── components/                      ← NEW: Feature components
            ├── assigned-event-header.tsx    (Shows current active event title, date, venue)
            ├── scan-simulator.tsx           (Token input + 5 one-click simulation buttons for checkpoint demo)
            ├── scan-outcome-display.tsx     (Renders ScanResult with guest details, party size, error reasons)
            ├── manual-search-table.tsx      (Search input + table of attendees with "Check In" button)
            └── walk-in-modal.tsx            (On-site registration dialog with attendeeCreateResolver)
```

## Router Slot Handoff

In [`src/app/routing/router.tsx`](../../src/app/routing/router.tsx):
```tsx
// Replace PlaceholderPage elements under /staff:
{
  path: 'staff',
  element: <StaffScanPage />,
},
{
  path: 'staff/search',
  element: <StaffSearchPage />,
}
```

---

## Detailed Step-by-Step Implementation Guide

1. **Scan-Result State Machine (`scan-result-machine.ts`)**:
   - Pure reducer function: `scanResultReducer(state, action)`.
   - States: `'idle' | 'success' | 'already-checked-in' | 'invalid-token' | 'wrong-event' | 'capacity-full'`.
   - Returns `{ status, attendee, message, checkedInAt }`.
2. **Scan Screen (`staff-scan-page.tsx` + `scan-simulator.tsx`)**:
   - Query: `useAssignedEvent(eventId)` — displays banner with event name and venue.
   - Text input for pasting or entering a QR token string.
   - **Check-in Simulation Bar (Crucial for Checkpoint Walkthrough)**:
     - Button 1: "Simulate Valid Scan" → calls `useScanCheckIn({ qr_token: 'signed-qr-token-sample' })` → transitions to `success`.
     - Button 2: "Simulate Duplicate Scan" → transitions to `already-checked-in`.
     - Button 3: "Simulate Invalid Token" → calls mutation with `'invalid.token'` → transitions to `invalid-token`.
     - Button 4: "Simulate Wrong Event" → transitions to `wrong-event`.
     - Button 5: "Simulate Capacity Full" → transitions to `capacity-full`.
   - Outcome area renders [`ScanResult`](../../src/components/eirmis/scan-result.tsx) with matching status, guest name, and timestamp.
3. **Manual Search Screen (`staff-search-page.tsx` + `manual-search-table.tsx`)**:
   - Search bar filtering attendees by name or email.
   - Table of attendees: Name, Email, Status, Checked-in state (`Yes` / `No`).
   - Action: "Check In" button calling `useScanCheckIn({ qr_token: attendee.qr_token })`.
4. **Walk-in Registration Flow (`walk-in-modal.tsx`)**:
   - "Register Walk-in" button opens modal.
   - Form uses `attendeeCreateResolver` with `full_name` and `email`.
   - On submit, call `submitAttendee({ ...values, is_walk_in: true })`.
   - Immediately trigger `scanCheckIn` to complete entry.

---

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
