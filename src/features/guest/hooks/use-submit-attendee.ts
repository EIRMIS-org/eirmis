import { submitAttendee } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useSubmitAttendee() {
    return useApiMutation(
        (body: Parameters<typeof submitAttendee>[0]) => submitAttendee(body),
        [qk.listAttendeesPrefix(), qk.listInvitationsPrefix()],
        'Attendee submitted',
    );
}
