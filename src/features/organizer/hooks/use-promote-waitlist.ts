import { promoteWaitlist } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function usePromoteWaitlist() {
    return useApiMutation(
        (body: Parameters<typeof promoteWaitlist>[0]) => promoteWaitlist(body),
        [qk.listInvitationsPrefix()],
        'Waitlist promoted',
    );
}
