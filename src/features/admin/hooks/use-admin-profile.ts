import { useQuery } from '@tanstack/react-query';
import { getAdminProfile } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useAdminProfile() {
    return useQuery({
        queryKey: qk.getAdminProfile(),
        queryFn: getAdminProfile,
    });
}
