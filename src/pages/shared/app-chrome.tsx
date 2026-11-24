/**
 * src/pages/shared/app-chrome.tsx
 *
 * Task 04 - Routing & Role Guards (M4 Frontend Week 1)
 *
 * Shared portal chrome: the global nav wired to the session context and
 * the router, with an empty <Outlet /> below. Every layout shell
 * (landing + 4 portals) renders this with its own activePortal id;
 * portal tasks (06-10) fill the outlet and never touch the router.
 */

import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/providers/use-session'
import { GlobalNav } from '@/components/eirmis/global-nav'

export interface AppChromeProps {
    /** Which nav item is highlighted (hub | organizer | guest | staff | admin). */
    activePortal: string
}

export function AppChrome({ activePortal }: AppChromeProps) {
    const { pathname, hash } = useLocation()
    const navigate = useNavigate()
    const { role, profile, isAuthenticated, signOut } = useSession()

    useEffect(() => {
        if (hash) {
            const targetId = hash.slice(1)
            const el = document.getElementById(targetId)
            if (el) {
                el.scrollIntoView()
                return
            }
        }
        window.scrollTo(0, 0)
    }, [pathname, hash])

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* portals=[] hides the role switcher; roles are chosen on the landing page. */}
            <GlobalNav
                activePortal={activePortal}
                portals={[]}
                onBrandClick={() => navigate('/')}
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
