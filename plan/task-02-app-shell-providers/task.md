# Task 02 — App Shell & Providers

| Field | Value |
|---|---|
| **Order** | 2nd — after task 01 |
| **Owner** | Andrei (Lead) + Jack |
| **Lane** | A (Infra) — sequential: 01 → 02 → 03 → 04 |
| **Branch** | `feat/m4-w1-app-shell` → PR to `feat/m4-frontend` |

---

## Scope

Replace the Vite starter in [`src/App.tsx`](../../src/App.tsx) with the real application shell: provider stack, MSW boot, and the `src/app/` directory that owns all cross-cutting concerns.

## Current state (what gets replaced)

[`src/App.tsx`](../../src/App.tsx) is still the Vite template — a counter demo with two hardcoded path checks (`/styleguide`, `/docs`). The `/docs` Redoc iframe and `/styleguide` lazy route are **kept** (they are useful), but moved into the router in task 04. This task only builds the provider foundation.

## Target structure created by this task

```
src/
├── app/
│   ├── providers/
│   │   ├── app-providers.tsx     ← composes the full provider stack
│   │   └── query-client.ts       ← QueryClient factory (staleTime, retry policy)
│   └── errors/
│       └── error-boundary.tsx    ← top-level ErrorBoundary with retry
├── main.tsx                      ← modified: boot MSW, then render <AppProviders><App/></AppProviders>
└── App.tsx                       ← modified: becomes a thin shell (Outlet placeholder until task 04)
```

## Provider stack (order matters)

```tsx
// app-providers.tsx — composition order
<ErrorBoundary>            {/* catches render errors from everything below */}
  <QueryClientProvider>    {/* server-state cache */}
    <TooltipProvider>      {/* shadcn/ui tooltip context */}
      <SonnerToaster />    {/* notifications, already installed */}
      {children}
    </TooltipProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

`SessionContext` (task 03) and `RouterProvider` (task 04) slot into this stack later — this task creates the composition point so they plug in without rewrites.

## QueryClient policy

| Setting | Value | Rationale |
|---|---|---|
| `staleTime` | 30 s | Mock data is stable; avoids refetch storms during portal dev |
| `retry` | 1 (skip 4xx) | Contract-documented failures (401/403/422/429) should surface to UI, not retry |
| `refetchOnWindowFocus` | false | Dev ergonomics with MSW |

## MSW boot pattern

Follow [`src/mocks/browser.ts`](../../src/mocks/browser.ts) — conditional worker start only in dev, so the production build never loads the worker:

```tsx
// main.tsx
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode><AppProviders /></StrictMode>
  )
)
```

## Steps

1. Create `src/app/providers/query-client.ts` with the policy above.
2. Create `src/app/providers/app-providers.tsx` composing the stack.
3. Create `src/app/errors/error-boundary.tsx` (class component, fallback UI with a retry button, logs to console for now).
4. Rewrite [`src/main.tsx`](../../src/main.tsx) with the MSW boot pattern.
5. Reduce [`src/App.tsx`](../../src/App.tsx) to a placeholder shell (hero text "EIRMIS — M4 in progress"); keep the `/docs` and `/styleguide` logic temporarily — task 04 migrates them into routes.
6. Verify `npm run dev` boots with MSW active (network tab shows the service worker) and no console errors.

## Files touched

- `src/app/providers/query-client.ts` — **new**
- `src/app/providers/app-providers.tsx` — **new**
- `src/app/errors/error-boundary.tsx` — **new**
- [`src/main.tsx`](../../src/main.tsx) — modified
- [`src/App.tsx`](../../src/App.tsx) — modified

## Out of scope

- No session logic (task 03), no routes (task 04), no pages (tasks 06–10).
