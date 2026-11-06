import { dispatchQrBundle } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useDispatchQrBundle() {
    return useApiMutation(
        (body: Parameters<typeof dispatchQrBundle>[0]) =>
            dispatchQrBundle(body),
        [qk.listInvitationsPrefix()],
        'QR bundle dispatched',
    );
}
