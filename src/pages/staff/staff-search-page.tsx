import { Link } from 'react-router-dom'
import { AlertCircleIcon, ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AssignmentPicker } from '@/features/checkin/components/assignment-picker'
import { AttendanceSummary } from '@/features/checkin/components/attendance-summary'
import { ManualSearchTable } from '@/features/checkin/components/manual-search-table'
import { WalkInModal } from '@/features/checkin/components/walk-in-modal'
import { useAssignedEvent } from '@/features/checkin/hooks/use-assigned-event'
import { useMyAssignment } from '@/features/checkin/hooks/use-my-assignment'

export function StaffSearchPage() {
    const assignment = useMyAssignment()
    const activeEventId =
        assignment.status === 'single'
            ? assignment.eventId
            : assignment.status === 'multiple'
              ? (assignment.eventId ?? undefined)
              : undefined

    const {
        data: assignedEvents,
        isLoading: isEventLoading,
        isError: isEventError,
    } = useAssignedEvent(activeEventId)
    const assignedEvent = assignedEvents?.[0]

    const isLoading =
        assignment.status === 'loading' || (Boolean(activeEventId) && isEventLoading)
    const showNoAssignment =
        assignment.status === 'none' ||
        (Boolean(activeEventId) && !isEventLoading && (isEventError || !assignedEvent))
    const needsSelection =
        assignment.status === 'multiple' && assignment.eventId === null

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Back to scanner"
                        nativeButton={false}
                        className="mt-0.5 shrink-0"
                        render={<Link to="/staff" />}
                    >
                        <ArrowLeftIcon className="size-4" aria-hidden="true" />
                    </Button>
                    <div>
                        <h1 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
                            Manual Check-in
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Find an attendee by name or email when their QR code is unavailable.
                        </p>
                    </div>
                </div>
                {assignedEvent && (
                    <div className="shrink-0">
                        <WalkInModal eventId={assignedEvent.id} />
                    </div>
                )}
            </div>

            {assignment.status === 'multiple' && (
                <AssignmentPicker
                    assignments={assignment.assignments}
                    selectedEventId={assignment.eventId}
                    onSelect={assignment.select}
                />
            )}

            {isLoading && (
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            )}

            {needsSelection && (
                <Card role="status" className="border-border/80 p-6 shadow-xs">
                    <CardContent className="p-0 text-sm text-muted-foreground">
                        Choose an event above to search attendees.
                    </CardContent>
                </Card>
            )}

            {!isLoading && showNoAssignment && (
                <Card
                    role="status"
                    className="border-warning-border bg-warning-bg/40 p-6 shadow-xs"
                >
                    <CardContent className="flex items-start gap-3 p-0">
                        <AlertCircleIcon
                            className="mt-0.5 size-5 shrink-0 text-warning"
                            aria-hidden="true"
                        />
                        <div className="space-y-1">
                            <h2 className="font-display text-base font-semibold text-foreground">
                                No assigned event
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                No check-in assignment found for your account — ask an organizer to
                                assign you to an event.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {assignedEvent && (
                <>
                    <AttendanceSummary
                        eventId={assignedEvent.id}
                        capacity={assignedEvent.capacity}
                    />
                    <ManualSearchTable eventId={assignedEvent.id} />
                </>
            )}
        </div>
    )
}

export default StaffSearchPage
