/**
 * src/features/checkin/components/attendance-summary.tsx
 *
 * Read-only attendance summary strip for the assigned event (A-19).
 *
 * Definition shared with the organizer attendance tab:
 * - Expected: sum of `party_size` across all `accepted` invitations for the event
 *   (confirmed headcount including plus-ones).
 * - Checked-in: count of event attendees with `checked_in === true`.
 * - Capacity: event.capacity.
 * - Polling interval: 30_000 ms (ATTENDANCE_REFETCH_INTERVAL_MS).
 */

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssignedEvent } from '@/features/checkin/hooks/use-assigned-event'
import { useAttendanceSummary } from '@/features/checkin/hooks/use-attendance-summary'

export interface AttendanceSummaryProps {
    eventId: string
    capacity?: number
}

export function AttendanceSummary({ eventId, capacity }: AttendanceSummaryProps) {
    const metrics = useAttendanceSummary(eventId)
    const assignedEventQuery = useAssignedEvent(
        capacity === undefined ? eventId : undefined,
    )
    const resolvedCapacity = capacity ?? assignedEventQuery.data?.[0]?.capacity

    if (metrics.isLoading) {
        return (
            <section aria-label="Attendance summary" className="mb-4">
                <Card className="border border-border/80 p-3 shadow-xs">
                    <div className="grid grid-cols-3 gap-3">
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </Card>
            </section>
        )
    }

    if (metrics.isError) {
        return (
            <section aria-label="Attendance summary" className="mb-4">
                <Card className="border border-border/80 px-4 py-3 text-xs text-muted-foreground shadow-xs">
                    Attendance counts are temporarily unavailable.
                </Card>
            </section>
        )
    }

    return (
        <section aria-label="Attendance summary" className="mb-4">
            <Card className="border border-border/80 p-3 shadow-xs">
                <dl className="grid grid-cols-3 divide-x divide-border/70 text-center">
                    <div className="px-2">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Expected
                        </dt>
                        <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-foreground">
                            {metrics.expected}
                        </dd>
                    </div>
                    <div className="px-2">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Checked-in
                        </dt>
                        <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-primary">
                            {metrics.checkedIn}
                        </dd>
                    </div>
                    <div className="px-2">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Capacity
                        </dt>
                        <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-foreground">
                            {resolvedCapacity ?? '—'}
                        </dd>
                    </div>
                </dl>
            </Card>
        </section>
    )
}
