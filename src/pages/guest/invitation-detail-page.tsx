import { Link, useParams } from 'react-router-dom'
import { useMyInvitations } from '@/features/guest/hooks/use-my-invitations'
import { RsvpSection } from '@/features/guest/components/rsvp-section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function InvitationDetailPage() {
  const { invitationId } = useParams()
  const invitations = useMyInvitations()
  const invitation = invitations.data?.find((item) => item.id === invitationId)

  if (invitations.isLoading) {
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
      <Link to="/guest" className="text-sm font-medium text-primary hover:underline">
        ← Back to invitations
      </Link>
      <header>
        <p className="text-sm font-medium text-muted-foreground">Invitation details</p>
        <h1 className="text-2xl font-semibold">Your RSVP</h1>
      </header>
      <RsvpSection invitation={invitation} />
    </main>
  )
}
