import { useQuery } from '@tanstack/react-query';
import { listGuests } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListGuests(
    query?: Parameters<typeof listGuests>[0],
) {
    return useQuery({
        queryKey: qk.listGuests(query),
        queryFn: () => listGuests(query),
    });
}
