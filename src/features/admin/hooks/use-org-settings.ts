import { useQuery } from '@tanstack/react-query';
import { getOrgSettings, updateOrgSettings } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';
import { useApiMutation } from '@/lib/api/use-api-mutation';

export function useOrgSettings() {
    return useQuery({
        queryKey: qk.getOrgSettings(),
        queryFn: getOrgSettings,
    });
}

export function useUpdateOrgSettings() {
    return useApiMutation(
        (body: Parameters<typeof updateOrgSettings>[0]) =>
            updateOrgSettings(body),
        [qk.getOrgSettingsPrefix()],
        'Organization settings updated',
    );
}
