import { createEvent } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useCreateEvent() {
    return useApiMutation(
        (body: Parameters<typeof createEvent>[0]) => createEvent(body),
        [qk.listEventsPrefix()],
        'Event created',
    );
}
