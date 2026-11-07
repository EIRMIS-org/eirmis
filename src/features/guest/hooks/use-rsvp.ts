import { updateInvitation } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof updateInvitation>[0];
    body: Parameters<typeof updateInvitation>[1];
};

export function useRsvp() {
    return useApiMutation(
        ({ id, body }: Variables) => updateInvitation(id, body),
        [qk.listInvitationsPrefix()],
        'RSVP updated',
    );
}
