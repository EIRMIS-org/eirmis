import { useQuery } from '@tanstack/react-query';
import { getAssignedEvent } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useAssignedEvent(eventId: string) {
    return useQuery({
        queryKey: qk.getAssignedEvent(eventId),
        queryFn: () => getAssignedEvent(eventId),
    });
}
