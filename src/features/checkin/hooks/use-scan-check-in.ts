import { scanCheckIn } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useScanCheckIn() {
    return useApiMutation(
        (params: Parameters<typeof scanCheckIn>[0]) => scanCheckIn(params),
        [qk.listAttendeesPrefix(), qk.listInvitationsPrefix()],
    );
}
