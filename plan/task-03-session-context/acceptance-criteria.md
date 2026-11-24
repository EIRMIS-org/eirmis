# Task 03 — Acceptance Criteria

- [ ] `useSession()` returns `{ role, profile, isAuthenticated, signIn, signOut }`
- [ ] `signIn('organizer')` updates context state **and** calls the wrapper's `setRole('organizer')` (verify via a network request carrying the organizer identity)
- [ ] `signOut()` resets role to `public` and clears the profile
- [ ] Active role persists across a page refresh (localStorage)
- [ ] Mock profiles exist for all four authenticated roles with name/email/initials
- [ ] `useSession()` outside `SessionProvider` throws a descriptive error
- [ ] `npm run lint && npm run typecheck && npm run build` all green
