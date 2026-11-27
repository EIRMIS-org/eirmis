import { useQuery } from '@tanstack/react-query';
import { listAttendees } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export type ListAttendeesQuery = NonNullable<
    Parameters<typeof listAttendees>[0]
> & {
    event_id?: string;
};

export interface UseListAttendeesOptions {
    enabled?: boolean;
    refetchInterval?: number | false;
}

export function useListAttendees(
    query?: ListAttendeesQuery,
    options?: UseListAttendeesOptions,
) {
    const contractQuery = query as Parameters<typeof listAttendees>[0];

    return useQuery({
        queryKey: qk.listAttendees(contractQuery),
        queryFn: () => listAttendees(contractQuery),
        enabled: options?.enabled,
        refetchInterval: options?.refetchInterval,
    });
}
