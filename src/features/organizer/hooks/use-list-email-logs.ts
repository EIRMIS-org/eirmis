import { useQuery } from '@tanstack/react-query';
import { listEmailLogs } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export const ACTIVITY_REFETCH_INTERVAL_MS = 30_000;

export function useListEmailLogs(eventId: string) {
    return useQuery({
        queryKey: qk.listEmailLogs(eventId),
        queryFn: () => listEmailLogs(eventId),
        refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
    });
}
