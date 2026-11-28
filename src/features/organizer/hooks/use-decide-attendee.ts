import { decideAttendee } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type AttendeeDecisionBody = Parameters<typeof decideAttendee>[1];

export type DecideAttendeeBody = Omit<
    AttendeeDecisionBody,
    'override_capacity'
> & {
    override_capacity?: boolean;
};

type Variables = {
    id: Parameters<typeof decideAttendee>[0];
    body: DecideAttendeeBody;
};

export function useDecideAttendee() {
    return useApiMutation(
        ({ id, body }: Variables) =>
            decideAttendee(id, {
                ...body,
                override_capacity: body.override_capacity ?? false,
            }),
        [qk.listAttendeesPrefix(), qk.listInvitationsPrefix()],
        'Attendee decision saved',
    );
}
