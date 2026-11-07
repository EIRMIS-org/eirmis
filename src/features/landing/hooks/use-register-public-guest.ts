import { registerPublicGuest } from '@/lib/api';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useRegisterPublicGuest() {
    return useApiMutation(
        (body: Parameters<typeof registerPublicGuest>[0]) =>
            registerPublicGuest(body),
        [],
        'Registration submitted',
    );
}
