import { updateOrganizerProfile } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof updateOrganizerProfile>[0];
    body: Parameters<typeof updateOrganizerProfile>[1];
};

export function useUpdateOrganizerProfile() {
    return useApiMutation(
        ({ id, body }: Variables) => updateOrganizerProfile(id, body),
        [qk.getOrganizerProfile()],
        'Organizer profile updated',
    );
}
