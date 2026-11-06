import { scanCheckIn } from '@/lib/api';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useScanCheckIn() {
    return useApiMutation(
        (qrToken: Parameters<typeof scanCheckIn>[0]) => scanCheckIn(qrToken),
        [],
        'Check-in recorded',
    );
}
