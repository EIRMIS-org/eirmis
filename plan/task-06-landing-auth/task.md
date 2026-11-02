# Task 06 — Landing Page & Per-Role Auth Entry

| Field | Value |
|---|---|
| **Order** | Starts as soon as 04 + 05 land — lightest Lane D task |
| **Owner** | Dev 1 |
| **Lane** | D (Portals) — parallel with 07–10 |
| **Branch** | `feat/m4-w1-landing-auth` |

---

## Scope

Build the public hub at `/`: role cards, mock sign-in entries per role, public event discovery, and the session pill in the global nav. This is the entry point the checkpoint walkthrough (task 12) starts from.

## Visual contract

[`mockup-plan/landing/landing.html`](../../mockup-plan/landing/landing.html) — hero, four role cards, public event discovery section. Reuse existing components: [`portal-cards.tsx`](../../src/components/eirmis/portal-cards.tsx), [`sso-button.tsx`](../../src/components/eirmis/sso-button.tsx), [`global-nav.tsx`](../../src/components/eirmis/global-nav.tsx).

## Page composition

| Section | Behavior | Data |
|---|---|---|
| Hero + role cards | 4 cards (Organizer, Admin, Guest, Check-in Staff); each opens its mock auth flow | none |
| Organizer/Admin sign-in | [`sso-button.tsx`](../../src/components/eirmis/sso-button.tsx) → `signIn('organizer' | 'admin')` → navigate to portal | none |
| Guest/Staff sign-in | "Open magic link" pattern → `signIn('guest' | 'checkin')` → navigate to portal | none |
| Public discovery | Grid of open-registration published events | `useDiscoverPublicEvents()` |
| Event detail drawer | Gallery images + public registration form (name/email/party size) | `usePublicGallery(eventId)`, `useRegisterPublicGuest()` |
| Session pill (global nav) | Shows active profile; click → switch identity or sign out | `useSession()` |

## States (basic variants for Week 1)

- Discovery list: loading skeleton, empty ("No open events right now"), error (retry), success
- Public registration: success toast + confirmation state, 422 validation errors inline

## Steps

1. Compose the landing page from role cards + hero (static content from the mockup).
2. Wire the four sign-in entries to `useSession().signIn` + `navigate()`.
3. Add the discovery section with `useDiscoverPublicEvents()` and the four basic states.
4. Build the event drawer with gallery + `useRegisterPublicGuest()` form (plain RHF is fine; the shared schema work from task 11 can be adopted later if it lands in time).
5. Add the session pill to the global nav (identity switcher mirroring the mockup's session pill).
6. Verify the full loop: sign in as each role from the landing page → land in the right portal → sign out → back to landing.

## Files touched

- `src/pages/landing/` — layout (from task 04) filled in + section components
- `src/features/landing/components/` — **new** (role-card grid, discovery list, event drawer, register form)
- `src/components/eirmis/global-nav.tsx` — modified (session pill slot)

## Out of scope

- Real OAuth/magic-link (M5)
- Exhaustive a11y and all-states polish (Week 2)
