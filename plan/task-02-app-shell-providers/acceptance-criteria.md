# Task 02 — Acceptance Criteria

- [x] `src/app/providers/query-client.ts` exists and exports a configured `QueryClient` (staleTime 30 s, retry skips 4xx, no refetchOnWindowFocus)
- [x] `src/app/providers/app-providers.tsx` composes ErrorBoundary → QueryClientProvider → TooltipProvider → Toaster
- [x] `src/app/errors/error-boundary.tsx` renders a fallback with a working retry action
- [x] `npm run dev` boots with the MSW service worker registered (visible in browser DevTools → Network) — *verified: `[MSW] Mocking enabled.` in console, requests fulfilled by `mockServiceWorker.js`*
- [x] No MSW worker in a production build (`npm run build && npm run preview` shows no worker registration) — *verified on localhost:4174: no worker, no `[MSW]` log, no console errors*
- [x] The Vite starter counter/demo content is gone from [`src/App.tsx`](../../src/App.tsx)
- [x] `npm run lint && npm run typecheck && npm run build` all green
