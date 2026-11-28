import { useQuery } from '@tanstack/react-query';
import { listAttendees, listAttendeesByInvitationIds } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export interface UseListAttendeesOptions {
    enabled?: boolean;
    refetchInterval?: number | false;
}

export function useListAttendees(
    query?: Parameters<typeof listAttendees>[0],
    options?: UseListAttendeesOptions,
) {
    return useQuery({
        queryKey: qk.listAttendees(query),
        queryFn: () => listAttendees(query),
        enabled: options?.enabled,
        refetchInterval: options?.refetchInterval,
    });
}

export function useListAttendeesByInvitationIds(
    invitationIds: readonly string[],
    options?: UseListAttendeesOptions,
) {
    return useQuery({
        queryKey: qk.listAttendeesByInvitationIds(invitationIds),
        queryFn: () => listAttendeesByInvitationIds(invitationIds),
        enabled: (options?.enabled ?? true) && invitationIds.length > 0,
        refetchInterval: options?.refetchInterval,
    });
}
