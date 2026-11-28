import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldPath,
} from 'react-hook-form'
import { ArrowLeft, ArrowRight, Check, ChevronLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { EventCreate } from '@/lib/api'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateEvent } from '@/features/organizer/hooks/use-create-event'
import { useUnsavedChangesGuard } from '@/features/organizer/hooks/use-unsaved-changes-guard'
import { eventCreateResolver } from '@/lib/forms'
import { eventCreateSchema } from '@/lib/forms/schemas/event'
import { toZonedIsoString, toZonedLocalString } from '@/lib/datetime'
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

function findFirstInvalidField(
  fieldErrors: FieldErrors<EventFormInput>,
): { step: number; field: FieldPath<EventFormInput> } | null {
  for (let stepNumber = 1; stepNumber < STEPS.length; stepNumber += 1) {
    const fields = STEP_FIELDS[stepNumber] ?? []
    for (const field of fields) {
      if (fieldErrors[field]) {
        return { step: stepNumber, field }
      }
    }
  }
  return null
}

function extractFallbackError(fieldErrors: FieldErrors<EventFormInput>): string {
  for (const error of Object.values(fieldErrors)) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message
    ) {
      return error.message
    }
  }
  return 'Please review the event details and fix any validation errors.'
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-error" role="alert">{message}</p>
}

type LocalDateTimes = {
  starts_at: string
  ends_at: string
  rsvp_deadline: string
}

function formatReviewDateTime(
  localValue: string,
  isoValue: string,
  timeZone: string,
) {
  return localValue || toZonedLocalString(isoValue, timeZone) || 'Not set'
}

function CreateEventReviewStep({
  control,
  formError,
  localDateTimes,
  timeZone,
}: {
  control: Control<EventFormInput, unknown, EventCreate>
  formError?: string
  localDateTimes: LocalDateTimes
  timeZone: string
}) {
  const [
    title,
    slug,
    capacity,
    visibilityMode,
    startsAt,
    endsAt,
    rsvpDeadline,
    venueName,
    city,
    description,
    eventTimezone,
  ] = useWatch({
    control,
    name: [
      'title',
      'slug',
      'capacity',
      'visibility_mode',
      'starts_at',
      'ends_at',
      'rsvp_deadline',
      'venue_name',
      'city',
      'description',
      'event_timezone',
    ],
  })

  return (
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
          <dd className="mt-1 font-semibold text-foreground">{title || 'Not set'}</dd>
          <dd className="text-sm text-muted-foreground">/register/{slug || 'not-set'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Capacity</dt>
          <dd className="mt-1 font-semibold text-foreground">
            {capacity ? Number(capacity).toLocaleString() : 'Not set'} seats
          </dd>
          <dd className="text-sm text-muted-foreground">
            {visibilityMode === 'invite_only' ? 'Invite only' : 'Open registration'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Starts</dt>
          <dd className="mt-1 text-sm text-foreground">
            {formatReviewDateTime(
              localDateTimes.starts_at,
              startsAt || '',
              eventTimezone || timeZone,
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Ends</dt>
          <dd className="mt-1 text-sm text-foreground">
            {formatReviewDateTime(
              localDateTimes.ends_at,
              endsAt || '',
              eventTimezone || timeZone,
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">RSVP deadline</dt>
          <dd className="mt-1 text-sm text-foreground">
            {formatReviewDateTime(
              localDateTimes.rsvp_deadline,
              rsvpDeadline || '',
              eventTimezone || timeZone,
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Location</dt>
          <dd className="mt-1 text-sm text-foreground">
            {[venueName, city].filter(Boolean).join(', ') || 'Not set'}
          </dd>
        </div>
        {description && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {description}
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
  )
}

export function CreateEventPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [formError, setFormError] = useState<string>()
  const [localDateTimes, setLocalDateTimes] = useState<LocalDateTimes>({
    starts_at: '',
    ends_at: '',
    rsvp_deadline: '',
  })
  const createEvent = useCreateEvent()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const step = getStep(searchParams)
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    setFocus,
    trigger,
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

  const { blocker, allowNextNavigation } = useUnsavedChangesGuard(isDirty)
  const eventTimezone = useWatch({ control, name: 'event_timezone' }) || 'UTC'

  const isNavigatingRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const pendingFocusFieldRef = useRef<FieldPath<EventFormInput> | null>(null)

  useEffect(() => {
    const field = pendingFocusFieldRef.current
    if (!field) return
    const fieldsInStep = STEP_FIELDS[step] ?? []
    if (!fieldsInStep.includes(field)) return
    pendingFocusFieldRef.current = null
    setFocus(field)
  }, [step, setFocus])

  function applyStep(nextStep: number) {
    setFormError(undefined)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('step', String(nextStep))
      return next
    })
  }

  async function navigateToStep(targetStep: number) {
    if (
      isNavigatingRef.current ||
      targetStep < 1 ||
      targetStep > STEPS.length ||
      targetStep === step
    ) {
      return
    }

    if (targetStep < step) {
      applyStep(targetStep)
      return
    }

    isNavigatingRef.current = true
    try {
      for (let prerequisiteStep = 1; prerequisiteStep < targetStep; prerequisiteStep += 1) {
        const fields = STEP_FIELDS[prerequisiteStep]
        if (!fields) continue
        const isValid = await trigger(fields)
        if (!isValid) {
          if (prerequisiteStep !== step) {
            applyStep(prerequisiteStep)
          }
          return
        }
      }
      applyStep(targetStep)
    } finally {
      isNavigatingRef.current = false
    }
  }

  function handleBackToEvents() {
    navigate('/organizer')
  }

  async function onSubmit(payload: EventCreate) {
    if (
      step !== STEPS.length ||
      isSubmittingRef.current ||
      createEvent.isPending
    ) {
      return
    }
    isSubmittingRef.current = true
    setFormError(undefined)
    try {
      const event = await createEvent.mutateAsync({
        ...payload,
        starts_at: toZonedIsoString(
          localDateTimes.starts_at,
          payload.event_timezone,
        ),
        ends_at: toZonedIsoString(
          localDateTimes.ends_at,
          payload.event_timezone,
        ),
        rsvp_deadline: toZonedIsoString(
          localDateTimes.rsvp_deadline,
          payload.event_timezone,
        ),
      })
      allowNextNavigation()
      navigate(`/organizer/events/${encodeURIComponent(event.id)}`)
    } catch (error) {
      setFormError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'The event could not be created. Please try again.',
      )
    } finally {
      isSubmittingRef.current = false
    }
  }

  function onInvalid(fieldErrors: FieldErrors<EventFormInput>) {
    const firstInvalid = findFirstInvalidField(fieldErrors)
    if (firstInvalid) {
      pendingFocusFieldRef.current = firstInvalid.field
      if (firstInvalid.step !== step) {
        applyStep(firstInvalid.step)
      } else {
        pendingFocusFieldRef.current = null
        setFocus(firstInvalid.field)
      }
      return
    }
    setFormError(extractFallbackError(fieldErrors))
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (step !== STEPS.length) {
      event.preventDefault()
      void navigateToStep(step + 1)
      return
    }

    if (isSubmittingRef.current || createEvent.isPending) {
      event.preventDefault()
      return
    }

    void handleSubmit(onSubmit, onInvalid)(event)
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        className="mb-5 -ml-3"
        onClick={handleBackToEvents}
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
              >
                <button
                  type="button"
                  aria-label={`Go to ${label} step`}
                  className={`flex items-center gap-2 text-left text-sm ${
                    isCurrent
                      ? 'font-semibold text-primary'
                      : isComplete
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                  }`}
                  onClick={() => void navigateToStep(stepNumber)}
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
                </button>
              </li>
            )
          })}
        </ol>

        <form
          noValidate
          onSubmit={handleFormSubmit}
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
                        ref={field.ref}
                        id="event-start"
                        type="datetime-local"
                        className="mt-1.5"
                        value={
                          localDateTimes.starts_at ||
                          toZonedLocalString(field.value, eventTimezone)
                        }
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const localValue = event.target.value
                          setLocalDateTimes((current) => ({
                            ...current,
                            starts_at: localValue,
                          }))
                          field.onChange(
                            toZonedIsoString(localValue, eventTimezone),
                          )
                        }}
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
                        ref={field.ref}
                        id="event-end"
                        type="datetime-local"
                        className="mt-1.5"
                        value={
                          localDateTimes.ends_at ||
                          toZonedLocalString(field.value, eventTimezone)
                        }
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const localValue = event.target.value
                          setLocalDateTimes((current) => ({
                            ...current,
                            ends_at: localValue,
                          }))
                          field.onChange(
                            toZonedIsoString(localValue, eventTimezone),
                          )
                        }}
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
                        ref={field.ref}
                        id="event-deadline"
                        type="datetime-local"
                        className="mt-1.5"
                        value={
                          localDateTimes.rsvp_deadline ||
                          toZonedLocalString(field.value, eventTimezone)
                        }
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const localValue = event.target.value
                          setLocalDateTimes((current) => ({
                            ...current,
                            rsvp_deadline: localValue,
                          }))
                          field.onChange(
                            toZonedIsoString(localValue, eventTimezone),
                          )
                        }}
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
                    {...register('event_timezone')}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Times use the selected time zone.
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
            <CreateEventReviewStep
              control={control}
              formError={formError}
              localDateTimes={localDateTimes}
              timeZone={eventTimezone}
            />
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <div className="flex items-center gap-3">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigateToStep(step - 1)}
                >
                  <ArrowLeft aria-hidden="true" />
                  Previous
                </Button>
              ) : (
                <span />
              )}
              {isDirty && (
                <p role="status" className="text-xs font-medium text-warning">
                  You have unsaved changes.
                </p>
              )}
            </div>
            {step < 4 ? (
              <Button key="continue-step" type="submit">
                Continue
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button
                key="create-event"
                type="submit"
                disabled={createEvent.isPending}
              >
                {createEvent.isPending ? 'Creating event…' : 'Create event'}
                {!createEvent.isPending && <Check aria-hidden="true" />}
              </Button>
            )}
          </footer>
        </form>
      </section>

      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave with unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes in this event wizard. Leaving now will discard your draft progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.reset()
              }}
            >
              Stay on step
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.proceed()
              }}
            >
              Leave without saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
