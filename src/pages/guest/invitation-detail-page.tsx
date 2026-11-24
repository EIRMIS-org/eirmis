import { Link, useParams } from 'react-router-dom'
import { UserIcon } from 'lucide-react'
import { useMyInvitations } from '@/features/guest/hooks/use-my-invitations'
import { RosterEditor } from '@/features/guest/components/roster-editor'
import { RsvpSection } from '@/features/guest/components/rsvp-section'
import { WalletPassView } from '@/features/guest/components/wallet-pass-view'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useDiscoverPublicEvents } from '@/features/landing/hooks/use-discover-public-events'

export function InvitationDetailPage() {
  const { invitationId } = useParams()
  const invitations = useMyInvitations()
  const invitation = invitations.data?.find((item) => item.id === invitationId)
  const events = useDiscoverPublicEvents()
  const event = events.data?.find((item) => item.id === invitation?.event_id)

  if (invitations.isLoading || events.isLoading) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </main>
    )
  }

  if (invitations.isError) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-3 p-4">
        <p role="alert" className="text-sm text-destructive">
          We could not load this invitation.
        </p>
        <Button variant="outline" onClick={() => invitations.refetch()}>
          Try again
        </Button>
      </main>
    )
  }

  if (!invitation) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-4 p-4">
        <h1 className="text-2xl font-semibold">Invitation not found</h1>
        <Link
          to="/guest"
          className="inline-flex h-8 items-center rounded-2xl border border-border px-3 text-sm font-medium hover:bg-muted"
        >
          Back to invitations
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to="/guest" className="text-sm font-medium text-primary hover:underline">
          ← Back to invitations
        </Link>
        <Link
          to="/guest/profile"
          className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border px-3 text-sm font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <UserIcon className="size-3.5" aria-hidden="true" />
          <span>Profile</span>
        </Link>
      </header>
      <Card>
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invitation details
          </p>
          <h1 className="text-2xl font-semibold">
            {event?.title ?? 'Invitation'}
          </h1>
          {event && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {new Intl.DateTimeFormat('en-PH', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                  timeZone: event.event_timezone,
                }).format(new Date(event.starts_at))}
              </p>
              <p>
                {[event.venue_name, event.city].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold">Your RSVP</h2>

      {invitation.status === 'declined' && (
        <section
          role="status"
          className="rounded-2xl border border-border bg-muted/30 p-4"
        >
          <h2 className="font-semibold">You declined this invitation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your RSVP is recorded as declined. You can change your response below
            if your plans change.
          </p>
          <a
            href="#rsvp-section"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Change RSVP
          </a>
        </section>
      )}

      {invitation.status === 'waitlisted' && (
        <section
          role="status"
          className="rounded-2xl border border-warning-border bg-warning-bg p-4"
        >
          <h2 className="font-semibold">You are on the waitlist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You are currently waitlisted. The organizer may promote you when
            additional capacity becomes available.
          </p>
        </section>
      )}

      {invitation.status !== 'waitlisted' && (
        <div id="rsvp-section">
          <RsvpSection invitation={invitation} />
        </div>
      )}
      {invitation.status !== 'waitlisted' && (
        <>
          <RosterEditor invitation={invitation} />
          <WalletPassView invitation={invitation} />
        </>
      )}
    </main>
  )
}
