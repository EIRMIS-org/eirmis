# Task 03 — Acceptance Criteria

- [x] `useSession()` returns `{ role, profile, isAuthenticated, signIn, signOut }`
- [x] `signIn('organizer')` updates context state **and** calls the wrapper's `setRole('organizer')` (verify via a network request carrying the organizer identity) — *verified in browser: panel updates + `listEvents()` requests fulfilled by MSW with role bearer*
- [x] `signOut()` resets role to `public` and clears the profile
- [x] Active role persists across a page refresh (localStorage) — *verified in browser: role survives F5; signOut + refresh stays `public`*
- [x] Mock profiles exist for all four authenticated roles with name/email/initials
- [x] `useSession()` outside `SessionProvider` throws a descriptive error
- [x] `npm run lint && npm run typecheck && npm run build` all green
