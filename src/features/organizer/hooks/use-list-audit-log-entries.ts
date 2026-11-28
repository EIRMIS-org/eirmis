import { useQuery } from '@tanstack/react-query';
import { listAuditLogEntries } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export const AUDIT_LOG_REFETCH_INTERVAL_MS = 30_000;

export function useListAuditLogEntries() {
    return useQuery({
        queryKey: qk.listAuditLogEntries(),
        queryFn: () => listAuditLogEntries(),
        refetchInterval: AUDIT_LOG_REFETCH_INTERVAL_MS,
    });
}
