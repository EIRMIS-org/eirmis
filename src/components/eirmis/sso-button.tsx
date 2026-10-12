import React from 'react'
import { cn } from '@/lib/utils'

export type SsoProvider = 'google' | 'microsoft' | 'github' | 'organizer' | 'guest' | 'staff'

export interface SsoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider?: SsoProvider
  title?: string
  subtitle?: string
  badgeText?: string
  primary?: boolean
  icon?: React.ReactNode
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.04H3.29v2.53A9.74 9.74 0 0 0 12 21.5z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.57A5.86 5.86 0 0 1 6.22 12c0-.54.11-1.07.31-1.57V7.9H3.29A9.5 9.5 0 0 0 2.5 12c0 1.48.35 2.88.79 4.1l3.24-2.53z"
      />
      <path
        fill="#EA4335"
        d="M12 6.39c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.47 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.71 5.4l3.24 2.53C7.3 8.11 9.46 6.39 12 6.39z"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

const defaultContent: Record<
  SsoProvider,
  { title: string; subtitle?: string; icon: React.ReactNode; defaultBadge?: string }
> = {
  google: {
    title: 'Continue with Google',
    subtitle: 'Fast sign-in with your institutional or Google account',
    icon: <GoogleIcon />,
    defaultBadge: 'Recommended',
  },
  microsoft: {
    title: 'Sign in with Microsoft 365',
    subtitle: 'Institutional single sign-on via Azure AD / Entra ID',
    icon: <MicrosoftIcon />,
  },
  github: {
    title: 'Continue with GitHub',
    subtitle: 'Developer and engineering ecosystem authentication',
    icon: <GithubIcon />,
  },
  organizer: {
    title: 'Sign in as Organizer',
    subtitle: 'Manage events, attendees, and invitation pipelines',
    icon: (
      <svg
        className="size-4 shrink-0 text-indigo-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  guest: {
    title: 'Guest RSVP Access',
    subtitle: 'Enter with invitation code or personal RSVP link',
    icon: (
      <svg
        className="size-4 shrink-0 text-emerald-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
  },
  staff: {
    title: 'Check-in Staff Scanner',
    subtitle: 'Door personnel badge & QR verification station',
    icon: (
      <svg
        className="size-4 shrink-0 text-amber-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M3 17v2a2 2 0 0 0 2 2h2" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
}

export function SsoButton({
  provider = 'google',
  title,
  subtitle,
  badgeText,
  primary,
  icon,
  className,
  ...props
}: SsoButtonProps) {
  const fallback = defaultContent[provider]
  const displayTitle = title ?? fallback.title
  const displaySubtitle = subtitle ?? fallback.subtitle
  const displayBadge = badgeText ?? fallback.defaultBadge
  const displayIcon = icon ?? fallback.icon
  const isGooglePrimary = primary || provider === 'google'

  return (
    <button
      type="button"
      className={cn(
        'group relative flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200',
        'border-border/80 bg-white hover:border-border hover:shadow-xs active:scale-[0.99]',
        isGooglePrimary &&
          'border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 hover:border-indigo-200 hover:shadow-sm',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-2xs transition-transform group-hover:scale-105',
            provider === 'organizer' && 'bg-indigo-50/80 border-indigo-100',
            provider === 'guest' && 'bg-emerald-50/80 border-emerald-100',
            provider === 'staff' && 'bg-amber-50/80 border-amber-100'
          )}
        >
          {displayIcon}
        </span>
        <div className="min-w-0 flex-1">
          {displayBadge && (
            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {displayBadge}
            </span>
          )}
          <span className="block truncate text-xs font-semibold text-foreground group-hover:text-foreground">
            {displayTitle}
          </span>
          {displaySubtitle && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {displaySubtitle}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground">
        →
      </span>
    </button>
  )
}
