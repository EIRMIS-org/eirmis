# Task 02 — Acceptance Criteria

- [ ] `src/app/providers/query-client.ts` exists and exports a configured `QueryClient` (staleTime 30 s, retry skips 4xx, no refetchOnWindowFocus)
- [ ] `src/app/providers/app-providers.tsx` composes ErrorBoundary → QueryClientProvider → TooltipProvider → Toaster
- [ ] `src/app/errors/error-boundary.tsx` renders a fallback with a working retry action
- [ ] `npm run dev` boots with the MSW service worker registered (visible in browser DevTools → Network)
- [ ] No MSW worker in a production build (`npm run build && npm run preview` shows no worker registration)
- [ ] The Vite starter counter/demo content is gone from [`src/App.tsx`](../../src/App.tsx)
- [ ] `npm run lint && npm run typecheck && npm run build` all green
