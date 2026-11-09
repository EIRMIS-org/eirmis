/**
 * src/pages/shared/app-chrome.tsx
 *
 * Task 04 — Routing & Role Guards (M4 Frontend Week 1)
 *
 * Shared portal chrome: the global nav wired to the session context and
 * the router, with an empty <Outlet /> below. Every layout shell
 * (landing + 4 portals) renders this with its own `activePortal` id;
 * portal tasks (06–10) fill the outlet and never touch the router.
 */

import { Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/providers/session-context'
import type { AuthenticatedRole } from '@/app/providers/session-profiles'
import { GlobalNav } from '@/components/eirmis/global-nav'

/** Portal nav ids → the routes Task 04 owns. */
const PORTAL_ROUTES: Record<string, string> = {
    hub: '/',
    organizer: '/organizer',
    admin: '/admin',
    guest: '/guest',
    staff: '/staff',
}

const IDENTITY_ROUTES: Record<AuthenticatedRole, string> = {
    organizer: '/organizer',
    admin: '/admin',
    guest: '/guest',
    checkin: '/staff',
}

export interface AppChromeProps {
    /** Which nav item is highlighted (`hub` | `organizer` | `guest` | `staff` | `admin`). */
    activePortal: string
}

export function AppChrome({ activePortal }: AppChromeProps) {
    const navigate = useNavigate()
    const { role, profile, isAuthenticated, signIn, signOut } = useSession()

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <GlobalNav
                activePortal={activePortal}
                onPortalSelect={(id) => navigate(PORTAL_ROUTES[id] ?? '/')}
                onBrandClick={() => navigate('/')}
                onIdentitySwitch={(nextRole) => {
                    signIn(nextRole)
                    navigate(IDENTITY_ROUTES[nextRole])
                }}
                user={
                    isAuthenticated && profile
                        ? {
                            name: profile.name,
                            role,
                            initials: profile.initials,
                        }
                        : null
                }
                onSignOut={isAuthenticated ? () => signOut() : undefined}
                onSignIn={() => navigate('/')}
            />
            <Outlet />
        </div>
    )
}
