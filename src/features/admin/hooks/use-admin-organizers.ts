import { useQuery } from '@tanstack/react-query';
import { getAdminOrganizers } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useAdminOrganizers(page = 0, status = 'eq.pending') {
    return useQuery({
        queryKey: qk.adminListOrganizers(page, status),
        queryFn: () => getAdminOrganizers(page, status),
    });
}
