import { useEffect, useState } from 'react'
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
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { ApiError, type AttendeeCreate } from '@/lib/api'
import {
    applyContractError,
    attendeeCreateResolver,
    FormRow,
} from '@/lib/forms'

export function WalkInModal() {
    const [open, setOpen] = useState(false)
    const { data: attendees = [] } = useListAttendees()
    const submitAttendee = useSubmitAttendee()
    const scanCheckIn = useScanCheckIn()
    const invitationId = attendees[0]?.invitation_id
    const form = useForm<AttendeeCreate>({
        resolver: attendeeCreateResolver,
        defaultValues: {
            invitation_id: '',
            full_name: '',
            email: '',
        },
    })

    useEffect(() => {
        if (invitationId) {
            form.setValue('invitation_id', invitationId, { shouldValidate: false })
        }
    }, [form, invitationId])

    const isPending = submitAttendee.isPending || scanCheckIn.isPending

    const handleSubmit = form.handleSubmit(async (values) => {
        form.clearErrors('root')

        try {
            const attendee = await submitAttendee.mutateAsync(values)
            if (!attendee.qr_token) {
                form.setError('root.server', {
                    type: 'server',
                    message: 'The attendee was created without a check-in token.',
                })
                return
            }

            await scanCheckIn.mutateAsync(attendee.qr_token)
            form.reset({
                invitation_id: invitationId || '',
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
                    <Button type="button" disabled={!invitationId}>
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

                    <input type="hidden" {...form.register('invitation_id')} />

                    <div className="space-y-4">
                        <FormRow
                            id="walk-in-name"
                            label="Full name"
                            required
                            autoComplete="name"
                            error={form.formState.errors.full_name}
                            {...form.register('full_name')}
                        />
                        <FormRow
                            id="walk-in-email"
                            label="Email"
                            type="email"
                            autoComplete="email"
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
                        <Button type="submit" disabled={isPending || !invitationId}>
                            {isPending ? 'Registering and checking in…' : 'Register and Check In'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
