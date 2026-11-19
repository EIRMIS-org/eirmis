import { Link } from 'react-router-dom'
import { useMyInvitations } from '@/features/guest/hooks/use-my-invitations'
import { InvitationCard } from '@/features/guest/components/invitation-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function GuestInvitationsPage() {
  const invitations = useMyInvitations()

  if (invitations.isLoading) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </main>
    )
  }

  if (invitations.isError) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-3 p-4">
        <h1 className="text-2xl font-semibold">My invitations</h1>
        <p role="alert" className="text-sm text-destructive">
          We could not load your invitations.
        </p>
        <Button variant="outline" onClick={() => invitations.refetch()}>
          Try again
        </Button>
      </main>
    )
  }

  const invitationList = invitations.data ?? []

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-4">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Guest portal</p>
        <h1 className="text-2xl font-semibold">My invitations</h1>
      </header>
      {invitationList.length === 0 ? (
        <section className="rounded-2xl border border-dashed p-6 text-center">
          <p className="font-medium">You have no invitations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invitations from your hosts will appear here.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {invitationList.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
            />
          ))}
        </div>
      )}
      <Link to="/guest" className="sr-only">
        My invitations
      </Link>
    </main>
  )
}
