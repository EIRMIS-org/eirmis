import { decideHeadcountRequest } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof decideHeadcountRequest>[0];
    body: Parameters<typeof decideHeadcountRequest>[1];
};

export function useDecideHeadcountRequest() {
    return useApiMutation(
        ({ id, body }: Variables) => decideHeadcountRequest(id, body),
        [qk.listHeadcountRequestsPrefix(), qk.listInvitationsPrefix()],
        'Headcount decision saved',
    );
}
