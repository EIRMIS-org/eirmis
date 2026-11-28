import { useQuery } from '@tanstack/react-query';
import {
    listAttendees, listAuditLogEntries, listCheckInAssignments,
    listHeadcountRequests, listInvitations, listInvitationDesigns, listReminderSchedules,
} from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { AUDIT_LOG_REFETCH_INTERVAL_MS } from './use-list-audit-log-entries';

// Read all pages: a partial membership set would silently hide valid audit history.
async function allPages<T>(load: (page: { limit: number; offset: number }) => Promise<T[]>): Promise<T[]> {
    const rows: T[] = [];
    const limit = 500;
    for (let offset = 0; ; offset += limit) {
        const page = await load({ limit, offset });
        rows.push(...page);
        if (page.length < limit) return rows;
    }
}

export function useEventAuditLogEntries(eventId: string) {
    return useQuery({
        queryKey: [...qk.listAuditLogEntries(), 'event', eventId],
        refetchInterval: AUDIT_LOG_REFETCH_INTERVAL_MS,
        queryFn: async () => {
            const [logs, invitations, attendees, requests, reminders, designs, assignments] = await Promise.all([
                listAuditLogEntries(),
                allPages((page) => listInvitations({ ...page, event_id: `eq.${eventId}` })),
                allPages(listAttendees),
                allPages(listHeadcountRequests),
                listReminderSchedules(eventId),
                listInvitationDesigns(eventId),
                listCheckInAssignments(eventId),
            ]);
            const invitationIds = new Set(invitations.filter((row) => row.event_id === eventId).map((row) => row.id));
            const entities = new Map<string, Set<string>>([
                ['event', new Set([eventId])],
                ['invitation', invitationIds],
                ['attendee', new Set(attendees.filter((row) => invitationIds.has(row.invitation_id)).map((row) => row.id))],
                ['headcount_increase_request', new Set(requests.filter((row) => invitationIds.has(row.invitation_id)).map((row) => row.id))],
                ['reminder_schedule', new Set(reminders.filter((row) => row.event_id === eventId).map((row) => row.id))],
                ['invitation_design', new Set(designs.filter((row) => row.event_id === eventId).map((row) => row.id))],
                ['checkin_assignment', new Set(assignments.filter((row) => row.event_id === eventId).map((row) => row.id))],
            ]);
            // Deleted children cannot be attributed reliably from the current API:
            // audit snapshots do not consistently contain an event/invitation ID.
            // Exclude unresolved entries rather than guessing their ownership.
            return logs.filter((entry) => entities.get(entry.entity_type)?.has(entry.entity_id));
        },
    });
}
