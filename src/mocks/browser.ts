/**
 * src/mocks/browser.ts
 *
 * MSW browser worker — Task 05 (Issue #84)
 *
 * Enables browser-level mocking of the EIRMIS API for local development
 * without Prism or Supabase. Import and `await worker.start()` from the app
 * entry when a mock mode is requested (e.g. `?mocks=on` or VITE_ENABLE_MSW).
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
