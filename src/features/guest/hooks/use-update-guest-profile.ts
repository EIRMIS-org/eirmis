import { updateGuestProfile } from '@/lib/api';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof updateGuestProfile>[0];
    body: Parameters<typeof updateGuestProfile>[1];
};

export function useUpdateGuestProfile() {
    return useApiMutation(
        ({ id, body }: Variables) => updateGuestProfile(id, body),
        [],
        'Guest profile updated',
    );
}
