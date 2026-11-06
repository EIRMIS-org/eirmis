/**
 * src/app/providers/query-client.ts
 *
 * Task 02 — App Shell & Providers (M4 Frontend Week 1)
 *
 * QueryClient factory for the EIRMIS app. Policy tuned for development
 * against MSW mocks (see plan/task-02-app-shell-providers/task.md):
 *
 * - staleTime 30s: mock data is stable; avoids refetch storms during
 *   portal development.
 * - retry 1, skipping 4xx: contract-documented client failures
 *   (401/403/404/422/429) should surface to the UI immediately instead
 *   of being retried. Only transient failures (5xx / network) retry once.
 * - refetchOnWindowFocus false: dev ergonomics with MSW.
 */

import { QueryClient } from '@tanstack/react-query'

/** HTTP status threshold below which failures are considered client errors. */
const CLIENT_ERROR_MIN = 400

/** Extracts the HTTP status from a TanStack Query error, if present. */
function getErrorStatus(error: unknown): number | null {
    if (error instanceof Response) return error.status
    if (typeof error === 'object' && error !== null && 'status' in error) {
        const status = (error as { status?: unknown }).status
        if (typeof status === 'number') return status
    }
    return null
}

export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                refetchOnWindowFocus: false,
                retry: (failureCount, error) => {
                    const status = getErrorStatus(error)
                    // Never retry contract-documented client errors (4xx).
                    if (status !== null && status >= CLIENT_ERROR_MIN && status < 600) {
                        return false
                    }
                    // Retry transient failures (5xx / network) once.
                    return failureCount < 1
                },
            },
            mutations: {
                retry: false,
            },
        },
    })
}

/** App-wide singleton — imported by AppProviders. */
export const queryClient = createQueryClient()
