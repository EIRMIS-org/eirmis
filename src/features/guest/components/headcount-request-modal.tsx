import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  ApiError,
  type HeadcountIncreaseRequest,
  type HeadcountIncreaseRequestCreate,
} from '@/lib/api'
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
import { Textarea } from '@/components/ui/textarea'
import {
  FormRow,
  applyContractError,
  headcountRequestCreateResolver,
} from '@/lib/forms'
import { useSubmitHeadcountRequest } from '@/features/guest/hooks/use-submit-headcount-request'

export interface HeadcountRequestModalProps {
  invitationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: (request: HeadcountIncreaseRequest) => void
}

export function HeadcountRequestModal({
  invitationId,
  open,
  onOpenChange,
  onSubmitted,
}: HeadcountRequestModalProps) {
  const queryClient = useQueryClient()
  const mutation = useSubmitHeadcountRequest()
  const form = useForm({
    resolver: headcountRequestCreateResolver,
    defaultValues: {
      invitation_id: invitationId,
      requested_additional_heads: 1,
      note: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        invitation_id: invitationId,
        requested_additional_heads: 1,
        note: '',
      })
    }
  }, [form, invitationId, open])

  async function submit(values: HeadcountIncreaseRequestCreate) {
    try {
      const created = await mutation.mutateAsync(values)
      queryClient.setQueriesData<HeadcountIncreaseRequest[]>(
        { queryKey: qk.listHeadcountRequestsPrefix() },
        (current) => {
          const others = (current ?? []).filter(
            (item) =>
              item.id !== created.id &&
              !(
                item.invitation_id === created.invitation_id &&
                item.status === 'pending'
              ),
          )
          return [created, ...others]
        },
      )
      onSubmitted?.(created)
      form.reset({
        invitation_id: invitationId,
        requested_additional_heads: 1,
        note: '',
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
          <DialogTitle>Request Additional Heads</DialogTitle>
          <DialogDescription>
            Ask the event organizer to raise your invitation&apos;s maximum party ceiling.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <input type="hidden" {...form.register('invitation_id')} />
          <FormRow
            id="requested_additional_heads"
            label="Additional heads requested"
            type="number"
            min={1}
            required
            description="Number of extra spots to request above your current party ceiling."
            error={form.formState.errors.requested_additional_heads?.message}
            {...form.register('requested_additional_heads')}
          />
          <FormRow
            id="headcount-note"
            label="Reason for request"
            description="Share context to help the organizer review your request."
            error={form.formState.errors.note}
            renderControl={(props) => (
              <Textarea
                {...props}
                {...form.register('note')}
                placeholder="e.g. Bringing two colleagues to join our delegation."
              />
            )}
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
              {mutation.isPending ? 'Submitting...' : 'Submit Headcount Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
