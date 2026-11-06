import { submitHeadcountRequest } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useSubmitHeadcountRequest() {
    return useApiMutation(
        (body: Parameters<typeof submitHeadcountRequest>[0]) =>
            submitHeadcountRequest(body),
        [qk.listHeadcountRequestsPrefix(), qk.listInvitationsPrefix()],
        'Headcount request submitted',
    );
}
