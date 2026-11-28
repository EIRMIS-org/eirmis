import {
    addInvitationImage,
    deleteInvitationImage,
    updateInvitationImage,
} from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

type UpdateVariables = {
    id: Parameters<typeof updateInvitationImage>[0];
    body: Parameters<typeof updateInvitationImage>[1];
};

export function useAddInvitationImage() {
    return useApiMutation(
        (body: Parameters<typeof addInvitationImage>[0]) =>
            addInvitationImage(body),
        [qk.listInvitationImagesPrefix()],
        'Invitation image added',
    );
}

export function useUpdateInvitationImage() {
    return useApiMutation(
        ({ id, body }: UpdateVariables) => updateInvitationImage(id, body),
        [qk.listInvitationImagesPrefix()],
        'Invitation image updated',
    );
}

export function useDeleteInvitationImage() {
    return useApiMutation(
        (id: Parameters<typeof deleteInvitationImage>[0]) =>
            deleteInvitationImage(id),
        [qk.listInvitationImagesPrefix()],
        'Invitation image deleted',
    );
}
