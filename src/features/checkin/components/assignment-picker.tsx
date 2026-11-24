import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getAssignedEvent } from '@/lib/api'
import { qk } from '@/lib/api/query-keys'
import type { CheckInAssignment } from '@/features/checkin/hooks/use-my-assignment'

export interface AssignmentPickerProps {
    assignments: readonly CheckInAssignment[]
    selectedEventId: string | null
    onSelect: (eventId: string) => void
}

/**
 * Minimal event selector rendered when a check-in staff member holds multiple
 * active event assignments. Selection is persisted in sessionStorage by
 * `useMyAssignment`.
 */
export function AssignmentPicker({
    assignments,
    selectedEventId,
    onSelect,
}: AssignmentPickerProps) {
    const eventQueries = useQueries({
        queries: assignments.map((assignment) => ({
            queryKey: qk.getAssignedEvent(assignment.event_id),
            queryFn: () => getAssignedEvent(assignment.event_id),
        })),
    })

    const options = useMemo(
        () =>
            assignments.map((assignment, index) => {
                const event = eventQueries[index]?.data?.[0]
                return {
                    eventId: assignment.event_id,
                    label: event?.title ?? `Event ${assignment.event_id.slice(0, 8)}`,
                }
            }),
        [assignments, eventQueries],
    )

    const selectItems = useMemo(
        () => Object.fromEntries(options.map((option) => [option.eventId, option.label])),
        [options],
    )

    return (
        <Card className="mb-4 border border-border/80 p-4 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label
                    htmlFor="staff-assignment-select"
                    className="text-xs font-semibold text-foreground"
                >
                    Assigned event
                </label>
                <div className="w-full sm:max-w-xs">
                    <Select
                        items={selectItems}
                        value={selectedEventId}
                        onValueChange={(value) => {
                            if (typeof value === 'string' && value.length > 0) {
                                onSelect(value)
                            }
                        }}
                    >
                        <SelectTrigger
                            id="staff-assignment-select"
                            aria-label="Assigned event"
                            size="sm"
                            className="w-full"
                        >
                            <SelectValue placeholder="Choose an assigned event…" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem
                                    key={option.eventId}
                                    value={option.eventId}
                                    label={option.label}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </Card>
    )
}
