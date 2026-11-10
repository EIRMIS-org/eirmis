import { QrCodeIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Event, Invitation } from '@/lib/api'
import { WalletPass } from '@/components/eirmis/wallet-pass'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { useListEvents } from '@/features/organizer/hooks/use-list-events'

type InvitationMaybeWithEvent = Invitation & {
  events?: Event
}

function formatEventDate(event?: Event): string {
  if (!event?.starts_at) return 'Event schedule confirmed'
  const parsed = new Date(event.starts_at)
  if (Number.isNaN(parsed.getTime())) return event.starts_at
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatEventLocation(event?: Event): string {
  if (!event) return 'Venue details on invitation'
  const parts = [event.venue_name, event.address, event.city].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Venue details on invitation'
}

export function WalletPassView({
  invitation,
}: {
  invitation: InvitationMaybeWithEvent
}) {
  const attendeesQuery = useListAttendees({ invitation_id: invitation.id })
  const eventsQuery = useListEvents()

  const event =
    invitation.events ??
    eventsQuery.data?.find((item) => item.id === invitation.event_id)

  const attendees = (attendeesQuery.data ?? []).filter(
    (attendee) => attendee.invitation_id === invitation.id,
  )

  const issuedPasses = attendees.filter(
    (attendee) => attendee.status === 'approved' && Boolean(attendee.qr_token),
  )

  if (attendeesQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entry Pass</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (invitation.status !== 'accepted' || issuedPasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCodeIcon className="size-4 text-primary" aria-hidden="true" />
            <span>Entry Pass</span>
          </CardTitle>
          <CardDescription>
            {invitation.status !== 'accepted'
              ? 'Accept your invitation RSVP to unlock your digital entry pass.'
              : 'Your digital QR pass will appear here once approved and issued by the organizer.'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const eventName = event?.title ?? 'Annual Gala 2026'
  const eventDate = formatEventDate(event)
  const eventLocation = formatEventLocation(event)

  return (
    <section aria-label="Entry passes" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Digital Entry Pass</h2>
          <p className="text-xs text-muted-foreground">
            Present your QR pass at the event check-in terminal.
          </p>
        </div>
        <Badge variant="outline">
          {issuedPasses.length}{' '}
          {issuedPasses.length === 1 ? 'Pass Issued' : 'Passes Issued'}
        </Badge>
      </div>

      <div className="space-y-4">
        {issuedPasses.map((attendee) => (
          <div key={attendee.id} className="space-y-2">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {attendee.full_name}
              </span>
              {attendee.checked_in ? (
                <Badge variant="success" size="sm">
                  Pass Used • Checked In
                </Badge>
              ) : (
                <Badge variant="info" size="sm">
                  Ready for Check-In
                </Badge>
              )}
            </div>
            <WalletPass
              eventName={eventName}
              eventDate={eventDate}
              eventLocation={eventLocation}
              attendeeName={attendee.full_name}
              ticketTier={
                attendee.checked_in
                  ? 'Pass Used'
                  : attendee.is_primary
                    ? 'Primary Guest'
                    : 'Party Member'
              }
              ticketCode={attendee.qr_token ?? undefined}
              onAddToWallet={() =>
                toast.success(`Added ${attendee.full_name}'s pass to Wallet`)
              }
              onDownload={() =>
                toast.success(`Saved PDF pass for ${attendee.full_name}`)
              }
            />
          </div>
        ))}
      </div>
    </section>
  )
}
