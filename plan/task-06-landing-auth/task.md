# Task 06 — Landing Page & Per-Role Auth Entry

| Field | Value |
|---|---|
| **Order** | Starts as soon as 04 + 05 land — lightest Lane D task |
| **Owner** | Jian |
| **Lane** | D (Portals) — parallel with 07–10 |
| **Branch** | `feat/m4-w1-landing-auth` → PR to `feat/m4-frontend` |

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

## Developer Import Map

```tsx
// 1. Session Context (from Task 03)
import { useSession } from '@/app/providers/session-context'
import type { AuthenticatedRole } from '@/app/providers/session-profiles'

// 2. Data Hooks (from Task 05)
import { useDiscoverPublicEvents } from '@/features/landing/hooks/use-discover-public-events'
import { usePublicGallery } from '@/features/landing/hooks/use-public-gallery'
import { useRegisterPublicGuest } from '@/features/landing/hooks/use-register-public-guest'

// 3. Forms & Validation (from Task 11)
import {
  registerPublicSchema,
  registerPublicResolver,
  FormRow,
  applyContractError,
} from '@/lib/forms'

// 4. Pre-built Domain Components (src/components/eirmis/)
import { SolutionCard } from '@/components/eirmis/portal-cards'
import { SsoButton } from '@/components/eirmis/sso-button'
import { GlobalNav } from '@/components/eirmis/global-nav'

// 5. UI Primitives (src/components/ui/)
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
```

## Target File Structure

```
src/
├── pages/
│   └── landing/
│       ├── landing-layout.tsx               (existing layout shell rendering AppChrome + Outlet)
│       └── landing-page.tsx                 ← NEW: Main public hub page mounted at "/"
└── features/
    └── landing/
        └── components/                      ← NEW: Modular landing section components
            ├── hero-section.tsx             (Hero text, headline, product pitch)
            ├── role-card-grid.tsx           (4 cards: Organizer, Admin, Guest, Check-in Staff)
            ├── public-discovery-grid.tsx    (Open events grid with loading/empty/error states)
            ├── event-registration-drawer.tsx (Detail modal/drawer with gallery + registration form)
            └── magic-link-modal.tsx         (Dialog simulating email magic link for Guest/Staff)
```

## Router Slot Handoff

In [`src/app/routing/router.tsx`](../../src/app/routing/router.tsx), the root route currently renders:
```tsx
{
  path: '/',
  element: <LandingLayout />,
  children: [
    { index: true, element: <PlaceholderPage title="Public Hub" note="..." /> }
  ]
}
```
Replace the child `PlaceholderPage` with `<LandingPage />` imported from `@/pages/landing/landing-page`.

---

## Detailed Step-by-Step Implementation Guide

1. **Role Cards & Auth Flows (`role-card-grid.tsx` + `magic-link-modal.tsx`)**:
   - Render the 4 role cards using `SolutionCard` or custom card layout matching `mockup-plan/landing/landing.html`.
   - **Organizer Card**: Clicking opens modal with `SsoButton` (or triggers `signIn('organizer')`) → `navigate('/organizer')`.
   - **Admin Card**: Clicking opens modal with `SsoButton` (or triggers `signIn('admin')`) → `navigate('/admin')`.
   - **Guest Card**: Clicking opens magic-link modal → input email → simulates link sent → `signIn('guest')` → `navigate('/guest')`.
   - **Check-in Staff Card**: Clicking opens magic-link modal → input email → simulates link sent → `signIn('checkin')` → `navigate('/staff')`.
2. **Public Event Discovery (`public-discovery-grid.tsx`)**:
   - Call `const { data: events, isLoading, isError, refetch } = useDiscoverPublicEvents()`.
   - **Loading state**: Render 3 skeleton cards (`<Skeleton className="h-48 rounded-xl" />`).
   - **Empty state**: "No open events right now. Check back soon."
   - **Error state**: "Failed to load public events." with a "Retry" button calling `refetch()`.
   - **Success state**: Grid of published events showing title, date (`starts_at`), venue, and "Register" CTA.
3. **Event Registration Drawer / Modal (`event-registration-drawer.tsx`)**:
   - Clicking an event opens the drawer/modal.
   - Load gallery images using `usePublicGallery(selectedEvent.id)`.
   - Form uses `useForm({ resolver: registerPublicResolver })` with `FormRow`.
   - On submit, call `registerPublicGuest({ event_id, ...values })`.
   - On success: show confirmation state (e.g., "Registration Confirmed!").
   - On 422 error: pass error to `applyContractError(error, form.setError)`.
4. **Session Pill in Global Nav**:
   - Ensure [`src/pages/shared/app-chrome.tsx`](../../src/pages/shared/app-chrome.tsx) passes profile and sign-in/sign-out actions to `GlobalNav`.
   - Verify clicking "Sign Out" calls `useSession().signOut()` and redirects to `/`.

---

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
