import { scanCheckIn } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export interface UseScanCheckInOptions {
    /**
     * Whether to display a global error toast on failed scans.
     * Defaults to `false` because scan rejections are rendered inline in
     * `ScanOutcomeDisplay` / session log (or form errors in `WalkInModal`).
     */
    showErrorToast?: boolean;
}

export function useScanCheckIn(options?: UseScanCheckInOptions) {
    return useApiMutation(
        (params: Parameters<typeof scanCheckIn>[0]) => scanCheckIn(params),
        [qk.listAttendeesPrefix(), qk.listInvitationsPrefix()],
        undefined,
        { showErrorToast: options?.showErrorToast ?? false },
    );
}
