import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDiscoverPublicEvents } from '@/features/landing/hooks/use-discover-public-events'
import type { Event } from '@/lib/api'
import heroEventImage from '@/assets/hero-carousel-1.webp'

function EventCard({ event }: { event: Event }) {
  const startDate = new Date(event.starts_at)

  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-shadow hover:shadow-md focus-within:shadow-md">
      <Link
        to={`/register/${event.slug}`}
        className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={event.cover_image_url || heroEventImage}
            alt=""
            className="size-full object-cover"
          />
          <div className="absolute left-3 top-3 flex size-12 flex-col items-center justify-center rounded-lg bg-white text-center shadow-md">
            <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700">
              {startDate.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-base font-extrabold leading-none text-slate-900">
              {startDate.getDate()}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-heading text-base font-bold text-foreground">
            {event.title}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-muted-foreground">
            {event.description || 'Join us for this upcoming event.'}
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden="true" />
            {[event.venue_name, event.city].filter(Boolean).join(', ') ||
              'Location to be announced'}
          </p>
        </div>
      </Link>
    </article>
  )
}

export function PublicEventDiscovery() {
  const eventsQuery = useDiscoverPublicEvents()

  return (
    <section
      id="public-events"
      aria-labelledby="public-events-heading"
      className="scroll-mt-20 border-t border-border/70 bg-muted/30 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="public-events-heading"
              className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Events open to everyone
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Find a gathering that’s right for you and register in a few steps.
            </p>
          </div>
          {!eventsQuery.isPending &&
            !eventsQuery.isError &&
            (eventsQuery.data?.length ?? 0) > 0 && (
              <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                {eventsQuery.data?.length} open{' '}
                {eventsQuery.data?.length === 1 ? 'event' : 'events'}
              </span>
            )}
        </div>

        {eventsQuery.isPending ? (
          <div
            aria-busy="true"
            className="grid gap-4 sm:grid-cols-2"
          >
            <span className="sr-only">Loading public events…</span>
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <Skeleton className="aspect-[16/9] rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : eventsQuery.isError ? (
          <div
            className="rounded-2xl border border-error-border bg-error-bg p-6 text-center"
            role="alert"
          >
            <p className="font-semibold text-error">
              We couldn’t load events right now.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {eventsQuery.error instanceof Error
                ? eventsQuery.error.message
                : 'Please try again.'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void eventsQuery.refetch()}
              disabled={eventsQuery.isFetching}
            >
              {eventsQuery.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        ) : (eventsQuery.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-6 py-14 text-center">
            <MapPin
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 font-heading text-base font-bold text-foreground">
              No open events right now
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check back soon to discover public events.
            </p>
          </div>
        ) : (
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
            {eventsQuery.data?.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
