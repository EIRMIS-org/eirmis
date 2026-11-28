import { uploadInvitationHtml } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    eventId: Parameters<typeof uploadInvitationHtml>[0];
    file: Parameters<typeof uploadInvitationHtml>[1];
};

export function useUploadInvitationHtml() {
    return useApiMutation(
        ({ eventId, file }: Variables) => uploadInvitationHtml(eventId, file),
        [qk.getInvitationDesignPrefix()],
        'Invitation HTML uploaded',
    );
}
