# Task 04 — Acceptance Criteria

- [x] All routes from the table render: `/`, `/organizer/**`, `/guest/**`, `/staff/**`, `/admin/**`, `/docs`, `/styleguide`, 404
  - Verified in-browser: `/` hub placeholder; `/organizer`, `/organizer/events/new`, `/organizer/events/:eventId` placeholders render under the organizer shell; `/guest/**`, `/staff/**`, `/admin/**` same pattern; `/docs` iframe + `/styleguide` lazy route work.
- [x] Signed-out user hitting any portal URL is redirected to `/`
  - Verified: signed-out clicks on portal nav buttons and direct portal URLs land on `/` (RoleGuard `<Navigate to="/" replace />`).
- [x] Authenticated user hitting a portal for a *different* role sees the shared 403 page (visual match to `mockup-plan/organizer-portal/403-unauthorized.html`)
  - Verified: role `guest` + `/organizer` → shared ForbiddenPage (red lock circle, "403: Access Denied", "Return to Public Hub").
- [x] Correct role sees the portal layout shell with global nav and an empty outlet
  - Verified: role `organizer` + `/organizer` → organizer shell, global nav, "Maria Santos ORGANIZER" session pill, Events placeholder in the outlet.
- [x] Session persists across refresh AND deep links work (paste `/admin/settings` after refresh → lands authenticated)
  - Verified: role `admin` + `/admin/settings` → settings placeholder; F5 refresh keeps the session on the same route (localStorage `eirmis.session.role`).
- [x] `/docs` and `/styleguide` still work after the migration out of `App.tsx`
  - Verified: both render as real routes (`DocsPage` iframe + lazy `Styleguide`); path-check logic deleted from `App.tsx`.
- [x] Unknown paths render the 404 page
  - Verified: `/nope-404` → NotFoundPage (compass icon, "Return to Public Hub").
- [x] `npm run lint && npm run typecheck && npm run build` all green
  - lint: 0 errors (2 benign `react-refresh/only-export-components` warnings — one pre-existing from task 03); typecheck: clean; build: ✓ 3.95s.
