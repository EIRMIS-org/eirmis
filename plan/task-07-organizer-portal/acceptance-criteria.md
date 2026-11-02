# Task 07 — Acceptance Criteria

- [ ] Events list shows the organizer's events with loading/empty/error/success states
- [ ] 4-step create wizard validates each step with Zod; submitting creates an event via MSW and navigates to its workspace
- [ ] Guests tab lists guests + invitations; adding an invitation appears immediately (cache invalidation works)
- [ ] Approvals tab: approving/rejecting an attendee updates the queue and the invitation status
- [ ] Headcount approve/reject updates the invitation's `max_party_size`
- [ ] Capacity-override approval shows the audited-override confirmation before applying
- [ ] QR dispatch sends the bundle for selected approved invitations and toasts the summary
- [ ] Tab state is URL-driven (refresh keeps the active tab)
- [ ] Cross-portal: an approval made here is reflected in the guest portal's invitation status
- [ ] `npm run lint && npm run typecheck && npm run build` all green
