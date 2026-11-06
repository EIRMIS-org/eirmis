/**
 * src/app/providers/session-context.tsx
 *
 * Task 03 — Session Context & Role Switching (M4 Frontend Week 1)
 *
 * Single source of truth for *who is using the app*. Wraps the API
 * wrapper's role primitive (`setRole`/`getRole`) in React state so the
 * UI reacts to identity changes and every outgoing request carries the
 * right mock bearer (MSW handlers key responses off the role).
 *
 * Persistence: the active role is stored in localStorage
 * (`eirmis.session.role`) so a refresh keeps the identity — required for
 * deep-link testing in the task-12 checkpoint.
 *
 * Real Google OAuth + Supabase Auth are M5 work; only this session
 * *interface* is needed in Week 1 so pages don't change when real auth
 * lands.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setRole, type Role } from '@/lib/api'
import {
    SESSION_PROFILES,
    isAuthenticatedRole,
    type AuthenticatedRole,
    type SessionProfile,
} from './session-profiles'

export interface Session {
    /** Active mock identity. */
    role: Role
    /** Name/email/initials for the session pill; null when signed out. */
    profile: SessionProfile | null
    /** True when the role is anything other than `public`. */
    isAuthenticated: boolean
    /** Mock SSO / magic-link sign-in: switches the active identity. */
    signIn: (role: AuthenticatedRole) => void
    /** Back to `public`; clears the profile and persisted role. */
    signOut: () => void
}

const SessionContext = createContext<Session | null>(null)

const STORAGE_KEY = 'eirmis.session.role'

function readPersistedRole(): AuthenticatedRole | null {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        return isAuthenticatedRole(stored) ? stored : null
    } catch {
        // localStorage unavailable (private mode, SSR, etc.) — no restore.
        return null
    }
}

function persistRole(role: Role): void {
    try {
        if (role === 'public') {
            window.localStorage.removeItem(STORAGE_KEY)
        } else {
            window.localStorage.setItem(STORAGE_KEY, role)
        }
    } catch {
        // Ignore persistence failures; the in-memory session still works.
    }
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [role, setSessionRole] = useState<Role>(() => {
        // The API wrapper defaults to 'organizer'; align it with the real
        // session (persisted role or signed-out) on first render.
        const persisted = readPersistedRole()
        setRole(persisted ?? 'public')
        return persisted ?? 'public'
    })

    const signIn = useCallback((next: AuthenticatedRole) => {
        setRole(next)
        persistRole(next)
        setSessionRole(next)
    }, [])

    const signOut = useCallback(() => {
        setRole('public')
        persistRole('public')
        setSessionRole('public')
    }, [])

    // Keep the wrapper in sync if the role is ever changed externally
    // (defensive; signIn/signOut already call setRole).
    useEffect(() => {
        setRole(role)
    }, [role])

    const value = useMemo<Session>(
        () => ({
            role,
            profile: role === 'public' ? null : SESSION_PROFILES[role],
            isAuthenticated: role !== 'public',
            signIn,
            signOut,
        }),
        [role, signIn, signOut],
    )

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
    const session = useContext(SessionContext)
    if (!session) {
        throw new Error(
            'useSession() must be used within a <SessionProvider>. ' +
            'Wrap your component tree with <AppProviders> (which includes SessionProvider) ' +
            'before calling useSession().',
        )
    }
    return session
}
