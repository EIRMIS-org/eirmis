import { useState } from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Check, ChevronLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { EventCreate } from '@/lib/api'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateEvent } from '@/features/organizer/hooks/use-create-event'
import { eventCreateResolver } from '@/lib/forms'
import { eventCreateSchema } from '@/lib/forms/schemas/event'
import { z } from 'zod'

const STEPS = ['Basics', 'Schedule', 'Capacity & rules', 'Review'] as const
const STEP_FIELDS: Record<number, FieldPath<z.input<typeof eventCreateSchema>>[]> = {
  1: ['title', 'slug', 'description'],
  2: ['starts_at', 'ends_at', 'event_timezone', 'rsvp_deadline'],
  3: ['capacity', 'visibility_mode'],
}

type EventFormInput = z.input<typeof eventCreateSchema>

function getStep(searchParams: URLSearchParams) {
  const value = Number(searchParams.get('step'))
  return Number.isInteger(value) && value >= 1 && value <= STEPS.length
    ? value
    : 1
}

function toLocalDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : ''
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-error" role="alert">{message}</p>
}

export function CreateEventPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [formError, setFormError] = useState<string>()
  const createEvent = useCreateEvent()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const step = getStep(searchParams)
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    trigger,
    watch,
  } = useForm<EventFormInput, unknown, EventCreate>({
    resolver: eventCreateResolver,
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      cover_image_url: null,
      starts_at: '',
      ends_at: '',
      event_timezone: timeZone,
      venue_name: '',
      address: '',
      city: '',
      location_url: '',
      capacity: '',
      rsvp_deadline: '',
      visibility_mode: 'open_registration',
      status: 'draft',
    },
  })

  const values = watch()

  function setStep(nextStep: number) {
    setFormError(undefined)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('step', String(nextStep))
      return next
    })
  }

  async function goNext() {
    if (step < 4 && (await trigger(STEP_FIELDS[step]))) {
      setStep(step + 1)
    }
  }

  async function onSubmit(payload: EventCreate) {
    setFormError(undefined)
    try {
      const event = await createEvent.mutateAsync(payload)
      navigate(`/organizer/events/${encodeURIComponent(event.id)}`)
    } catch (error) {
      setFormError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'The event could not be created. Please try again.',
      )
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        className="mb-5 -ml-3"
        onClick={() => navigate('/organizer')}
      >
        <ChevronLeft aria-hidden="true" />
        Back to events
      </Button>

      <header className="mb-7">
        <p className="text-sm font-medium text-primary">New event</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-foreground">
          Create an event
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up the event details, schedule, and registration rules.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <ol
          aria-label="Create event steps"
          className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 sm:grid-cols-4"
        >
          {STEPS.map((label, index) => {
            const stepNumber = index + 1
            const isComplete = stepNumber < step
            const isCurrent = stepNumber === step
            return (
              <li
                key={label}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-2 text-sm ${
                  isCurrent
                    ? 'font-semibold text-primary'
                    : isComplete
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isComplete
                        ? 'border-success bg-success-bg text-success'
                        : 'border-border bg-background'
                  }`}
                >
                  {isComplete ? <Check aria-hidden="true" className="size-4" /> : stepNumber}
                </span>
                <span>{label}</span>
              </li>
            )
          })}
        </ol>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 p-5 sm:p-7"
        >
          {step === 1 && (
            <section aria-labelledby="basics-heading" className="space-y-5">
              <div>
                <h2 id="basics-heading" className="font-heading text-xl font-semibold">
                  Event basics
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Give your event a clear name and public registration address.
                </p>
              </div>
              <div>
                <Label htmlFor="event-title">Event title *</Label>
                <Input
                  id="event-title"
                  className="mt-1.5"
                  placeholder="Annual Gala 2026"
                  aria-invalid={Boolean(errors.title)}
                  {...register('title')}
                />
                <FieldError message={errors.title?.message} />
              </div>
              <div>
                <Label htmlFor="event-slug">Event slug *</Label>
                <div className="mt-1.5 flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/30">
                  <span className="pl-3 text-sm text-muted-foreground">/register/</span>
                  <Input
                    id="event-slug"
                    className="border-0 shadow-none focus-visible:ring-0"
                    placeholder="annual-gala-2026"
                    aria-invalid={Boolean(errors.slug)}
                    {...register('slug')}
                  />
                </div>
                <FieldError message={errors.slug?.message} />
              </div>
              <div>
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  className="mt-1.5"
                  placeholder="What should guests know about this event?"
                  aria-invalid={Boolean(errors.description)}
                  {...register('description')}
                />
                <FieldError message={errors.description?.message} />
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="schedule-heading" className="space-y-5">
              <div>
                <h2 id="schedule-heading" className="font-heading text-xl font-semibold">
                  Schedule and location
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose when the event happens and when RSVPs close.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="event-start">Starts *</Label>
                  <Controller
                    control={control}
                    name="starts_at"
                    render={({ field }) => (
                      <Input
                        id="event-start"
                        type="datetime-local"
                        className="mt-1.5"
                        value={toLocalDateTime(field.value)}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(toIsoDateTime(event.target.value))}
                        aria-invalid={Boolean(errors.starts_at)}
                      />
                    )}
                  />
                  <FieldError message={errors.starts_at?.message} />
                </div>
                <div>
                  <Label htmlFor="event-end">Ends *</Label>
                  <Controller
                    control={control}
                    name="ends_at"
                    render={({ field }) => (
                      <Input
                        id="event-end"
                        type="datetime-local"
                        className="mt-1.5"
                        value={toLocalDateTime(field.value)}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(toIsoDateTime(event.target.value))}
                        aria-invalid={Boolean(errors.ends_at)}
                      />
                    )}
                  />
                  <FieldError message={errors.ends_at?.message} />
                </div>
                <div>
                  <Label htmlFor="event-deadline">RSVP deadline *</Label>
                  <Controller
                    control={control}
                    name="rsvp_deadline"
                    render={({ field }) => (
                      <Input
                        id="event-deadline"
                        type="datetime-local"
                        className="mt-1.5"
                        value={toLocalDateTime(field.value)}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(toIsoDateTime(event.target.value))}
                        aria-invalid={Boolean(errors.rsvp_deadline)}
                      />
                    )}
                  />
                  <FieldError message={errors.rsvp_deadline?.message} />
                </div>
                <div>
                  <Label htmlFor="event-timezone">Time zone</Label>
                  <Input
                    id="event-timezone"
                    className="mt-1.5"
                    readOnly
                    aria-readonly="true"
                    {...register('event_timezone')}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Times use your device time zone.
                  </p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="event-venue">Venue</Label>
                  <Input id="event-venue" className="mt-1.5" {...register('venue_name')} />
                </div>
                <div>
                  <Label htmlFor="event-city">City</Label>
                  <Input id="event-city" className="mt-1.5" {...register('city')} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="event-address">Street address</Label>
                  <Input id="event-address" className="mt-1.5" {...register('address')} />
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="capacity-heading" className="space-y-5">
              <div>
                <h2 id="capacity-heading" className="font-heading text-xl font-semibold">
                  Capacity and registration
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set the total attendee limit and who can register.
                </p>
              </div>
              <div className="max-w-sm">
                <Label htmlFor="event-capacity">Total capacity *</Label>
                <Input
                  id="event-capacity"
                  type="number"
                  min="1"
                  step="1"
                  className="mt-1.5"
                  placeholder="500"
                  aria-invalid={Boolean(errors.capacity)}
                  {...register('capacity', {
                    setValueAs: (value: string) => value === '' ? '' : Number(value),
                  })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Maximum number of approved attendees for this event.
                </p>
                <FieldError message={errors.capacity?.message} />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Registration access *</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: 'open_registration',
                      title: 'Open registration',
                      description: 'Anyone with the event link may register.',
                    },
                    {
                      value: 'invite_only',
                      title: 'Invite only',
                      description: 'Only people you invite can attend.',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer gap-3 rounded-xl border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary-subtle"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="mt-1 accent-primary"
                        {...register('visibility_mode')}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-foreground">
                          {option.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.visibility_mode?.message} />
              </fieldset>
            </section>
          )}

          {step === 4 && (
            <section aria-labelledby="review-heading" className="space-y-5">
              <div>
                <h2 id="review-heading" className="font-heading text-xl font-semibold">
                  Review your event
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check the details before creating this draft event.
                </p>
              </div>
              <dl className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Event</dt>
                  <dd className="mt-1 font-semibold text-foreground">{values.title || 'Not set'}</dd>
                  <dd className="text-sm text-muted-foreground">/register/{values.slug || 'not-set'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Capacity</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {values.capacity ? Number(values.capacity).toLocaleString() : 'Not set'} seats
                  </dd>
                  <dd className="text-sm text-muted-foreground">
                    {values.visibility_mode === 'invite_only' ? 'Invite only' : 'Open registration'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Starts</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {values.starts_at ? new Date(values.starts_at).toLocaleString() : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Ends</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {values.ends_at ? new Date(values.ends_at).toLocaleString() : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">RSVP deadline</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {values.rsvp_deadline ? new Date(values.rsvp_deadline).toLocaleString() : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Location</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {[values.venue_name, values.city].filter(Boolean).join(', ') || 'Not set'}
                  </dd>
                </div>
                {values.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-muted-foreground">Description</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {values.description}
                    </dd>
                  </div>
                )}
              </dl>
              {formError && (
                <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error" role="alert">
                  {formError}
                </p>
              )}
            </section>
          )}

          <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft aria-hidden="true" />
                Previous
              </Button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <Button type="button" onClick={() => void goNext()}>
                Continue
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? 'Creating event…' : 'Create event'}
                {!createEvent.isPending && <Check aria-hidden="true" />}
              </Button>
            )}
          </footer>
        </form>
      </section>
    </main>
  )
}
