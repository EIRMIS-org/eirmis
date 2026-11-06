/**
 * src/app/providers/session-profiles.ts
 *
 * Task 03 — Session Context & Role Switching (M4 Frontend Week 1)
 *
 * Mock profiles for the four authenticated roles. These stand in for the
 * profile records that M5 will fetch from Supabase (`organizer_profile` /
 * `admin_profile` tables). The session pill (task 06) renders these.
 */

import type { Role } from '@/lib/api'

export interface SessionProfile {
    name: string
    email: string
    initials: string
}

/** Roles that can hold a session (everything except anonymous `public`). */
export type AuthenticatedRole = Exclude<Role, 'public'>

export const SESSION_PROFILES: Record<AuthenticatedRole, SessionProfile> = {
    organizer: {
        name: 'Maria Santos',
        email: 'maria.santos@eirmis.dev',
        initials: 'MS',
    },
    admin: {
        name: 'Alex Rivera',
        email: 'alex.rivera@eirmis.dev',
        initials: 'AR',
    },
    guest: {
        name: 'Jordan Cruz',
        email: 'jordan.cruz@example.com',
        initials: 'JC',
    },
    checkin: {
        name: 'Sam Reyes',
        email: 'sam.reyes@eirmis.dev',
        initials: 'SR',
    },
}

/** Type guard: is this string one of the four authenticated roles? */
export function isAuthenticatedRole(value: unknown): value is AuthenticatedRole {
    return (
        value === 'organizer' ||
        value === 'admin' ||
        value === 'guest' ||
        value === 'checkin'
    )
}
