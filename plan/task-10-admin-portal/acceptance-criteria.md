# Task 10 — Acceptance Criteria

- [ ] Verification queue lists organizers with pagination working (page param drives MSW)
- [ ] Status chips render `pending` / `active` / `suspended` distinctly
- [ ] Approve/revoke actions show a confirmation dialog, then update the row via `useUpdateOrganizerStatus`
- [ ] Org settings form validates with the `OrgSettings` Zod schema and saves via the update mutation with a success toast
- [ ] No event/guest data is reachable from the admin portal (zero-knowledge boundary holds visually)
- [ ] Cross-portal: activating a pending organizer flips their status in the organizer portal
- [ ] `npm run lint && npm run typecheck && npm run build` all green
