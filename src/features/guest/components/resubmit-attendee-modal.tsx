import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ApiError, type Attendee, type AttendeeUpdate } from '@/lib/api'
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
import { FormRow, applyContractError, attendeeUpdateResolver } from '@/lib/forms'
import { useUpdateAttendee } from '@/features/guest/hooks/use-update-attendee'

export interface ResubmitAttendeeModalProps {
  attendee: Attendee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onResubmitted?: (attendee: Attendee) => void
}

export function ResubmitAttendeeModal({
  attendee,
  open,
  onOpenChange,
  onResubmitted,
}: ResubmitAttendeeModalProps) {
  const queryClient = useQueryClient()
  const mutation = useUpdateAttendee()
  const form = useForm<AttendeeUpdate>({
    resolver: attendeeUpdateResolver,
    defaultValues: {
      full_name: attendee?.full_name ?? '',
      email: attendee?.email ?? '',
    },
  })

  useEffect(() => {
    if (attendee && open) {
      form.reset({
        full_name: attendee.full_name,
        email: attendee.email ?? '',
      })
    }
  }, [attendee, form, open])

  async function submit(values: AttendeeUpdate) {
    if (!attendee) return
    try {
      const updated = await mutation.mutateAsync({
        id: attendee.id,
        body: values,
      })
      const resubmitted: Attendee = {
        ...attendee,
        ...updated,
        ...values,
        id: attendee.id,
        invitation_id: attendee.invitation_id,
        is_primary: attendee.is_primary,
        status: 'pending',
        review_reason: null,
      }
      queryClient.setQueriesData<Attendee[]>(
        { queryKey: qk.listAttendeesPrefix() },
        (current) =>
          current?.map((item) =>
            item.id === attendee.id ? resubmitted : item,
          ) ?? [resubmitted],
      )
      onResubmitted?.(resubmitted)
      onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fix &amp; Resubmit Attendee</DialogTitle>
          <DialogDescription>
            Update the attendee details below to resubmit for organizer review.
          </DialogDescription>
        </DialogHeader>
        {attendee?.review_reason && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <strong className="font-semibold">Rejection reason: </strong>
            <span>{attendee.review_reason}</span>
          </div>
        )}
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormRow
            id="resubmit-attendee-full-name"
            label="Full name"
            required
            placeholder="e.g. Jose Antonio Santos"
            error={form.formState.errors.full_name}
            {...form.register('full_name')}
          />
          <FormRow
            id="resubmit-attendee-email"
            label="Email (optional)"
            type="email"
            placeholder="e.g. jose@example.com"
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
              {mutation.isPending ? 'Resubmitting...' : 'Resubmit for Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
