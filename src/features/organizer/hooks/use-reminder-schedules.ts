import { useQuery } from '@tanstack/react-query';
import {
    deleteReminderSchedule,
    listReminderSchedules,
    upsertReminderSchedule,
    updateReminderSchedule,
} from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useReminderSchedules(eventId: string) {
    return useQuery({
        queryKey: qk.listReminderSchedules(eventId),
        queryFn: () => listReminderSchedules(eventId),
    });
}

export function useUpsertReminderSchedule() {
    return useApiMutation(
        (body: Parameters<typeof upsertReminderSchedule>[0]) =>
            upsertReminderSchedule(body),
        [qk.listReminderSchedulesPrefix()],
        'Reminder schedule saved',
    );
}

export function useDeleteReminderSchedule() {
    return useApiMutation(
        (id: Parameters<typeof deleteReminderSchedule>[0]) =>
            deleteReminderSchedule(id),
        [qk.listReminderSchedulesPrefix()],
        'Reminder schedule deleted',
    );
}

export function useUpdateReminderSchedule() {
    return useApiMutation(
        ({ id, body }: { id: string; body: Parameters<typeof updateReminderSchedule>[1] }) =>
            updateReminderSchedule(id, body),
        [qk.listReminderSchedulesPrefix()],
        'Reminder schedule saved',
    );
}
