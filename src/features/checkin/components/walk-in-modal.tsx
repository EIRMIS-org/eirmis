import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { SearchIcon, UserPlusIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useScanCheckIn } from '@/features/checkin/hooks/use-scan-check-in'
import { useSubmitAttendee } from '@/features/guest/hooks/use-submit-attendee'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { useListGuests } from '@/features/organizer/hooks/use-list-guests'
import { useListInvitations } from '@/features/organizer/hooks/use-list-invitations'
import { ApiError, type Attendee, type AttendeeCreate } from '@/lib/api'
import {
    applyContractError,
    attendeeCreateResolver,
    FormRow,
} from '@/lib/forms'

const DEFAULT_EVENT_ID = '55555555-5555-5555-5555-555555555555'

export interface WalkInModalProps {
    eventId?: string
}

interface InvitationOption {
    id: string
    label: string
    searchText: string
}

export function WalkInModal({ eventId = DEFAULT_EVENT_ID }: WalkInModalProps) {
    const [open, setOpen] = useState(false)
    const [invitationFilter, setInvitationFilter] = useState('')
    const [createdAttendee, setCreatedAttendee] = useState<Attendee | null>(null)

    const invitationsQuery = useListInvitations({ event_id: `eq.${eventId}` })
    const guestsQuery = useListGuests()
    const attendeesQuery = useListAttendees()
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

    const acceptedOptions = useMemo<InvitationOption[]>(() => {
        const guestById = new Map(
            (guestsQuery.data ?? []).map((guest) => [guest.id, guest]),
        )
        const attendeeByInvitationId = new Map<string, Attendee>()
        for (const attendee of attendeesQuery.data ?? []) {
            const existing = attendeeByInvitationId.get(attendee.invitation_id)
            if (!existing || attendee.is_primary) {
                attendeeByInvitationId.set(attendee.invitation_id, attendee)
            }
        }

        return (invitationsQuery.data ?? [])
            .filter((invitation) => invitation.status === 'accepted')
            .map((invitation) => {
                const guest = guestById.get(invitation.guest_id)
                const primaryAttendee = attendeeByInvitationId.get(invitation.id)
                const name = guest?.full_name?.trim() || primaryAttendee?.full_name?.trim() || ''
                const email = guest?.email?.trim() || primaryAttendee?.email?.trim() || ''
                const shortId = invitation.id.slice(0, 8)
                const partyLabel = `Party ${invitation.party_size}/${invitation.max_party_size}`

                let identityLabel = `Invitation ${shortId}`
                if (name && email) {
                    identityLabel = `${name} (${email})`
                } else if (name) {
                    identityLabel = name
                } else if (email) {
                    identityLabel = email
                }

                const label = `${identityLabel} — ${partyLabel}`

                return {
                    id: invitation.id,
                    label,
                    searchText: `${identityLabel} ${shortId} ${invitation.id}`.toLocaleLowerCase(),
                }
            })
    }, [attendeesQuery.data, guestsQuery.data, invitationsQuery.data])

    const selectItems = useMemo<Record<string, string>>(
        () =>
            Object.fromEntries(
                acceptedOptions.map((option) => [option.id, option.label]),
            ),
        [acceptedOptions],
    )

    const filteredOptions = useMemo(() => {
        const normalized = invitationFilter.trim().toLocaleLowerCase()
        if (!normalized) return acceptedOptions
        return acceptedOptions.filter((option) =>
            option.searchText.includes(normalized),
        )
    }, [acceptedOptions, invitationFilter])

    const isPending = submitAttendee.isPending || scanCheckIn.isPending
    const isLocked = Boolean(createdAttendee) || isPending

    const handleSubmit = form.handleSubmit(async (values) => {
        form.clearErrors('root')

        try {
            const attendee = createdAttendee ?? await submitAttendee.mutateAsync(values)
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
            setInvitationFilter('')
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

    const selectPlaceholder = invitationsQuery.isPending
        ? 'Loading accepted invitations…'
        : acceptedOptions.length === 0
          ? 'No accepted invitations available'
          : 'Select an accepted invitation'

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button type="button">
                        <UserPlusIcon className="mr-1.5 size-4" aria-hidden="true" />
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
                        label="Accepted invitation"
                        description="Choose the accepted invitation party this attendee is joining."
                        required
                        error={form.formState.errors.invitation_id}
                        renderControl={(controlProps) => (
                            <div className="space-y-2">
                                <div className="relative">
                                    <SearchIcon
                                        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        type="search"
                                        value={invitationFilter}
                                        onChange={(event) => setInvitationFilter(event.target.value)}
                                        placeholder="Filter by guest name, email, or ID…"
                                        aria-label="Filter accepted invitations"
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        disabled={isLocked || invitationsQuery.isPending || acceptedOptions.length === 0}
                                        className="pl-8 text-xs"
                                    />
                                </div>

                                <Controller
                                    name="invitation_id"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select
                                            items={selectItems}
                                            name={field.name}
                                            required={controlProps.required}
                                            value={field.value || null}
                                            onValueChange={(value) => field.onChange(value ?? '')}
                                            disabled={isLocked || invitationsQuery.isPending || acceptedOptions.length === 0}
                                        >
                                            <SelectTrigger
                                                id={controlProps.id}
                                                aria-invalid={controlProps['aria-invalid']}
                                                aria-describedby={controlProps['aria-describedby']}
                                                className="w-full"
                                            >
                                                <SelectValue placeholder={selectPlaceholder} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredOptions.length > 0 ? (
                                                    filteredOptions.map((option) => (
                                                        <SelectItem
                                                            key={option.id}
                                                            value={option.id}
                                                            label={option.label}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                                                        No accepted invitations match your filter.
                                                    </div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />

                                {invitationsQuery.isError && (
                                    <p role="alert" className="text-xs text-destructive">
                                        Unable to load accepted invitations. Try again.
                                    </p>
                                )}
                            </div>
                        )}
                    />

                    <div className="space-y-4">
                        <FormRow
                            id="walk-in-name"
                            label="Full name"
                            required
                            autoComplete="name"
                            readOnly={isLocked}
                            error={form.formState.errors.full_name}
                            {...form.register('full_name')}
                        />
                        <FormRow
                            id="walk-in-email"
                            label="Email"
                            type="email"
                            autoComplete="email"
                            readOnly={isLocked}
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
