import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { GuestProfileForm } from '@/features/guest/components/guest-profile-form'
import { useListGuests } from '@/features/organizer/hooks/use-list-guests'

export function GuestProfilePage() {
  const guests = useListGuests()

  if (guests.isLoading) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </main>
    )
  }

  if (guests.isError) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-3 p-4">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p role="alert" className="text-sm text-destructive">
          We could not load your profile.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            guests.refetch()
          }}
        >
          Try again
        </Button>
      </main>
    )
  }

  const guest = guests.data?.[0]
  if (!guest) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-3 p-4">
        <h1 className="text-2xl font-semibold">Profile not found</h1>
        <Link to="/guest" className="text-sm font-medium text-primary hover:underline">
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
        <p className="text-sm font-medium text-muted-foreground">Guest account</p>
        <h1 className="text-2xl font-semibold">Profile</h1>
      </header>
      <GuestProfileForm guest={guest} />
    </main>
  )
}
