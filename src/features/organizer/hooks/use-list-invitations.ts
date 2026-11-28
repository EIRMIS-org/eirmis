import { useQuery } from '@tanstack/react-query';
import { listInvitations } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export interface UseListInvitationsOptions {
    refetchInterval?: number | false;
}

export function useListInvitations(
    query?: Parameters<typeof listInvitations>[0],
    options?: UseListInvitationsOptions,
) {
    return useQuery({
        queryKey: qk.listInvitations(query),
        queryFn: () => listInvitations(query),
        refetchInterval: options?.refetchInterval,
    });
}
