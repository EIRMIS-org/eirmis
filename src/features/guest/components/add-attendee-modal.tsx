import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ApiError, type Attendee, type AttendeeCreate } from '@/lib/api'
import { qk } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormRow, applyContractError, attendeeCreateResolver } from '@/lib/forms'
import { useSubmitAttendee } from '@/features/guest/hooks/use-submit-attendee'

export interface AddAttendeeModalProps {
  invitationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: (attendee: Attendee) => void
}

export function AddAttendeeModal({
  invitationId,
  open,
  onOpenChange,
  onSubmitted,
}: AddAttendeeModalProps) {
  const queryClient = useQueryClient()
  const mutation = useSubmitAttendee()
  const form = useForm<AttendeeCreate>({
    resolver: attendeeCreateResolver,
    defaultValues: {
      invitation_id: invitationId,
      full_name: '',
      email: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        invitation_id: invitationId,
        full_name: '',
        email: '',
      })
    }
  }, [form, invitationId, open])

  async function submit(values: AttendeeCreate) {
    try {
      const created = await mutation.mutateAsync(values)
      queryClient.setQueriesData<Attendee[]>(
        { queryKey: qk.listAttendeesPrefix() },
        (current) => {
          if (!current) return [created]
          if (current.some((item) => item.id === created.id)) return current
          return [...current, created]
        },
      )
      onSubmitted?.(created)
      form.reset({
        invitation_id: invitationId,
        full_name: '',
        email: '',
      })
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError) {
        applyContractError(form.setError, error)
      }
    }
  }

  const rootError =
    form.formState.errors.root?.server?.message ??
    form.formState.errors.root?.validation?.message ??
    form.formState.errors.invitation_id?.message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Party Member</DialogTitle>
          <DialogDescription>
            Submit an additional attendee for organizer review. Email is optional.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <input type="hidden" {...form.register('invitation_id')} />
          <FormRow
            id="add-attendee-full-name"
            label="Full name"
            required
            placeholder="e.g. Jose Santos"
            error={form.formState.errors.full_name}
            {...form.register('full_name')}
          />
          <FormRow
            id="add-attendee-email"
            label="Email (optional)"
            type="email"
            placeholder="e.g. jose.santos@example.com"
            description="Optional contact email for notifications and QR pass delivery."
            error={form.formState.errors.email}
            {...form.register('email')}
          />
          {rootError && (
            <p role="alert" className="text-xs text-destructive">
              {rootError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting...' : 'Submit Attendee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
