import { scanCheckIn } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useScanCheckIn() {
    return useApiMutation(
        (qrToken: Parameters<typeof scanCheckIn>[0]) => scanCheckIn(qrToken),
        [qk.listAttendeesPrefix(), qk.listInvitationsPrefix()],
        'Check-in recorded',
    );
}
