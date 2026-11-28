import { createInvitation } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useCreateInvitation() {
    return useApiMutation(
        (body: Parameters<typeof createInvitation>[0]) => createInvitation(body),
        [qk.listInvitationsPrefix()],
        'Invitation created',
    );
}
