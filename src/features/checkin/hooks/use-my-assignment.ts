import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCheckInAssignments } from '@/lib/api'
import { qk } from '@/lib/api/query-keys'

export type CheckInAssignment = Awaited<ReturnType<typeof listCheckInAssignments>>[number]

export const SELECTED_ASSIGNMENT_STORAGE_KEY = 'eirmis:staff-selected-event'

function readStoredEventId(): string | null {
    if (typeof window === 'undefined') return null
    try {
        return window.sessionStorage.getItem(SELECTED_ASSIGNMENT_STORAGE_KEY)
    } catch {
        return null
    }
}

function persistSelectedEventId(eventId: string): void {
    if (typeof window === 'undefined') return
    try {
        window.sessionStorage.setItem(SELECTED_ASSIGNMENT_STORAGE_KEY, eventId)
    } catch {
        // Ignore storage quota or private-mode restrictions.
    }
}

export type MyAssignmentState =
    | { status: 'loading' }
    | { status: 'none' }
    | { status: 'single'; eventId: string; assignment: CheckInAssignment }
    | {
          status: 'multiple'
          assignments: CheckInAssignment[]
          eventId: string | null
          select: (eventId: string) => void
      }

/**
 * Derives the signed-in check-in staff member's assigned event(s) from
 * GET /rest/v1/checkin_assignments (RLS auto-scopes by auth_user_id without
 * passing an event_id filter).
 *
 * Handles zero, one, and many active assignments:
 * - zero (or query error) -> status: 'none'
 * - one -> status: 'single'
 * - many -> status: 'multiple' with sessionStorage-persisted selection
 */
export function useMyAssignment(): MyAssignmentState {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(readStoredEventId)

    const query = useQuery({
        queryKey: [...qk.listCheckInAssignmentsPrefix(), 'mine'] as const,
        queryFn: () => listCheckInAssignments(),
    })

    const activeAssignments = useMemo(() => {
        const seenEventIds = new Set<string>()
        const result: CheckInAssignment[] = []
        for (const assignment of query.data ?? []) {
            if (assignment.status !== 'active') continue
            if (seenEventIds.has(assignment.event_id)) continue
            seenEventIds.add(assignment.event_id)
            result.push(assignment)
        }
        return result
    }, [query.data])

    const select = useCallback((nextEventId: string) => {
        setSelectedEventId(nextEventId)
        persistSelectedEventId(nextEventId)
    }, [])

    if (query.isLoading) {
        return { status: 'loading' }
    }

    if (query.isError || activeAssignments.length === 0) {
        return { status: 'none' }
    }

    if (activeAssignments.length === 1) {
        const assignment = activeAssignments[0]
        return {
            status: 'single',
            eventId: assignment.event_id,
            assignment,
        }
    }

    const validSelected =
        selectedEventId &&
        activeAssignments.some((assignment) => assignment.event_id === selectedEventId)
            ? selectedEventId
            : null

    return {
        status: 'multiple',
        assignments: activeAssignments,
        eventId: validSelected,
        select,
    }
}
