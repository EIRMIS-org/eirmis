import { useState, type FormEvent } from 'react'
import {
    CalendarDays,
    Eye,
    EyeOff,
    MailCheck,
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
    shortLabel: string
    title: string
    description: string
    destination: string
    authMode: 'password' | 'magic-link'
    submitLabel: string
    icon: typeof CalendarDays
    iconClassName: string
}

// Guest first: the landing page's primary audience.
const ROLE_OPTIONS: RoleOption[] = [
    {
        role: 'guest',
        shortLabel: 'Guest',
        title: 'Event Guest',
        description:
            'Open your invitations, respond to an RSVP, and manage your party.',
        destination: '/guest',
        authMode: 'magic-link',
        submitLabel: 'Send magic link',
        icon: TicketCheck,
        iconClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
        role: 'organizer',
        shortLabel: 'Organizer',
        title: 'Event Organizer',
        description:
            'Create events, manage invitations, and coordinate every RSVP.',
        destination: '/organizer',
        authMode: 'password',
        submitLabel: 'Sign in',
        icon: CalendarDays,
        iconClassName: 'border-teal-200 bg-teal-50 text-teal-700',
    },
    {
        role: 'admin',
        shortLabel: 'Admin',
        title: 'System Administrator',
        description: 'Review organizer access and manage platform-wide settings.',
        destination: '/admin',
        authMode: 'password',
        submitLabel: 'Sign in',
        icon: ShieldCheck,
        iconClassName: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    {
        role: 'checkin',
        shortLabel: 'Staff',
        title: 'Check-in Staff',
        description: 'Verify guest passes and keep the entrance moving smoothly.',
        destination: '/staff',
        authMode: 'magic-link',
        submitLabel: 'Send magic link',
        icon: ScanLine,
        iconClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveDestination(destination: string): string {
    try {
        const saved = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)
        if (saved) {
            window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
            if (saved.startsWith('/') && !saved.startsWith('//')) {
                return saved
            }
        }
    } catch {
        // Ignore sessionStorage errors.
    }
    return destination
}

/**
 * Hero sign-in card. One card, one form: Guest/Staff sign in with a magic
 * link (email only), Organizer/Admin with email + password. The role pills
 * live inside the card; switching roles swaps the auth mode while keeping
 * the entered email. Validation errors are announced via role="alert".
 */
export function HeroSignInCard() {
    const navigate = useNavigate()
    const { signIn } = useSession()
    const [selected, setSelected] = useState<RoleOption>(() => ROLE_OPTIONS[0])
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

    function selectRole(option: RoleOption) {
        setSelected(option)
        setErrors({})
        setShowPassword(false)
        if (option.authMode === 'magic-link') {
            setPassword('')
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const nextErrors: typeof errors = {}
        if (!email.trim()) {
            nextErrors.email = 'Email is required.'
        } else if (!EMAIL_PATTERN.test(email.trim())) {
            nextErrors.email = 'Enter a valid email address.'
        }
        if (selected.authMode === 'password' && !password) {
            nextErrors.password = 'Password is required.'
        }

        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) {
            return
        }

        const destination = resolveDestination(selected.destination)
        signIn(selected.role)
        navigate(destination)
    }

    const Icon = selected.icon
    const emailErrorId = errors.email ? 'hero-signin-email-error' : undefined
    const passwordErrorId = errors.password ? 'hero-signin-password-error' : undefined

    return (
        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-center gap-3">
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                        selected.iconClassName,
                    )}
                >
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h2 className="font-heading text-lg font-extrabold tracking-tight text-slate-900">
                        {selected.title}
                    </h2>
                    <p className="truncate text-xs text-slate-500">
                        {selected.authMode === 'magic-link'
                            ? 'Passwordless sign-in'
                            : 'Email and password'}
                    </p>
                </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {selected.description}
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="grid gap-1.5">
                    <label
                        htmlFor="hero-signin-email"
                        className="text-xs font-semibold text-slate-700"
                    >
                        Email address
                    </label>
                    <input
                        id="hero-signin-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={emailErrorId}
                        className={cn(
                            'h-10 w-full rounded-lg border px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40',
                            errors.email
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-slate-200 focus:border-teal-500',
                        )}
                    />
                    {errors.email && (
                        <p
                            id="hero-signin-email-error"
                            role="alert"
                            className="text-xs font-medium text-red-600"
                        >
                            {errors.email}
                        </p>
                    )}
                </div>

                {selected.authMode === 'password' && (
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="hero-signin-password"
                            className="text-xs font-semibold text-slate-700"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="hero-signin-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={passwordErrorId}
                                className={cn(
                                    'h-10 w-full rounded-lg border px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40',
                                    errors.password
                                        ? 'border-red-400 focus:border-red-500'
                                        : 'border-slate-200 focus:border-teal-500',
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            >
                                {showPassword ? (
                                    <EyeOff className="size-4" aria-hidden="true" />
                                ) : (
                                    <Eye className="size-4" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p
                                id="hero-signin-password-error"
                                role="alert"
                                className="text-xs font-medium text-red-600"
                            >
                                {errors.password}
                            </p>
                        )}
                    </div>
                )}

                {selected.authMode === 'magic-link' && (
                    <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                        <MailCheck className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden="true" />
                        We&rsquo;ll email you a one-time sign-in link &mdash; no password
                        needed.
                    </p>
                )}

                <button
                    type="submit"
                    className="flex h-10 w-full items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                >
                    {selected.submitLabel}
                </button>
            </form>

            <div
                role="group"
                aria-label="Switch role"
                className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4"
            >
                {ROLE_OPTIONS.map((option) => {
                    const OptionIcon = option.icon
                    const isActive = option.role === selected.role

                    return (
                        <button
                            key={option.role}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => selectRole(option)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                                isActive
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                            )}
                        >
                            <OptionIcon className="size-3.5" aria-hidden="true" />
                            {option.shortLabel}
                        </button>
                    )
                })}
            </div>

            <p className="mt-4 text-[11px] text-slate-400">
                Mock authentication for this preview.
            </p>
        </div>
    )
}
