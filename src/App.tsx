/**
 * src/App.tsx
 *
 * Task 02 — App Shell & Providers (M4 Frontend Week 1)
 *
 * Thin application shell. The Vite starter demo content is gone; the
 * /styleguide and /docs path checks are kept temporarily and will be
 * migrated into real routes by Task 04 (Routing & Guards).
 */

import { lazy, Suspense } from 'react'

const Styleguide = lazy(() => import('./Styleguide'))

function App() {
  if (window.location.pathname === '/styleguide') {
    return (
      <Suspense fallback={<p>Loading style guide...</p>}>
        <Styleguide />
      </Suspense>
    )
  }

  if (window.location.pathname === '/docs' || window.location.pathname === '/docs/') {
    return (
      <div className="w-full h-screen flex flex-col bg-background">
        <header className="h-14 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm tracking-tight text-foreground">EIRMIS API Reference</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">OpenAPI 3.1</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border"
            >
              ← Back to App
            </a>
            <a
              href="/styleguide"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border"
            >
              Styleguide
            </a>
          </div>
        </header>
        <iframe
          src="/docs/index.html"
          title="EIRMIS OpenAPI Documentation"
          className="w-full flex-1 border-0"
        />
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">EIRMIS</h1>
      <p className="text-sm text-muted-foreground">M4 Frontend — Week 1 in progress</p>
      <p className="text-xs text-muted-foreground">
        App shell ready. Routes arrive with Task 04; portals with Tasks 06–10.
      </p>
    </main>
  )
}

export default App
