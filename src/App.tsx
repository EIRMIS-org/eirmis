/**
 * src/App.tsx
 *
 * Task 04 — App entry is now just the router. The full route table lives
 * in src/app/routing/router.tsx; providers (error boundary, theme,
 * query client, session, toaster) wrap this component in main.tsx.
 *
 * The /docs and /styleguide path checks that used to live here moved
 * into real routes (task 04).
 */

import { AppRouter } from '@/app/routing/router'

function App() {
  return <AppRouter />
}

export default App
