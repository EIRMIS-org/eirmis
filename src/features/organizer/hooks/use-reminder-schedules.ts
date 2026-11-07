import { useQuery } from '@tanstack/react-query';
import {
    deleteReminderSchedule,
    listReminderSchedules,
    upsertReminderSchedule,
} from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useReminderSchedules(eventId: string) {
    return useQuery({
        queryKey: qk.listReminderSchedules(eventId),
        queryFn: () => listReminderSchedules(eventId),
    });
}

export const useListReminderSchedules = useReminderSchedules;

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
