/**
 * src/main.tsx
 *
 * Task 02 — App Shell & Providers (M4 Frontend Week 1)
 *
 * App entry: boots the MSW service worker in development only, then
 * renders the app inside the provider stack. The production build never
 * loads the worker (the dynamic import is dead code when DEV is false).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProviders } from './app/providers/app-providers'

async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  // 'bypass' lets non-API requests (Vite assets, HMR) pass through untouched.
  return worker.start({ onUnhandledFrame: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  )
})
