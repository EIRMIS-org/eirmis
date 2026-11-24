import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import type { Event } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDiscoverPublicEvents } from '@/features/landing/hooks/use-discover-public-events'
import { usePublicGallery } from '@/features/landing/hooks/use-public-gallery'
import { PublicRegistrationForm } from '@/features/landing/components/public-registration-form'
import heroEventImage from '@/assets/hero-carousel-1.webp'

function galleryImageUrl(storagePath: string): string {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!baseUrl) return heroEventImage

    const encodedPath = storagePath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')
    return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodedPath}`
}

function CalendarTile({ startsAt }: { startsAt: string }) {
    const date = new Date(startsAt)

    return (
        <div className="flex size-14 flex-col items-center justify-center rounded-xl bg-white text-center shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                {date.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-xl font-extrabold leading-none text-slate-900">
                {date.getDate()}
            </span>
        </div>
    )
}

/**
 * Public event detail + registration page (`/register/:slug`). The public
 * entry point for open-registration events per the contract's
 * `/register/:slug` flow: event facts and gallery on the left, the
 * registration form in a sticky card on the right.
 */
export function PublicEventPage() {
    const { slug } = useParams<{ slug: string }>()
    const eventsQuery = useDiscoverPublicEvents()
    const event = eventsQuery.data?.find((candidate) => candidate.slug === slug)

    if (eventsQuery.isPending) {
        return (
            <main
                id="main-content"
                tabIndex={-1}
                className="flex-1 focus:outline-none"
                aria-busy="true"
            >
                <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
                    <span className="sr-only">Loading event…</span>
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                        <div>
                            <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
                            <Skeleton className="mt-6 h-8 w-2/3" />
                            <Skeleton className="mt-3 h-4 w-full" />
                            <Skeleton className="mt-2 h-4 w-5/6" />
                        </div>
                        <Skeleton className="h-96 rounded-2xl" />
                    </div>
                </div>
            </main>
        )
    }

    if (eventsQuery.isError) {
        return (
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
                <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
                    <div
                        className="rounded-2xl border border-error-border bg-error-bg p-6 text-center"
                        role="alert"
                    >
                        <p className="font-heading text-base font-bold text-error">
                            We couldn&rsquo;t load this event.
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
                </div>
            </main>
        )
    }

    if (!event) {
        return (
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
                <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
                    <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-6 py-16 text-center">
                        <p className="font-heading text-base font-bold text-foreground">
                            This event isn&rsquo;t open for registration
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            It may have been closed or the link is incorrect.
                        </p>
                        <Link
                            to="/"
                            className="mt-4 inline-flex h-8 items-center rounded-2xl border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Back to all events
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    return <PublicEventContent event={event} />
}

function PublicEventContent({ event }: { event: Event }) {
    const gallery = usePublicGallery(event.id)
    const galleryImages = [...(gallery.data ?? [])].sort(
        (first, second) => first.sort_order - second.sort_order,
    )

    if (!event) {
        return null
    }

    return (
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    All events
                </Link>

                <div className="mt-6 grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                    <article>
                        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted">
                            <img
                                src={event.cover_image_url || heroEventImage}
                                alt=""
                                className="aspect-[16/9] w-full object-cover"
                            />
                            <div className="absolute left-4 top-4">
                                <CalendarTile startsAt={event.starts_at} />
                            </div>
                        </div>

                        <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            {event.title}
                        </h1>

                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            {event.description || 'Join us for this upcoming event.'}
                        </p>

                        <dl className="mt-6 grid gap-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Date & time
                                </dt>
                                <dd className="mt-1 font-semibold text-foreground">
                                    {new Date(event.starts_at).toLocaleString(undefined, {
                                        dateStyle: 'full',
                                        timeStyle: 'short',
                                    })}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Location
                                </dt>
                                <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-foreground">
                                    <MapPin className="size-4 text-primary" aria-hidden="true" />
                                    {[event.venue_name, event.city].filter(Boolean).join(', ') ||
                                        'Details coming soon'}
                                </dd>
                            </div>
                        </dl>

                        <section aria-labelledby="event-gallery-heading" className="mt-8">
                            <h2
                                id="event-gallery-heading"
                                className="font-heading text-lg font-extrabold tracking-tight text-foreground"
                            >
                                Event gallery
                            </h2>
                            {gallery.isPending ? (
                                <div className="mt-4 grid grid-cols-2 gap-3" aria-busy="true">
                                    <span className="sr-only">Loading gallery…</span>
                                    <Skeleton className="col-span-2 aspect-[16/9] rounded-xl" />
                                    <Skeleton className="aspect-[4/3] rounded-xl" />
                                    <Skeleton className="aspect-[4/3] rounded-xl" />
                                </div>
                            ) : gallery.isError ? (
                                <div
                                    className="mt-4 rounded-xl border border-error-border bg-error-bg p-4"
                                    role="alert"
                                >
                                    <p className="text-xs text-error">
                                        Could not load the event gallery.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
                                        onClick={() => void gallery.refetch()}
                                    >
                                        Retry
                                    </Button>
                                </div>
                            ) : galleryImages.length > 0 ? (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {galleryImages.map((image, index) => (
                                        <img
                                            key={image.id}
                                            src={galleryImageUrl(image.storage_path)}
                                            alt={
                                                image.caption ||
                                                `${event.title} gallery image ${index + 1}`
                                            }
                                            className={
                                                index === 0
                                                    ? 'col-span-2 aspect-[16/9] w-full rounded-xl object-cover'
                                                    : 'aspect-[4/3] w-full rounded-xl object-cover'
                                            }
                                            onError={(error) => {
                                                error.currentTarget.src = heroEventImage
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : event.cover_image_url ? (
                                <img
                                    src={event.cover_image_url}
                                    alt={`${event.title} cover`}
                                    className="mt-4 aspect-[16/9] w-full rounded-xl object-cover"
                                />
                            ) : null}
                        </section>
                    </article>

                    <aside className="lg:sticky lg:top-20">
                        <section
                            aria-labelledby="public-registration-heading"
                            className="rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6"
                        >
                            <h2
                                id="public-registration-heading"
                                className="font-heading text-lg font-extrabold tracking-tight text-foreground"
                            >
                                Register your interest
                            </h2>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Fill in your details and we&rsquo;ll email your invitation.
                            </p>
                            <div className="mt-5">
                                <PublicRegistrationForm
                                    eventId={event.id}
                                    eventTitle={event.title}
                                />
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    )
}
