/**
 * src/app/routing/role-guard.tsx
 *
 * Task 04 — Routing & Role Guards (M4 Frontend Week 1)
 *
 * Declarative authorization for portal routes. Wrap a portal layout in
 * `<RoleGuard allow={['organizer']}>` and unauthenticated visitors are
 * bounced to the landing page while authenticated users with the wrong
 * role see the shared 403 screen.
 *
 * Guards are pure UI — no API calls, no navigation side effects beyond
 * the redirect. Pages decide where to go after sign-in; the guard only
 * decides *whether* content renders.
 */

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/app/providers/session-context'
import type { Role } from '@/lib/api'
import { ForbiddenPage } from './forbidden-page'

export interface RoleGuardProps {
    /** Roles allowed to see the wrapped content. */
    allow: Role[]
    /** Portal layout (or any element) rendered when authorized. */
    children: ReactNode
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
    const { role, isAuthenticated } = useSession()

    if (!isAuthenticated) {
        return <Navigate to="/" replace />
    }

    if (!allow.includes(role)) {
        return <ForbiddenPage allowedRoles={allow} />
    }

    return <>{children}</>
}
