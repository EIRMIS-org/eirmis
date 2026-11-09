import { useQuery } from '@tanstack/react-query';
import { listEvents } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListEvents(
    query?: Parameters<typeof listEvents>[0],
) {
    return useQuery({
        queryKey: qk.listEvents(query),
        queryFn: () => listEvents(query),
    });
}
