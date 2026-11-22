import { Link } from 'react-router-dom'
import { AlertCircleIcon, ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ManualSearchTable } from '@/features/checkin/components/manual-search-table'
import { WalkInModal } from '@/features/checkin/components/walk-in-modal'
import { useAssignedEvent } from '@/features/checkin/hooks/use-assigned-event'

const DEFAULT_EVENT_ID = '55555555-5555-5555-5555-555555555555'

export interface StaffSearchPageProps {
    eventId?: string
}

export function StaffSearchPage({ eventId = DEFAULT_EVENT_ID }: StaffSearchPageProps) {
    const {
        data: assignedEvents,
        isLoading: isAssignmentLoading,
        isError: isAssignmentError,
    } = useAssignedEvent(eventId)
    const assignedEvent = assignedEvents?.[0]

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

            {isAssignmentLoading && (
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            )}

            {!isAssignmentLoading && (isAssignmentError || !assignedEvent) && (
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

            {assignedEvent && <ManualSearchTable eventId={assignedEvent.id} />}
        </div>
    )
}

export default StaffSearchPage
