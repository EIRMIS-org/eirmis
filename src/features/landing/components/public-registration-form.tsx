import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSession } from '@/app/providers/use-session'
import { ApiError } from '@/lib/api'
import type { RegisterPublicRequest } from '@/lib/api'
import { FormRow, registerPublicResolver } from '@/lib/forms'
import { useRegisterPublicGuest } from '@/features/landing/hooks/use-register-public-guest'

interface PublicRegistrationFormProps {
  eventId: string
  eventTitle: string
}

export function PublicRegistrationForm({
  eventId,
  eventTitle,
}: PublicRegistrationFormProps) {
  const idPrefix = useId()
  const navigate = useNavigate()
  const { signIn } = useSession()
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

  function handleSignInAsGuest() {
    signIn('guest')
    navigate('/guest')
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-success-border bg-success-bg p-5"
        role="status"
        aria-live="polite"
      >
        <p className="font-heading text-sm font-bold text-success">
          Registration confirmed
        </p>
        <p className="mt-1 text-xs leading-relaxed text-foreground">
          Your mock registration for <strong>{eventTitle}</strong> was
          successful. Check your email — your invitation is on its way.
        </p>
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignInAsGuest}
          >
            Sign in as guest
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormRow
        id={`${idPrefix}-full-name`}
        label="Full name"
        autoComplete="name"
        error={errors.full_name}
        required
        {...fullNameField}
        onChange={(event) => {
          fullNameField.onChange(event)
          clearErrors('full_name')
        }}
      />

      <FormRow
        id={`${idPrefix}-email`}
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email}
        required
        {...emailField}
        onChange={(event) => {
          emailField.onChange(event)
          clearErrors('email')
        }}
      />

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
        aria-busy={registration.isPending}
      >
        {registration.isPending ? 'Submitting…' : 'Register for this event'}
      </Button>
    </form>
  )
}