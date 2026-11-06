/**
 * src/mocks/server.ts
 *
 * MSW Node server — Task 05 (Issue #84)
 *
 * `setupServer` instance for Vitest + React Testing Library (M4 component
 * tests). Usage in a test setup file:
 *
 *   import { server } from '@/mocks/server';
 *   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
