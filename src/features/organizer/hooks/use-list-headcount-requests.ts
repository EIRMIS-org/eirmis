import { useQuery } from '@tanstack/react-query';
import { listHeadcountRequests } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListHeadcountRequests(
    query?: Parameters<typeof listHeadcountRequests>[0],
) {
    return useQuery({
        queryKey: qk.listHeadcountRequests(query),
        queryFn: () => listHeadcountRequests(query),
    });
}
