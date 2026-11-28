/**
 * src/app/providers/app-providers.tsx
 *
 * Task 02 — App Shell & Providers (M4 Frontend Week 1)
 * Task 03 — Session Context wired in.
 *
 * Composes the full provider stack. Order matters:
 *
 *   ErrorBoundary            catches render errors from everything below
 *   ThemeProvider            next-themes context (sonner Toaster depends on useTheme)
 *   QueryClientProvider      server-state cache (TanStack Query)
 *   SessionProvider          active mock identity (slots inside QueryClientProvider,
 *                            outside the future router)
 *   TooltipProvider          shadcn/ui tooltip context
 *   Toaster                  sonner notifications
 *
 * Slot-in points for later tasks (no rewrites needed):
 *   - Task 04: RouterProvider replaces the {children} slot
 */

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from './query-client'
import { SessionProvider } from './session-context'
import { ErrorBoundary } from '@/app/errors/error-boundary'

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary>
            <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
            >
                <QueryClientProvider client={queryClient}>
                    <SessionProvider>
                        <TooltipProvider>
                            {children}
                            <Toaster />
                        </TooltipProvider>
                    </SessionProvider>
                </QueryClientProvider>
            </ThemeProvider>
        </ErrorBoundary>
    )
}
