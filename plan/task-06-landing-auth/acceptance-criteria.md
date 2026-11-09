# Task 06 — Acceptance Criteria

- [ ] Landing page renders hero + 4 role cards, visually matching `mockup-plan/landing/landing.html`
- [x] Each role card signs in via `useSession().signIn(role)` and navigates to the correct portal
- [x] Sign out from any portal returns to the landing page with a cleared session
- [x] Public discovery lists open-registration events from MSW with loading/empty/error/success states
- [x] Event drawer shows gallery images and the public registration form; successful registration shows a confirmation state
- [x] Session pill in the global nav shows the active profile and supports identity switching
- [ ] `npm run lint && npm run typecheck && npm run build` all green
