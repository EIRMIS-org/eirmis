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
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/app/providers/use-session'
import type { Role } from '@/lib/api'
import { ForbiddenPage } from './forbidden-page'

export const REDIRECT_STORAGE_KEY = 'eirmis.auth.redirect'

export interface RoleGuardProps {
    /** Roles allowed to see the wrapped content. */
    allow: Role[]
    /** Portal layout (or any element) rendered when authorized. */
    children: ReactNode
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
    const location = useLocation()
    const { role, isAuthenticated } = useSession()

    if (!isAuthenticated) {
        try {
            const target = `${location.pathname}${location.search}${location.hash}`
            if (target.startsWith('/') && !target.startsWith('//') && target !== '/') {
                window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, target)
            }
        } catch {
            // Ignore sessionStorage errors (restricted browsing contexts).
        }
        return <Navigate to="/" replace />
    }

    if (!allow.includes(role)) {
        return <ForbiddenPage allowedRoles={allow} />
    }

    return <>{children}</>
}