import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { ApiError, type Invitation, type InvitationRsvpUpdate } from '@/lib/api'
import { qk } from '@/lib/api/query-keys'
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

export function RsvpSection({
  invitation,
  isLocked = false,
  lockMessage,
}: {
  invitation: Invitation
  isLocked?: boolean
  lockMessage?: string
}) {
  const queryClient = useQueryClient()
  const mutation = useRsvp()
  const [statusOverride, setStatusOverride] = useState<{
    invitationId: string
    previousStatus: Invitation['status']
    status: Invitation['status']
  } | null>(null)
  const status =
    statusOverride?.invitationId === invitation.id &&
    statusOverride.previousStatus === invitation.status
      ? statusOverride.status
      : invitation.status
  const form = useForm<InvitationRsvpUpdate>({
    resolver: invitationRsvpUpdateResolver,
    defaultValues: {
      status:
        invitation.status === 'pending' || invitation.status === 'waitlisted'
          ? undefined
          : invitation.status,
      dietary_preference: invitation.dietary_preference ?? '',
      special_requests: invitation.special_requests ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      status:
        invitation.status === 'pending' || invitation.status === 'waitlisted'
          ? undefined
          : invitation.status,
      dietary_preference: invitation.dietary_preference ?? '',
      special_requests: invitation.special_requests ?? '',
    })
  }, [form, invitation])

  const selectedChoice = statusToChoice[useWatch({
    control: form.control,
    name: 'status',
  })]

  async function submit(values: InvitationRsvpUpdate) {
    if (isLocked) return
    try {
      const updated = await mutation.mutateAsync({ id: invitation.id, body: values })
      setStatusOverride({
        invitationId: invitation.id,
        previousStatus: invitation.status,
        status: updated.status,
      })
      form.reset({
        status:
          updated.status === 'pending' || updated.status === 'waitlisted'
            ? undefined
            : updated.status,
        dietary_preference: updated.dietary_preference ?? values.dietary_preference,
        special_requests: updated.special_requests ?? values.special_requests,
      })
      queryClient.setQueriesData<Invitation[]>(
        { queryKey: qk.listInvitationsPrefix() },
        (current) =>
          current?.map((item) =>
            item.id === invitation.id ? { ...item, ...values, ...updated } : item,
          ),
      )
    } catch (error) {
      if (error instanceof ApiError) {
        applyContractError(form.setError, error)
      }
    }
  }

  const rootError =
    form.formState.errors.root?.server?.message ??
    form.formState.errors.root?.validation?.message
  const allowedChoices: RsvpChoice[] | undefined =
    status === 'accepted' || status === 'waitlisted' ? ['decline'] : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'waitlisted' && (
          <div
            role="status"
            className="mb-4 rounded-2xl border border-warning-border bg-warning-bg p-4 text-sm"
          >
            You are on the waitlist. The organizer may promote you when capacity
            becomes available. Choose “Decline / Leave waitlist” to leave it.
          </div>
        )}
        {isLocked && lockMessage && (
          <p role="status" className="mb-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {lockMessage}
          </p>
        )}
        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <p className="text-sm font-medium">Will you attend?</p>
            <RsvpSelector
              value={selectedChoice}
              disabled={isLocked || mutation.isPending}
              allowedChoices={allowedChoices}
              declineLabel={status === 'waitlisted' ? 'Decline / Leave waitlist' : undefined}
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
              <Textarea disabled={isLocked} {...props} {...form.register('dietary_preference')} placeholder="e.g. Vegetarian" />
            )}
          />
          <FormRow
            id="special_requests"
            label="Special requests"
            description="Optional accessibility or accommodation requests."
            error={form.formState.errors.special_requests}
            renderControl={(props) => (
              <Textarea disabled={isLocked} {...props} {...form.register('special_requests')} placeholder="Anything the host should know?" />
            )}
          />
          {rootError && (
            <p role="alert" className="text-xs text-destructive">
              {rootError}
            </p>
          )}
          <Button type="submit" disabled={isLocked || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : status === 'waitlisted' ? 'Leave waitlist' : 'Save RSVP'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
