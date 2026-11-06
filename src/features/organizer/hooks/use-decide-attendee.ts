import { decideAttendee } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof decideAttendee>[0];
    body: Parameters<typeof decideAttendee>[1];
};

export function useDecideAttendee() {
    return useApiMutation(
        ({ id, body }: Variables) => decideAttendee(id, body),
        [qk.listAttendeesPrefix(), qk.listInvitationsPrefix()],
        'Attendee decision saved',
    );
}
