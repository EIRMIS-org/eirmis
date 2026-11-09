import { usePublicGallery } from '@/features/landing/hooks/use-public-gallery'
import type { Event } from '@/lib/api'
import heroEventImage from '../../../../mockup-plan/assets/hero-carousel-1.jpg'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicRegistrationForm } from './public-registration-form'

interface PublicEventDrawerProps {
  event: Event
  open: boolean
  onOpenChange: (open: boolean) => void
}

function galleryImageUrl(storagePath: string): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!baseUrl) return heroEventImage

  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodedPath}`
}

export function PublicEventDrawer({
  event,
  open,
  onOpenChange,
}: PublicEventDrawerProps) {
  const gallery = usePublicGallery(event.id)
  const galleryImages = [...(gallery.data ?? [])].sort(
    (first, second) => first.sort_order - second.sort_order,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="pr-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Open registration
          </p>
          <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight">
            {event.title}
          </DialogTitle>
          <DialogDescription>
            {event.description || 'Explore the event and register your interest.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <section aria-label="Event gallery" className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Event gallery
            </h3>
            {gallery.isPending ? (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="col-span-2 aspect-[16/9] rounded-xl" />
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <Skeleton className="aspect-[4/3] rounded-xl" />
              </div>
            ) : gallery.isError ? (
              <div
                className="rounded-xl border border-error-border bg-error-bg p-4"
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
              <div className="grid grid-cols-2 gap-3">
                {galleryImages.map((image, index) => (
                  <img
                    key={image.id}
                    src={galleryImageUrl(image.storage_path)}
                    alt={image.caption || `${event.title} gallery image ${index + 1}`}
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
                className="aspect-[16/9] w-full rounded-xl object-cover"
              />
            ) : (
              <img
                src={heroEventImage}
                alt={`${event.title} preview`}
                className="aspect-[16/9] w-full rounded-xl object-cover"
              />
            )}
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {new Date(event.starts_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {[event.venue_name, event.city].filter(Boolean).join(', ') ||
                    'Details coming soon'}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="public-registration-heading"
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
          >
            <h3
              id="public-registration-heading"
              className="mb-4 font-heading text-base font-bold text-foreground"
            >
              Register your interest
            </h3>
            <PublicRegistrationForm
              eventId={event.id}
              eventTitle={event.title}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
