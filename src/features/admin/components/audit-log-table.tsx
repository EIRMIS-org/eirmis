import { useMemo, useState } from 'react'
import { Download, ScrollText, Search, X } from 'lucide-react'
import { useListAuditLogEntries } from '@/features/organizer/hooks/use-list-audit-log-entries'
import { downloadCSV } from '@/lib/csv-export'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

type AuditEntry = NonNullable<ReturnType<typeof useListAuditLogEntries>['data']>[number]
type ActorType = AuditEntry['actor_type']

const ACTOR_LABELS: Record<ActorType, string> = {
    admin: 'Admin',
    organizer: 'Organizer',
    guest: 'Guest',
    check_in_staff: 'Check-in staff',
    system: 'System',
}

const ACTOR_VARIANTS: Record<
    ActorType,
    'default' | 'secondary' | 'outline' | 'info' | 'warning'
> = {
    admin: 'default',
    organizer: 'info',
    guest: 'secondary',
    check_in_staff: 'warning',
    system: 'outline',
}

function formatDateTime(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function shortenId(id: string): string {
    return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

function formatValueDiff(
    oldValue: Record<string, unknown> | null | undefined,
    newValue: Record<string, unknown> | null | undefined,
): string | null {
    const keys = Array.from(
        new Set([
            ...Object.keys(oldValue ?? {}),
            ...Object.keys(newValue ?? {}),
        ]),
    )
    if (keys.length === 0) return null

    const parts = keys.map((key) => {
        const before = oldValue?.[key]
        const after = newValue?.[key]
        if (before !== undefined && after !== undefined) {
            return `${key}: ${String(before)} → ${String(after)}`
        }
        if (after !== undefined) {
            return `${key}: ${String(after)}`
        }
        return `${key}: ${String(before)}`
    })

    return parts.join(', ')
}

function buildEntrySummary(entry: AuditEntry): string {
    const diff = formatValueDiff(entry.old_value, entry.new_value)
    if (entry.reason && diff) return `${entry.reason} · ${diff}`
    if (entry.reason) return entry.reason
    if (diff) return diff
    return '—'
}

const AUDIT_CSV_HEADERS = [
    'Timestamp',
    'Actor Type',
    'Actor ID',
    'Action',
    'Entity Type',
    'Entity ID',
    'Summary',
    'Reason',
] as const

export function AuditLogTable() {
    const [filterText, setFilterText] = useState('')
    const auditQuery = useListAuditLogEntries()

    const sortedEntries = useMemo(() => {
        const list = auditQuery.data ?? []
        return [...list].sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
    }, [auditQuery.data])

    const normalizedQuery = filterText.trim().toLowerCase()

    const filteredEntries = useMemo(() => {
        if (!normalizedQuery) return sortedEntries
        return sortedEntries.filter((entry) => {
            const haystack = [
                entry.actor_type,
                ACTOR_LABELS[entry.actor_type],
                entry.actor_id ?? '',
                entry.action,
                entry.entity_type,
                entry.entity_id,
                buildEntrySummary(entry),
            ]
                .join(' ')
                .toLowerCase()
            return haystack.includes(normalizedQuery)
        })
    }, [sortedEntries, normalizedQuery])

    function handleExportCsv() {
        if (filteredEntries.length === 0) return
        const rows = filteredEntries.map((entry) => [
            entry.created_at,
            ACTOR_LABELS[entry.actor_type],
            entry.actor_id ?? '',
            entry.action,
            entry.entity_type,
            entry.entity_id,
            buildEntrySummary(entry),
            entry.reason ?? '',
        ])
        // downloadCSV automatically appends -YYYY-MM-DD.csv
        downloadCSV('eirmis-audit-log', AUDIT_CSV_HEADERS, rows)
    }

    return (
        <main id="main-content" className="flex-1">
            <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <ScrollText className="size-4" aria-hidden="true" />
                            Immutable audit trail
                        </div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                            Audit log
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Read-only chronological record of administrative and platform
                            state changes.
                        </p>
                    </div>
                    {!auditQuery.isPending && !auditQuery.isError && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                            {normalizedQuery
                                ? `Showing ${filteredEntries.length} of ${sortedEntries.length} entries`
                                : `${sortedEntries.length} ${sortedEntries.length === 1 ? 'entry' : 'entries'}`}
                        </div>
                    )}
                </div>

                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full max-w-md">
                        <Search
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            value={filterText}
                            onChange={(event) => setFilterText(event.target.value)}
                            aria-label="Filter audit log by actor or action"
                            placeholder="Filter by actor, action, target, or summary…"
                            className="pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {filterText && (
                            <button
                                type="button"
                                onClick={() => setFilterText('')}
                                aria-label="Clear audit log filter"
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <X className="size-3.5" aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    {/* Kept disabled (rather than hidden) when loading, errored, or empty to avoid toolbar layout shift. */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportCsv}
                        disabled={
                            auditQuery.isPending ||
                            auditQuery.isError ||
                            filteredEntries.length === 0
                        }
                    >
                        <Download data-icon="inline-start" aria-hidden="true" />
                        Export CSV
                    </Button>
                </div>

                {auditQuery.isPending ? (
                    <section
                        aria-label="Loading audit log entries"
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    >
                        <div className="grid grid-cols-5 gap-4 border-b border-border px-5 py-4">
                            {[1, 2, 3, 4, 5].map((col) => (
                                <Skeleton key={col} className="h-4 w-24" />
                            ))}
                        </div>
                        {[1, 2, 3, 4].map((row) => (
                            <div
                                key={row}
                                className="grid grid-cols-5 gap-4 border-b border-border px-5 py-5 last:border-0"
                            >
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 w-44" />
                            </div>
                        ))}
                    </section>
                ) : auditQuery.isError ? (
                    <section
                        role="alert"
                        className="rounded-2xl border border-error-border bg-error-bg p-6"
                    >
                        <h2 className="font-heading text-lg font-semibold text-error">
                            Audit log entries could not be loaded
                        </h2>
                        <p className="mt-1 text-sm text-error">
                            {auditQuery.error instanceof Error
                                ? auditQuery.error.message
                                : 'Please try again.'}
                        </p>
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => void auditQuery.refetch()}
                            disabled={auditQuery.isFetching}
                        >
                            {auditQuery.isFetching ? 'Retrying…' : 'Retry'}
                        </Button>
                    </section>
                ) : sortedEntries.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
                            <ScrollText aria-hidden="true" className="size-6" />
                        </div>
                        <h2 className="font-heading text-xl font-semibold text-foreground">
                            No audit log entries yet
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                            Administrative verification decisions and audited platform
                            actions will appear here once recorded.
                        </p>
                    </section>
                ) : filteredEntries.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                        <h2 className="font-heading text-lg font-semibold text-foreground">
                            No matching audit entries
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                            No audit log entries matched &ldquo;{filterText.trim()}&rdquo;.
                        </p>
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => setFilterText('')}
                        >
                            Clear filter
                        </Button>
                    </section>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Actor</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Summary</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEntries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-muted-foreground">
                                            <time dateTime={entry.created_at}>
                                                {formatDateTime(entry.created_at)}
                                            </time>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    size="sm"
                                                    variant={ACTOR_VARIANTS[entry.actor_type]}
                                                >
                                                    {ACTOR_LABELS[entry.actor_type]}
                                                </Badge>
                                                {entry.actor_id ? (
                                                    <span
                                                        title={entry.actor_id}
                                                        className="font-mono text-xs text-muted-foreground"
                                                    >
                                                        {shortenId(entry.actor_id)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                                                {entry.action}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">
                                                    {entry.entity_type}
                                                </span>
                                                <span
                                                    title={entry.entity_id}
                                                    className="font-mono text-xs text-muted-foreground"
                                                >
                                                    {shortenId(entry.entity_id)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                                            {buildEntrySummary(entry)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>
        </main>
    )
}
