import { useState } from 'react'
import { CalendarDays, MapPin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDiscoverPublicEvents } from '@/features/landing/hooks/use-discover-public-events'
import type { Event } from '@/lib/api'
import heroEventImage from '../../../../mockup-plan/assets/hero-carousel-1.jpg'
import { PublicEventDrawer } from './public-event-drawer'

function EventCard({
  event,
  onSelect,
}: {
  event: Event
  onSelect: (event: Event) => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all hover:-translate-y-1 hover:shadow-md">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onSelect(event)}
        aria-label={`View ${event.title} details and registration`}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={event.cover_image_url || heroEventImage}
            alt=""
            className="size-full object-cover transition-transform duration-300 hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            Open registration
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-heading text-base font-bold text-foreground">
            {event.title}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-muted-foreground">
            {event.description || 'Join us for this upcoming event.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-primary" aria-hidden="true" />
              {new Date(event.starts_at).toLocaleDateString(undefined, {
                dateStyle: 'medium',
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" aria-hidden="true" />
              {[event.venue_name, event.city].filter(Boolean).join(', ') ||
                'Location to be announced'}
            </span>
          </div>
        </div>
      </button>
    </article>
  )
}

export function PublicEventDiscovery() {
  const eventsQuery = useDiscoverPublicEvents()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  return (
    <section
      id="public-events"
      aria-labelledby="public-events-heading"
      className="scroll-mt-20 border-t border-border/70 bg-muted/30 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Discover
            </p>
            <h2
              id="public-events-heading"
              className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
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
            <CalendarDays
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventsQuery.data?.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={setSelectedEvent}
              />
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <PublicEventDrawer
          event={selectedEvent}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedEvent(null)
          }}
        />
      )}
    </section>
  )
}
