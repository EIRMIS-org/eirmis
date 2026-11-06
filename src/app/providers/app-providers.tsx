/**
 * src/app/providers/app-providers.tsx
 *
 * Task 02 — App Shell & Providers (M4 Frontend Week 1)
 *
 * Composes the full provider stack. Order matters:
 *
 *   ErrorBoundary            catches render errors from everything below
 *   ThemeProvider            next-themes context (sonner Toaster depends on useTheme)
 *   QueryClientProvider      server-state cache (TanStack Query)
 *   TooltipProvider          shadcn/ui tooltip context
 *   Toaster                  sonner notifications
 *
 * Slot-in points for later tasks (no rewrites needed):
 *   - Task 03: SessionProvider wraps the children inside QueryClientProvider
 *   - Task 04: RouterProvider replaces the {children} slot
 */

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from './query-client'
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
                    <TooltipProvider>
                        {children}
                        <Toaster />
                    </TooltipProvider>
                </QueryClientProvider>
            </ThemeProvider>
        </ErrorBoundary>
    )
}
