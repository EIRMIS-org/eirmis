import { useQuery } from '@tanstack/react-query';
import { listAuditLogEntries } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListAuditLogEntries() {
    return useQuery({
        queryKey: qk.listAuditLogEntries(),
        queryFn: listAuditLogEntries,
    });
}
