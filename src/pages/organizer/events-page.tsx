import { CalendarDays, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useListEvents } from '@/features/organizer/hooks/use-list-events'
import { EventsTable } from '@/features/organizer/components/events-table'
import { Skeleton } from '@/components/ui/skeleton'

export function EventsPage() {
  const navigate = useNavigate()
  const eventsQuery = useListEvents()

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4" />
            Organizer workspace
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Your events
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage events for your organization.
          </p>
        </div>
        <Button onClick={() => navigate('/organizer/events/new')}>
          <Plus aria-hidden="true" />
          Create event
        </Button>
      </header>

      {eventsQuery.isPending ? (
        <section
          aria-label="Loading events"
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="grid grid-cols-4 gap-4 border-b border-border px-5 py-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-4 w-24" />
            ))}
          </div>
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="grid grid-cols-4 gap-4 border-b border-border px-5 py-5 last:border-0"
            >
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </section>
      ) : eventsQuery.isError ? (
        <section
          className="rounded-2xl border border-error-border bg-error-bg p-6"
          role="alert"
        >
          <h2 className="font-heading text-lg font-semibold text-error">
            Events could not be loaded
          </h2>
          <p className="mt-1 text-sm text-error">
            {eventsQuery.error instanceof Error
              ? eventsQuery.error.message
              : 'Please try again.'}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void eventsQuery.refetch()}
            disabled={eventsQuery.isFetching}
          >
            {eventsQuery.isFetching ? 'Retrying…' : 'Retry'}
          </Button>
        </section>
      ) : eventsQuery.data.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <CalendarDays aria-hidden="true" className="size-6" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            No events yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create your first event to start inviting guests and managing
            attendance.
          </p>
          <Button
            className="mt-5"
            onClick={() => navigate('/organizer/events/new')}
          >
            <Plus aria-hidden="true" />
            Create your first event
          </Button>
        </section>
      ) : (
        <EventsTable events={eventsQuery.data} />
      )}
    </main>
  )
}
