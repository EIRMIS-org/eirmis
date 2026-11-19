import { useMemo, useState } from 'react'
import { CheckCircle2Icon, SearchIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function ManualSearchTable() {
    const [query, setQuery] = useState('')
    const { data: attendees = [], isLoading, isError } = useListAttendees()
    const scanMutation = useScanCheckIn()

    const filteredAttendees = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase()
        if (!normalizedQuery) return attendees

        return attendees.filter((attendee) =>
            [attendee.full_name, attendee.email]
                .filter(Boolean)
                .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
        )
    }, [attendees, query])

    const activeToken = scanMutation.isPending ? scanMutation.variables : undefined

    return (
        <Card>
            <CardHeader>
                <CardTitle>Find an attendee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by name or email"
                        aria-label="Search attendees by name or email"
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
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Checked in</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
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
                                                        <CheckCircle2Icon className="size-3.5" />
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
