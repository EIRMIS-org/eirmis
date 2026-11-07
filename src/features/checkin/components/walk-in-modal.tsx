import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { UserPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { useScanCheckIn } from '@/features/checkin/hooks/use-scan-check-in'
import { useSubmitAttendee } from '@/features/guest/hooks/use-submit-attendee'
import { ApiError, type Attendee, type AttendeeCreate } from '@/lib/api'
import {
    applyContractError,
    attendeeCreateResolver,
    FormRow,
} from '@/lib/forms'

export function WalkInModal() {
    const [open, setOpen] = useState(false)
    const [createdAttendee, setCreatedAttendee] = useState<Attendee | null>(null)
    const submitAttendee = useSubmitAttendee()
    const scanCheckIn = useScanCheckIn()
    const form = useForm<AttendeeCreate>({
        resolver: attendeeCreateResolver,
        defaultValues: {
            invitation_id: '',
            full_name: '',
            email: '',
        },
    })

    const isPending = submitAttendee.isPending || scanCheckIn.isPending

    const handleSubmit = form.handleSubmit(async (values) => {
        form.clearErrors('root')

        try {
            const attendee = createdAttendee ?? await submitAttendee.mutateAsync({
                ...values,
                is_walk_in: true,
            })
            setCreatedAttendee(attendee)
            if (!attendee.qr_token) {
                form.setError('root.server', {
                    type: 'server',
                    message: 'The attendee was created without a check-in token.',
                })
                return
            }

            const result = await scanCheckIn.mutateAsync(attendee.qr_token)
            if (result.result === 'invalid_token') {
                form.setError('root.server', {
                    type: 'server',
                    message: result.message || 'Check-in failed. Retry this attendee.',
                })
                return
            }
            setCreatedAttendee(null)
            form.reset({
                invitation_id: '',
                full_name: '',
                email: '',
            })
            setOpen(false)
        } catch (error) {
            if (error instanceof ApiError) {
                applyContractError(form.setError, error)
                return
            }

            form.setError('root.server', {
                type: 'server',
                message: error instanceof Error ? error.message : 'Walk-in registration failed.',
            })
        }
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button type="button">
                        <UserPlusIcon className="mr-1.5 size-4" />
                        Register Walk-in
                    </Button>
                }
            />
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>Register a walk-in</DialogTitle>
                        <DialogDescription>
                            Create an on-site attendee and check them in immediately.
                        </DialogDescription>
                    </DialogHeader>

                    <FormRow
                        id="walk-in-invitation"
                        label="Invitation ID"
                        description="Enter the accepted invitation ID for the party this attendee is joining."
                        required
                        readOnly={Boolean(createdAttendee) || isPending}
                        error={form.formState.errors.invitation_id}
                        {...form.register('invitation_id')}
                    />

                    <div className="space-y-4">
                        <FormRow
                            id="walk-in-name"
                            label="Full name"
                            required
                            autoComplete="name"
                            readOnly={Boolean(createdAttendee) || isPending}
                            error={form.formState.errors.full_name}
                            {...form.register('full_name')}
                        />
                        <FormRow
                            id="walk-in-email"
                            label="Email"
                            type="email"
                            autoComplete="email"
                            readOnly={Boolean(createdAttendee) || isPending}
                            description="Optional. Used for attendee contact details."
                            error={form.formState.errors.email}
                            {...form.register('email')}
                        />
                    </div>

                    {form.formState.errors.root?.server?.message && (
                        <p role="alert" className="text-sm text-destructive">
                            {form.formState.errors.root.server.message}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Processing…' : createdAttendee ? 'Retry Check-in' : 'Register and Check In'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
