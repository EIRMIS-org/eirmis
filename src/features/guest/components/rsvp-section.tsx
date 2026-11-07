import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ApiError, type Invitation, type InvitationRsvpUpdate } from '@/lib/api'
import { RsvpSelector, type RsvpChoice } from '@/components/eirmis/rsvp-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { FormRow, applyContractError, invitationRsvpUpdateResolver } from '@/lib/forms'
import { useRsvp } from '@/features/guest/hooks/use-rsvp'

const statusToChoice: Partial<Record<Invitation['status'], RsvpChoice>> = {
  accepted: 'accept',
  tentative: 'tentative',
  declined: 'decline',
}

const choiceToStatus: Record<RsvpChoice, InvitationRsvpUpdate['status']> = {
  accept: 'accepted',
  tentative: 'tentative',
  decline: 'declined',
}

export function RsvpSection({ invitation }: { invitation: Invitation }) {
  const mutation = useRsvp()
  const form = useForm<InvitationRsvpUpdate>({
    resolver: invitationRsvpUpdateResolver,
    defaultValues: {
      status: invitation.status === 'pending' ? undefined : invitation.status,
      dietary_preference: invitation.dietary_preference ?? '',
      special_requests: invitation.special_requests ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      status: invitation.status === 'pending' ? undefined : invitation.status,
      dietary_preference: invitation.dietary_preference ?? '',
      special_requests: invitation.special_requests ?? '',
    })
  }, [form, invitation])

  const selectedChoice = statusToChoice[useWatch({
    control: form.control,
    name: 'status',
  })]

  async function submit(values: InvitationRsvpUpdate) {
    try {
      await mutation.mutateAsync({ id: invitation.id, body: values })
    } catch (error) {
      if (error instanceof ApiError) {
        applyContractError(form.setError, error)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <p className="text-sm font-medium">Will you attend?</p>
            <RsvpSelector
              value={selectedChoice}
              disabled={mutation.isPending}
              onChange={(choice) => form.setValue('status', choiceToStatus[choice], {
                shouldDirty: true,
                shouldValidate: true,
              })}
            />
            {form.formState.errors.status?.message && (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>
          <FormRow
            id="dietary_preference"
            label="Dietary preference"
            description="Tell the host about any dietary needs."
            error={form.formState.errors.dietary_preference}
            renderControl={(props) => (
              <Textarea {...props} {...form.register('dietary_preference')} placeholder="e.g. Vegetarian" />
            )}
          />
          <FormRow
            id="special_requests"
            label="Special requests"
            description="Optional accessibility or accommodation requests."
            error={form.formState.errors.special_requests}
            renderControl={(props) => (
              <Textarea {...props} {...form.register('special_requests')} placeholder="Anything the host should know?" />
            )}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save RSVP'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
