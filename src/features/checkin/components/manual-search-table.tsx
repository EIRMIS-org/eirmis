import { useMemo, useState } from 'react'
import { CheckCircle2Icon, SearchIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useScanCheckIn } from '@/features/checkin/hooks/use-scan-check-in'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { useListInvitations } from '@/features/organizer/hooks/use-list-invitations'

const DEFAULT_EVENT_ID = '55555555-5555-5555-5555-555555555555'

export interface ManualSearchTableProps {
    eventId?: string
}

export function ManualSearchTable({ eventId = DEFAULT_EVENT_ID }: ManualSearchTableProps) {
    const [query, setQuery] = useState('')
    const invitationsQuery = useListInvitations({ event_id: `eq.${eventId}` })
    const attendeesQuery = useListAttendees()
    const scanMutation = useScanCheckIn()

    const invitationIds = useMemo(
        () =>
            new Set(
                (invitationsQuery.data ?? []).map((invitation) => invitation.id),
            ),
        [invitationsQuery.data],
    )

    const eventAttendees = useMemo(
        () =>
            (attendeesQuery.data ?? []).filter((attendee) =>
                invitationIds.has(attendee.invitation_id),
            ),
        [attendeesQuery.data, invitationIds],
    )

    const filteredAttendees = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase()
        if (!normalizedQuery) return eventAttendees

        return eventAttendees.filter((attendee) =>
            [attendee.full_name, attendee.email]
                .filter(Boolean)
                .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
        )
    }, [eventAttendees, query])

    const isLoading = invitationsQuery.isLoading || attendeesQuery.isLoading
    const isError = invitationsQuery.isError || attendeesQuery.isError
    const activeToken = scanMutation.isPending ? scanMutation.variables : undefined
    const hasSearchFilter = Boolean(query.trim())

    return (
        <Card>
            <CardHeader>
                <CardTitle>Find an attendee</CardTitle>
                {!isLoading && !isError && (
                    <CardDescription>
                        {eventAttendees.length}{' '}
                        {eventAttendees.length === 1 ? 'attendee' : 'attendees'} for this event
                        {hasSearchFilter ? ` (${filteredAttendees.length} matching)` : ''}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div role="search" aria-label="Filter event attendees" className="relative">
                    <SearchIcon
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by name or email"
                        aria-label="Search attendees by name or email"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className="pl-9"
                    />
                </div>

                {isLoading && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Loading attendees…
                    </p>
                )}

                {isError && (
                    <p role="alert" className="py-8 text-center text-sm text-destructive">
                        Attendees could not be loaded. Try again.
                    </p>
                )}

                {!isLoading && !isError && (
                    <div className="overflow-x-auto rounded-xl border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead scope="col">Name</TableHead>
                                    <TableHead scope="col">Email</TableHead>
                                    <TableHead scope="col">Status</TableHead>
                                    <TableHead scope="col">Checked in</TableHead>
                                    <TableHead scope="col" className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAttendees.map((attendee) => {
                                    const isCheckingIn = activeToken === attendee.qr_token
                                    const canCheckIn = attendee.status === 'approved' && Boolean(attendee.qr_token)

                                    return (
                                        <TableRow key={attendee.id}>
                                            <TableCell className="font-medium">
                                                {attendee.full_name}
                                            </TableCell>
                                            <TableCell>{attendee.email || '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" size="sm">
                                                    {attendee.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {attendee.checked_in ? (
                                                    <span className="inline-flex items-center gap-1 text-success">
                                                        <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                                                        Yes
                                                    </span>
                                                ) : (
                                                    'No'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={
                                                        attendee.checked_in ||
                                                        !canCheckIn ||
                                                        scanMutation.isPending
                                                    }
                                                    onClick={() => {
                                                        if (attendee.qr_token) {
                                                            scanMutation.mutate(attendee.qr_token)
                                                        }
                                                    }}
                                                >
                                                    {attendee.checked_in
                                                        ? 'Checked In'
                                                        : isCheckingIn
                                                          ? 'Checking In…'
                                                          : 'Check In'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}

                                {filteredAttendees.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No attendees match your search.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
