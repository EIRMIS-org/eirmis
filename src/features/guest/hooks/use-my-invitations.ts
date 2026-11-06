import { useQuery } from '@tanstack/react-query';
import { listInvitations } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useMyInvitations(
    query?: Parameters<typeof listInvitations>[0],
) {
    return useQuery({
        queryKey: qk.listInvitations(query),
        queryFn: () => listInvitations(query),
    });
}
