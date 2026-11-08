# Task 10 — Acceptance Criteria

- [x] Verification queue lists organizers with pagination working (page param drives MSW)
- [x] Status chips render `pending` / `active` / `suspended` distinctly
- [x] Approve/revoke actions show a confirmation dialog, then update the row via `useUpdateOrganizerStatus`
- [x] Org settings form validates with the `OrgSettings` Zod schema and saves via the update mutation with a success toast
- [x] No event/guest data is reachable from the admin portal (zero-knowledge boundary holds visually)
- [ ] Cross-portal: activating a pending organizer flips their status in the organizer portal
- [x] `npm run lint && npm run typecheck && npm run build` all green
