import { useQuery } from '@tanstack/react-query';
import { listAttendees } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListAttendees(
    query?: Parameters<typeof listAttendees>[0],
) {
    return useQuery({
        queryKey: qk.listAttendees(query),
        queryFn: () => listAttendees(query),
    });
}
