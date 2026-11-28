import { useQuery } from '@tanstack/react-query';
import { listCheckInAssignments } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListCheckInAssignments(eventId: string) {
    return useQuery({
        queryKey: qk.listCheckInAssignments(eventId),
        queryFn: () => listCheckInAssignments(eventId),
    });
}
