import { createContext, useContext } from 'react'
import type { Role } from '@/lib/api'
import type { AuthenticatedRole, SessionProfile } from './session-profiles'

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

export const SessionContext = createContext<Session | null>(null)

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
