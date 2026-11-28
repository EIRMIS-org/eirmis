import { updateAttendee } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof updateAttendee>[0];
    body: Parameters<typeof updateAttendee>[1];
};

export function useUpdateAttendee() {
    return useApiMutation(
        ({ id, body }: Variables) => updateAttendee(id, body),
        [qk.listAttendeesPrefix()],
        'Attendee updated',
    );
}
