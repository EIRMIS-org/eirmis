import {
  CalendarDays,
  ScanLine,
  ShieldCheck,
  TicketCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SolutionCard } from '@/components/eirmis/portal-cards'
import { SsoButton } from '@/components/eirmis/sso-button'
import { useSession } from '@/app/providers/use-session'
import type { AuthenticatedRole } from '@/app/providers/session-profiles'
import { REDIRECT_STORAGE_KEY } from '@/app/routing/role-guard'

const roleCards: {
  role: AuthenticatedRole
  title: string
  description: string
  destination: string
  provider: 'google' | 'guest' | 'staff'
  buttonTitle: string
  badge: string
  icon: typeof CalendarDays
}[] = [
  {
    role: 'organizer',
    title: 'Event Organizer',
    description: 'Create events, manage invitations, and coordinate every RSVP.',
    destination: '/organizer',
    provider: 'google',
    buttonTitle: 'Continue as Organizer',
    badge: 'Google SSO · mock',
    icon: CalendarDays,
  },
  {
    role: 'admin',
    title: 'System Administrator',
    description: 'Review organizer access and manage platform-wide settings.',
    destination: '/admin',
    provider: 'google',
    buttonTitle: 'Continue as Admin',
    badge: 'Google SSO · mock',
    icon: ShieldCheck,
  },
  {
    role: 'guest',
    title: 'Event Guest',
    description: 'Open your invitations, respond to an RSVP, and manage your party.',
    destination: '/guest',
    provider: 'guest',
    buttonTitle: 'Open guest magic link',
    badge: 'Magic link · mock',
    icon: TicketCheck,
  },
  {
    role: 'checkin',
    title: 'Check-in Staff',
    description: 'Verify guest passes and keep the entrance moving smoothly.',
    destination: '/staff',
    provider: 'staff',
    buttonTitle: 'Open staff magic link',
    badge: 'Magic link · mock',
    icon: ScanLine,
  },
]

export function RoleCardGrid() {
  const navigate = useNavigate()
  const { signIn } = useSession()

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {roleCards.map((card) => {
        const Icon = card.icon

        return (
          <article
            key={card.role}
            className="h-full"
          >
            <SolutionCard
              title={card.title}
              description={card.description}
              icon={<Icon className="size-5" aria-hidden="true" />}
              badge={card.badge}
              headingLevel="h3"
              className="h-full p-5"
            >
              <div className="mt-5 border-t border-border/70 pt-4">
                <SsoButton
                  provider={card.provider}
                  title={card.buttonTitle}
                  subtitle="Mock authentication for this preview"
                  badgeText="Mock sign-in"
                  primary={card.role === 'organizer' || card.role === 'admin'}
                  className="static after:absolute after:inset-0 after:content-['']"
                  onClick={() => {
                    let nextDestination = card.destination
                    try {
                      const saved = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)
                      if (saved) {
                        window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
                        if (saved.startsWith('/') && !saved.startsWith('//')) {
                          nextDestination = saved
                        }
                      }
                    } catch {
                      // Ignore sessionStorage errors.
                    }
                    signIn(card.role)
                    navigate(nextDestination)
                  }}
                />
              </div>
            </SolutionCard>
          </article>
        )
      })}
    </div>
  )
}
