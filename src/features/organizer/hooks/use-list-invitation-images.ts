import { useQuery } from '@tanstack/react-query';
import { listInvitationImages } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListInvitationImages(
    eventId: Parameters<typeof listInvitationImages>[0],
    options?: Parameters<typeof listInvitationImages>[1],
) {
    return useQuery({
        queryKey: qk.listInvitationImages(eventId, options),
        queryFn: () => listInvitationImages(eventId, options),
    });
}
