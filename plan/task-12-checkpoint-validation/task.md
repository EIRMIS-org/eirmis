# Task 12 — End-of-Week Checkpoint Validation

| Field | Value |
|---|---|
| **Order** | Final — after all portal tasks (06–10) |
| **Owner** | Whole team (lead facilitates; each dev validates their portal) |
| **Lane** | Gate — blocked by ALL of 06, 07, 08, 09, 10 |
| **Branch** | Validation happens on the integrated week branch |

---

## Scope

Run the end-of-week checkpoint defined in the milestone plan: **core flows work on the mock for every role.** This is the week's exit gate — its result decides what Week 2 absorbs as spillover.

## The main-flow walkthrough (the gate itself)

One person drives the browser; the whole team watches. Every step runs against MSW in the integrated app:

| # | Step | Portal | Expected |
|---|---|---|---|
| 1 | Sign in as Organizer from landing | 06 | Organizer portal loads |
| 2 | Create an event via the 4-step wizard | 07 | Event workspace opens |
| 3 | Add an invitation for a guest | 07 | Invitation appears in the list |
| 4 | Switch identity to that Guest (session pill) | 06→08 | Guest sees the invitation |
| 5 | RSVP accept + submit roster within `max_party_size` | 08 | Roster saved; organizer queue updates |
| 6 | Guest requests +1 headcount | 08 | Request appears in organizer queue |
| 7 | Organizer approves attendee + headcount | 07 | Guest's ceiling and status update |
| 8 | Organizer dispatches QR bundle | 07 | Success toast; guest wallet pass renders |
| 9 | Switch identity to Check-in Staff | 06→09 | Assigned event shows |
| 10 | Scan the guest's QR token (simulate) | 09 | Success state; organizer attendance count increments |
| 11 | Re-scan the same token | 09 | Already-checked-in state |
| 12 | Sign in as Admin; activate a pending organizer | 10 | Status flips across portals |

**Pass = all 12 steps complete without a code change mid-walkthrough.**

## Per-role state checks (after the walkthrough)

Each portal owner verifies their screens render the four basic states (loading skeleton, empty, error, success) — Week-1 variants, not the exhaustive Week-2 coverage.

## Hygiene gate

- [ ] `npm run lint` green
- [ ] `npm run typecheck` green
- [ ] `npm run build` green
- [ ] No contract file modified during the week (`git diff origin/chore/open-api-contract-mockup-enhancement -- contract/` is empty); mismatches are filed as issues, not patched

## Spillover triage (end of the week)

Anything failing or unfinished is triaged into Week 2, which already owns: all-states exhaustive coverage, unit + component tests, a11y. The triage rule: **main-flow blockers get fixed first; everything else joins the Week 2 backlog.**

## Outputs

1. Checkpoint result recorded (pass/fail per step) in `docs/` or the task board
2. Spillover list assigned to Week 2 owners
3. Week 2 plan drafted against the actual state (not the assumed state)
