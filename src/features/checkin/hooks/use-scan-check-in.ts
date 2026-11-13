import { scanCheckIn } from '@/lib/api';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useScanCheckIn(eventId?: string) {
    return useApiMutation(
        (qrToken: string) => scanCheckIn(qrToken, eventId),
        [],
        'Check-in recorded',
    );
}
