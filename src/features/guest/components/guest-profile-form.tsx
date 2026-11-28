import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError, type Guest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormRow, applyContractError, guestProfileUpdateResolver } from '@/lib/forms'
import { useUpdateGuestProfile } from '@/features/guest/hooks/use-update-guest-profile'

export function GuestProfileForm({ guest }: { guest: Guest }) {
  const mutation = useUpdateGuestProfile()
  const [saved, setSaved] = useState(false)
  const form = useForm<{ full_name: string }>({
    resolver: guestProfileUpdateResolver,
    defaultValues: { full_name: guest.full_name },
  })

  useEffect(() => {
    form.reset({ full_name: guest.full_name })
  }, [form, guest.full_name])

  async function submit(values: { full_name: string }) {
    setSaved(false)
    try {
      await mutation.mutateAsync({ id: guest.id, body: values })
      setSaved(true)
    } catch (error) {
      if (error instanceof ApiError) {
        applyContractError(form.setError, error)
      }
    }
  }

  const rootError =
    form.formState.errors.root?.server?.message ??
    form.formState.errors.root?.validation?.message

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile details</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormRow
            id="guest-profile-full-name"
            label="Full name"
            required
            error={form.formState.errors.full_name}
            {...form.register('full_name')}
          />
          <FormRow
            id="guest-profile-email"
            label="Email"
            value={guest.email}
            readOnly
            description="Email is managed as your account identity."
          />
          {rootError && (
            <p role="alert" className="text-xs text-destructive">
              {rootError}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-emerald-700">
              Profile updated successfully.
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
