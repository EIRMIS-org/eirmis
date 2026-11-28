/**
 * src/app/routing/not-found-page.tsx
 *
 * Task 04 — Routing & Role Guards (M4 Frontend Week 1)
 *
 * Catch-all 404 for unknown paths. Kept intentionally simple — same
 * centered-card language as the 403 screen so the error family feels
 * consistent.
 */

import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NotFoundPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
                <div className="mb-6 flex size-20 items-center justify-center rounded-full border-6 border-primary/10 bg-primary/10 text-primary">
                    <Compass className="size-9" aria-hidden="true" />
                </div>
                <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
                    404: Page Not Found
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    The page you are looking for does not exist or may have
                    been moved. Check the URL or head back to the hub.
                </p>
                <Link to="/" className={cn(buttonVariants(), 'mt-8')}>
                    Return to Public Hub
                </Link>
            </div>
        </main>
    )
}
