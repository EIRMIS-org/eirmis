import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { useRegisterPublicGuest } from '@/features/landing/hooks/use-register-public-guest'

interface PublicRegistrationFormProps {
  eventId: string
  eventTitle: string
}

interface FormErrors {
  fullName?: string
  email?: string
  form?: string
}

export function PublicRegistrationForm({
  eventId,
  eventTitle,
}: PublicRegistrationFormProps) {
  const registration = useRegisterPublicGuest()
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [partySize, setPartySize] = useState('1')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const fullName = String(formData.get('full_name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const nextErrors: FormErrors = {}

    if (!fullName) nextErrors.fullName = 'Enter your name.'
    if (!email) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }
    const partyCount = Number(partySize)
    if (!Number.isInteger(partyCount) || partyCount < 1 || partyCount > 10) {
      nextErrors.form = 'Party size must be between 1 and 10.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    try {
      await registration.mutateAsync({
        event_id: eventId,
        full_name: fullName,
        email,
      })
      setSubmitted(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: 'This email is already registered for this event.' })
      } else {
        setErrors({
          form:
            error instanceof ApiError || error instanceof Error
              ? error.message
              : 'Registration could not be completed. Please try again.',
        })
      }
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-success-border bg-success-bg p-5"
        role="status"
      >
        <p className="font-heading text-sm font-bold text-success">
          Registration confirmed
        </p>
        <p className="mt-1 text-xs leading-relaxed text-foreground">
          Your mock registration for <strong>{eventTitle}</strong> was
          successful.
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label
          htmlFor="public-registration-name"
          className="mb-1.5 block text-xs font-semibold text-foreground"
        >
          Full name
        </label>
        <Input
          id="public-registration-name"
          name="full_name"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={
            errors.fullName ? 'public-registration-name-error' : undefined
          }
          onChange={() =>
            setErrors((current) => ({ ...current, fullName: undefined }))
          }
        />
        {errors.fullName && (
          <p
            id="public-registration-name-error"
            className="mt-1 text-xs text-error"
          >
            {errors.fullName}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="public-registration-email"
          className="mb-1.5 block text-xs font-semibold text-foreground"
        >
          Email address
        </label>
        <Input
          id="public-registration-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={
            errors.email ? 'public-registration-email-error' : undefined
          }
          onChange={() =>
            setErrors((current) => ({ ...current, email: undefined }))
          }
        />
        {errors.email && (
          <p
            id="public-registration-email-error"
            className="mt-1 text-xs text-error"
          >
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="public-registration-party-size"
          className="mb-1.5 block text-xs font-semibold text-foreground"
        >
          Party size
        </label>
        <Input
          id="public-registration-party-size"
          type="number"
          min={1}
          max={10}
          value={partySize}
          onChange={(event) => {
            setPartySize(event.target.value)
            setErrors((current) => ({ ...current, form: undefined }))
          }}
        />
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          This preview registers one guest; party size is collected for planning
          only.
        </p>
      </div>

      {errors.form && (
        <p
          className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-xs text-error"
          role="alert"
        >
          {errors.form}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={registration.isPending}
      >
        {registration.isPending ? 'Submitting…' : 'Register for this event'}
      </Button>
    </form>
  )
}
