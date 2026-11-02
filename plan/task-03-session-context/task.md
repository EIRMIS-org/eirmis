# Task 03 — Session Context & Role Switching

| Field | Value |
|---|---|
| **Order** | 3rd — after task 02 |
| **Owner** | Lead (Andrei) |
| **Lane** | A (Infra) — sequential: 02 → 03 → 04 |
| **Branch** | `feat/m4-w1-session-context` |

---

## Scope

Build `SessionContext` — the single source of truth for *who is using the app* — and wire it to the API wrapper's role mechanism so every outgoing request carries the right mock identity.

## Design

The M2 API wrapper already has the role primitive: [`setRole()`](../../src/lib/api/index.ts) / [`getRole()`](../../src/lib/api/index.ts) with `Role = 'organizer' | 'admin' | 'guest' | 'checkin' | 'public'`. MSW handlers key their responses off this role. `SessionContext` wraps it in React state so UI can react to identity changes.

### Session shape

```ts
// src/app/providers/session-context.tsx
interface Session {
  role: Role                    // active mock identity
  profile: SessionProfile | null // name/email/avatar for the session pill
  isAuthenticated: boolean      // role !== 'public'
  signIn(role: Exclude<Role, 'public'>): void   // mock SSO / magic link
  signOut(): void               // back to 'public'
}
```

### Mock auth flows (mirroring the mockup-plan)

| Role | Mock sign-in | Mirrors |
|---|---|---|
| `organizer` | Google SSO button → instant session | [`sso-button.tsx`](../../src/components/eirmis/sso-button.tsx) + landing flow |
| `admin` | Google SSO button → instant session | same |
| `guest` | "Open magic link" → instant session | mockup-plan guest card |
| `checkin` | "Open magic link" → instant session | mockup-plan staff card |

Real Google OAuth + Supabase Auth are **M5** work (outside the contract). Week 1 only needs the session *interface* so pages don't change when real auth lands.

### Persistence

Persist the active role to `localStorage` (`eirmis.session.role`) so a refresh keeps the identity — this makes deep-link testing in task 12 possible.

## Steps

1. Create `src/app/providers/session-context.tsx` with the `Session` interface above; call [`setRole()`](../../src/lib/api/index.ts) on every `signIn`/`signOut` so the API wrapper and MSW stay in sync.
2. Seed mock profiles per role (name, email, avatar initials) in `src/app/providers/session-profiles.ts`.
3. Add `SessionProvider` to the `AppProviders` stack (inside `QueryClientProvider`, outside future router).
4. On mount, read the persisted role and restore the session.
5. Add a `useSession()` hook with a clear error if used outside the provider.
6. Smoke-test: sign in as organizer → confirm MSW handlers receive the organizer bearer (check a `listEvents` call from the browser console).

## Files touched

- `src/app/providers/session-context.tsx` — **new**
- `src/app/providers/session-profiles.ts` — **new**
- `src/app/providers/app-providers.tsx` — modified (add `SessionProvider`)

## Out of scope

- Real OAuth / Supabase Auth (M5)
- Route guards (task 04 consumes this context)
- The session-pill UI component (task 06 renders it in the landing/global nav)
