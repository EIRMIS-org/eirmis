import {
    createCheckInAssignment,
    deleteCheckInAssignment,
    updateCheckInAssignment,
} from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type UpdateVariables = {
    id: Parameters<typeof updateCheckInAssignment>[0];
    body: Parameters<typeof updateCheckInAssignment>[1];
};

export function useCreateCheckInAssignment() {
    return useApiMutation(
        (body: Parameters<typeof createCheckInAssignment>[0]) =>
            createCheckInAssignment(body),
        [qk.listCheckInAssignmentsPrefix()],
        'Check-in assignment created',
    );
}

export function useUpdateCheckInAssignment() {
    return useApiMutation(
        ({ id, body }: UpdateVariables) => updateCheckInAssignment(id, body),
        [qk.listCheckInAssignmentsPrefix()],
        'Check-in assignment updated',
    );
}

export function useDeleteCheckInAssignment() {
    return useApiMutation(
        (id: Parameters<typeof deleteCheckInAssignment>[0]) =>
            deleteCheckInAssignment(id),
        [qk.listCheckInAssignmentsPrefix()],
        'Check-in assignment deleted',
    );
}
