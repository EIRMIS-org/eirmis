import { updateEvent } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type Variables = {
    id: Parameters<typeof updateEvent>[0];
    body: Parameters<typeof updateEvent>[1];
};

export function useUpdateEvent() {
    return useApiMutation(
        ({ id, body }: Variables) => updateEvent(id, body),
        [qk.listEventsPrefix()],
        'Event updated',
    );
}
