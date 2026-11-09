/**
 * src/app/routing/forbidden-page.tsx
 *
 * Task 04 — Routing & Role Guards (M4 Frontend Week 1)
 *
 * Shared 403 screen for every portal. Visual contract:
 * mockup-plan/organizer-portal/403-unauthorized.html — centered card,
 * circular red lock icon, "403: Access Denied" heading, muted
 * explanation, single primary action back to the hub.
 */

import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/api'

const ROLE_LABELS: Record<Role, string> = {
    organizer: 'Organizer',
    admin: 'Administrator',
    guest: 'Guest',
    checkin: 'Check-in Staff',
    public: 'Public',
}

export interface ForbiddenPageProps {
    /** Roles that *would* have been allowed — shown in the explanation. */
    allowedRoles?: Role[]
}

export function ForbiddenPage({ allowedRoles = [] }: ForbiddenPageProps) {
    const required = allowedRoles.map((role) => ROLE_LABELS[role]).join(' or ')

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
                <div className="mb-6 flex size-20 items-center justify-center rounded-full border-6 border-red-100 bg-red-100 text-red-700">
                    <ShieldX className="size-9" aria-hidden="true" />
                </div>
                <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
                    403: Access Denied
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    You do not have the required {required || 'portal'}{' '}
                    permissions to view this page. If you believe this is an
                    error, please contact the event administrator.
                </p>
                <Link to="/" className={cn(buttonVariants(), 'mt-8')}>
                    Return to Public Hub
                </Link>
            </div>
        </main>
    )
}
