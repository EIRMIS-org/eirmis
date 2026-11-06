# Task 04 — Acceptance Criteria

- [ ] All routes from the table render: `/`, `/organizer/**`, `/guest/**`, `/staff/**`, `/admin/**`, `/docs`, `/styleguide`, 404
- [ ] Signed-out user hitting any portal URL is redirected to `/`
- [ ] Authenticated user hitting a portal for a *different* role sees the shared 403 page (visual match to `mockup-plan/organizer-portal/403-unauthorized.html`)
- [ ] Correct role sees the portal layout shell with global nav and an empty outlet
- [ ] Session persists across refresh AND deep links work (paste `/admin/settings` after refresh → lands authenticated)
- [ ] `/docs` and `/styleguide` still work after the migration out of `App.tsx`
- [ ] Unknown paths render the 404 page
- [ ] `npm run lint && npm run typecheck && npm run build` all green
