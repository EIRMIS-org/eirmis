import { useQuery } from '@tanstack/react-query';
import {
    createInvitationDesign,
    listInvitationDesigns,
} from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useInvitationDesign(eventId: string) {
    return useQuery({
        queryKey: qk.getInvitationDesign(eventId),
        queryFn: () => listInvitationDesigns(eventId),
    });
}

export const useGetInvitationDesign = useInvitationDesign;
export const useListInvitationDesign = useInvitationDesign;

export function useCreateInvitationDesign() {
    return useApiMutation(
        (body: Parameters<typeof createInvitationDesign>[0]) =>
            createInvitationDesign(body),
        [qk.getInvitationDesignPrefix()],
        'Invitation design saved',
    );
}
