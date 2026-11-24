import {
    ArrowRight,
    CalendarDays,
    ScanLine,
    ShieldCheck,
    TicketCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/app/providers/use-session'
import type { AuthenticatedRole } from '@/app/providers/session-profiles'
import { REDIRECT_STORAGE_KEY } from '@/app/routing/role-guard'
import { cn } from '@/lib/utils'

interface RoleOption {
    role: AuthenticatedRole
    title: string
    description: string
    destination: string
    buttonTitle: string
    icon: typeof CalendarDays
    iconClassName: string
}

// Guest first: the landing page's primary audience.
const ROLE_OPTIONS: RoleOption[] = [
    {
        role: 'guest',
        title: 'Event Guest',
        description:
            'Open your invitations, respond to an RSVP, and manage your party.',
        destination: '/guest',
        buttonTitle: 'Continue as Guest',
        icon: TicketCheck,
        iconClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
        role: 'organizer',
        title: 'Event Organizer',
        description:
            'Create events, manage invitations, and coordinate every RSVP.',
        destination: '/organizer',
        buttonTitle: 'Continue as Organizer',
        icon: CalendarDays,
        iconClassName: 'border-teal-200 bg-teal-50 text-teal-700',
    },
    {
        role: 'admin',
        title: 'System Administrator',
        description: 'Review organizer access and manage platform-wide settings.',
        destination: '/admin',
        buttonTitle: 'Continue as Admin',
        icon: ShieldCheck,
        iconClassName: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    {
        role: 'checkin',
        title: 'Check-in Staff',
        description: 'Verify guest passes and keep the entrance moving smoothly.',
        destination: '/staff',
        buttonTitle: 'Continue as Staff',
        icon: ScanLine,
        iconClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    },
]

/** Portal root per role — used to validate saved redirects. */
const ROLE_PORTAL_PREFIXES: Record<AuthenticatedRole, string> = {
    organizer: '/organizer',
    admin: '/admin',
    guest: '/guest',
    checkin: '/staff',
}

/**
 * Honor the RoleGuard redirect-memory key only when the saved route belongs
 * to the portal being signed into. A stale redirect for a different portal
 * (e.g. an earlier unauthenticated visit to /admin) must not route this
 * sign-in to a guard that rejects it with 403.
 */
function resolveDestination(role: AuthenticatedRole, destination: string): string {
    const portalPrefix = ROLE_PORTAL_PREFIXES[role]
    try {
        const saved = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)
        if (saved) {
            window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
            // Prefix match also rejects protocol-relative targets like //evil.com.
            if (saved.startsWith(portalPrefix)) {
                return saved
            }
        }
    } catch {
        // Ignore sessionStorage errors.
    }
    return destination
}

/**
 * Hero sign-in card: one simulation button per role. Clicking a role signs
 * in with mock auth and navigates to that portal, honoring the RoleGuard
 * redirect-memory key. Real authentication (Google SSO / magic links)
 * arrives in M5.
 */
export function HeroSignInCard() {
    const navigate = useNavigate()
    const { signIn } = useSession()

    function handleSignIn(option: RoleOption) {
        const destination = resolveDestination(option.role, option.destination)
        signIn(option.role)
        navigate(destination)
    }

    return (
        <div
            id="sign-in"
            className="scroll-mt-20 rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
        >
            <h2 className="font-heading text-lg font-extrabold tracking-tight text-slate-900">
                Sign in to EIRMIS
            </h2>
            <p className="mt-1 text-xs text-slate-500">
                Pick a portal to enter &mdash; sign-in is simulated in this preview.
            </p>

            <ul className="mt-4 list-none space-y-2 p-0">
                {ROLE_OPTIONS.map((option) => {
                    const Icon = option.icon

                    return (
                        <li key={option.role}>
                            <button
                                type="button"
                                onClick={() => handleSignIn(option)}
                                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            >
                                <span
                                    className={cn(
                                        'flex size-9 shrink-0 items-center justify-center rounded-lg border',
                                        option.iconClassName,
                                    )}
                                >
                                    <Icon className="size-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-slate-900">
                                        {option.buttonTitle}
                                    </span>
                                    <span className="block truncate text-xs text-slate-500">
                                        {option.description}
                                    </span>
                                </span>
                                <ArrowRight
                                    className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                                    aria-hidden="true"
                                />
                            </button>
                        </li>
                    )
                })}
            </ul>

            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                Mock authentication for this preview.
            </p>
        </div>
    )
}
