import { AdminSubNav } from '@/features/admin/components/admin-sub-nav'
import { AuditLogTable } from '@/features/admin/components/audit-log-table'

export function AdminAuditLogPage() {
    return (
        <>
            <AdminSubNav />
            <AuditLogTable />
        </>
    )
}
