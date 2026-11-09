import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import type { RegisterPublicRequest } from '@/lib/api'
import { registerPublicResolver } from '@/lib/forms'
import { useRegisterPublicGuest } from '@/features/landing/hooks/use-register-public-guest'

interface PublicRegistrationFormProps {
  eventId: string
  eventTitle: string
}

export function PublicRegistrationForm({
  eventId,
  eventTitle,
}: PublicRegistrationFormProps) {
  const registration = useRegisterPublicGuest()
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string>()
  const {
    clearErrors,
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm({
    resolver: registerPublicResolver,
    defaultValues: {
      event_id: eventId,
      full_name: '',
      email: '',
    },
  })
  const fullNameField = register('full_name')
  const emailField = register('email')

  async function onSubmit(values: RegisterPublicRequest) {
    setFormError(undefined)
    try {
      await registration.mutateAsync(values)
      setSubmitted(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', {
          type: 'server',
          message: 'This email is already registered for this event.',
        })
      } else {
        setFormError(
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Registration could not be completed. Please try again.',
        )
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
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label
          htmlFor="public-registration-name"
          className="mb-1.5 block text-xs font-semibold text-foreground"
        >
          Full name
        </label>
        <Input
          id="public-registration-name"
          autoComplete="name"
          aria-invalid={Boolean(errors.full_name)}
          aria-describedby={
            errors.full_name ? 'public-registration-name-error' : undefined
          }
          {...fullNameField}
          onChange={(event) => {
            fullNameField.onChange(event)
            clearErrors('full_name')
          }}
        />
        {errors.full_name?.message && (
          <p
            id="public-registration-name-error"
            className="mt-1 text-xs text-error"
          >
            {errors.full_name.message}
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
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={
            errors.email ? 'public-registration-email-error' : undefined
          }
          {...emailField}
          onChange={(event) => {
            emailField.onChange(event)
            clearErrors('email')
          }}
        />
        {errors.email?.message && (
          <p
            id="public-registration-email-error"
            className="mt-1 text-xs text-error"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {formError && (
        <p
          className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-xs text-error"
          role="alert"
        >
          {formError}
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
