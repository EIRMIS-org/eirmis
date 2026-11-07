import { useQuery } from '@tanstack/react-query';
import { listEmailLogs } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListEmailLogs(eventId: string) {
    return useQuery({
        queryKey: qk.listEmailLogs(eventId),
        queryFn: () => listEmailLogs(eventId),
    });
}
