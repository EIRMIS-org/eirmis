import { useQuery } from '@tanstack/react-query';
import { listAttendees } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export interface UseListAttendeesOptions {
    refetchInterval?: number | false;
}

export function useListAttendees(
    query?: Parameters<typeof listAttendees>[0],
    options?: UseListAttendeesOptions,
) {
    return useQuery({
        queryKey: qk.listAttendees(query),
        queryFn: () => listAttendees(query),
        refetchInterval: options?.refetchInterval,
    });
}
