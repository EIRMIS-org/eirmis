import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, ShieldCheck, X } from 'lucide-react'
import type { OrganizerProfile, OrganizerStatus } from '@/lib/api'
import { useAdminOrganizers } from '../hooks/use-admin-organizers'
import { useUpdateOrganizerStatus } from '../hooks/use-update-organizer-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

const PAGE_SIZE = 20

const statusLabels: Record<OrganizerStatus, string> = {
    pending: 'Pending',
    active: 'Active',
    suspended: 'Suspended',
}

const statusVariants: Record<
    OrganizerStatus,
    'warning' | 'success' | 'destructive'
> = {
    pending: 'warning',
    active: 'success',
    suspended: 'destructive',
}

function targetStatus(status: OrganizerStatus): OrganizerStatus | undefined {
    if (status === 'pending') return 'active'
    if (status === 'active') return 'suspended'
    return undefined
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(value),
    )
}

export function OrganizerVerificationQueue() {
    const [searchParams, setSearchParams] = useSearchParams()
    const parsedPage = Number(searchParams.get('page') ?? '0')
    const page = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0
    const [pendingChange, setPendingChange] = useState<{
        organizer: OrganizerProfile
        status: OrganizerStatus
    } | null>(null)
    const organizersQuery = useAdminOrganizers(page, '')
    const updateStatus = useUpdateOrganizerStatus()
    const organizers = organizersQuery.data ?? []

    function requestStatusChange(organizer: OrganizerProfile) {
        const status = targetStatus(organizer.status)
        if (status) setPendingChange({ organizer, status })
    }

    function setPage(nextPage: number) {
        setSearchParams(nextPage === 0 ? {} : { page: String(nextPage) })
    }

    function confirmStatusChange() {
        if (!pendingChange) return
        updateStatus.mutate(
            { id: pendingChange.organizer.id, status: pendingChange.status },
            { onSuccess: () => setPendingChange(null) },
        )
    }

    return (
        <main className="flex-1">
            <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <ShieldCheck className="size-4" />
                            Admin access boundary
                        </div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                            Organizer verification
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Review organizer profiles and account access. Event, guest,
                            and attendee data is never exposed in this portal.
                        </p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                        Profiles only · Page {page + 1}
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    {organizersQuery.isPending ? (
                        <QueueMessage>Loading organizer profiles...</QueueMessage>
                    ) : organizersQuery.isError ? (
                        <QueueMessage>
                            We could not load organizer profiles. Try again.
                        </QueueMessage>
                    ) : organizers.length === 0 ? (
                        <QueueMessage>
                            No organizer profiles are available on this page. Event
                            and guest data is not part of the admin view.
                        </QueueMessage>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organizer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizers.map((organizer) => (
                                    <TableRow key={organizer.id}>
                                        <TableCell>
                                            <div className="font-medium text-foreground">
                                                {organizer.full_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {organizer.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariants[organizer.status]}>
                                                {statusLabels[organizer.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(organizer.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {organizer.status === 'suspended' ? (
                                                <span className="text-xs text-muted-foreground">
                                                    Access revoked
                                                </span>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        organizer.status === 'active'
                                                            ? 'destructive'
                                                            : 'primary'
                                                    }
                                                    onClick={() => requestStatusChange(organizer)}
                                                >
                                                    {organizer.status === 'active' ? (
                                                        <X data-icon="inline-start" />
                                                    ) : (
                                                        <Check data-icon="inline-start" />
                                                    )}
                                                    {organizer.status === 'active'
                                                        ? 'Revoke'
                                                        : 'Approve'}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="mt-5 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0 || organizersQuery.isFetching}
                        onClick={() => setPage(page - 1)}
                    >
                        <ChevronLeft data-icon="inline-start" />
                        Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={organizers.length < PAGE_SIZE || organizersQuery.isFetching}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                        <ChevronRight data-icon="inline-end" />
                    </Button>
                </div>
            </section>

            <Dialog
                open={pendingChange !== null}
                onOpenChange={(open) => {
                    if (!open && !updateStatus.isPending) setPendingChange(null)
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {pendingChange?.status === 'active'
                                ? 'Approve organizer?'
                                : 'Revoke organizer access?'}
                        </DialogTitle>
                        <DialogDescription>
                            {pendingChange?.organizer.full_name} will be marked as{' '}
                            <strong>{pendingChange?.status}</strong>. This changes
                            portal access, is audited, and does not expose event or
                            guest data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPendingChange(null)}
                            disabled={updateStatus.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={pendingChange?.status === 'suspended' ? 'destructive' : 'primary'}
                            onClick={confirmStatusChange}
                            disabled={updateStatus.isPending}
                        >
                            {updateStatus.isPending ? 'Saving...' : 'Confirm change'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}

function QueueMessage({ children }: { children: string }) {
    return (
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {children}
        </div>
    )
}
