import { updateOrganizerStatus } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof updateOrganizerStatus>[0];
    status: Parameters<typeof updateOrganizerStatus>[1];
};

export function useUpdateOrganizerStatus() {
    return useApiMutation(
        ({ id, status }: Variables) => updateOrganizerStatus(id, status),
        [qk.adminListOrganizersPrefix()],
        'Organizer status updated',
    );
}
