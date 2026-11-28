import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useListAttendeesByInvitationIds } from '@/features/organizer/hooks/use-list-attendees'
import { eq, listInvitations } from '@/lib/api'
import { qk } from '@/lib/api/query-keys'

/**
 * Polling interval shared with the organizer attendance view so counts stay
 * current as colleagues check in attendees across gates.
 */
export const ATTENDANCE_REFETCH_INTERVAL_MS = 30_000

export interface AttendanceSummaryMetrics {
    /**
     * Expected headcount for the event: sum of `party_size` across all
     * invitations with `status === 'accepted'` (confirmed attendees including
     * plus-ones). Keep aligned with the organizer attendance tab.
     */
    expected: number
    /** Count of attendees for this event with `checked_in === true`. */
    checkedIn: number
    isLoading: boolean
    isError: boolean
}

export function useAttendanceSummary(eventId?: string): AttendanceSummaryMetrics {
    const invitationQuery = useMemo(
        () => (eventId ? { event_id: eq(eventId) } : undefined),
        [eventId],
    )

    const invitations = useQuery({
        queryKey: qk.listInvitations(invitationQuery),
        queryFn: () => listInvitations(invitationQuery),
        enabled: Boolean(eventId),
        refetchInterval: ATTENDANCE_REFETCH_INTERVAL_MS,
    })

    const invitationIdList = useMemo(
        () => (invitations.data ?? []).map((invitation) => invitation.id),
        [invitations.data],
    )

    const attendees = useListAttendeesByInvitationIds(invitationIdList, {
        enabled: Boolean(eventId),
        refetchInterval: ATTENDANCE_REFETCH_INTERVAL_MS,
    })

    const { expected, checkedIn } = useMemo(() => {
        const eventInvitations = invitations.data ?? []
        let expectedTotal = 0
        const invitationIds = new Set<string>()

        for (const invitation of eventInvitations) {
            invitationIds.add(invitation.id)
            if (invitation.status === 'accepted') {
                expectedTotal += invitation.party_size
            }
        }

        let checkedInTotal = 0
        for (const attendee of attendees.data ?? []) {
            if (attendee.checked_in && invitationIds.has(attendee.invitation_id)) {
                checkedInTotal += 1
            }
        }

        return {
            expected: expectedTotal,
            checkedIn: checkedInTotal,
        }
    }, [attendees.data, invitations.data])

    return {
        expected,
        checkedIn,
        isLoading: invitations.isLoading || attendees.isLoading,
        isError: invitations.isError || attendees.isError,
    }
}
