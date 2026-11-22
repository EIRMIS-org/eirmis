import {
    AlertTriangleIcon,
    CheckCircle2Icon,
    ClockIcon,
    Trash2Icon,
    XCircleIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    countScanSessionLog,
    type ScanLogOutcome,
    type ScanSessionLogEntry,
} from '../lib/scan-result-machine'

export interface ScanSessionLogProps {
    entries: readonly ScanSessionLogEntry[]
    onClear: () => void
}

const OUTCOME_BADGE_META: Record<
    ScanLogOutcome,
    {
        label: string
        variant: 'success' | 'warning' | 'error'
        Icon: typeof CheckCircle2Icon
    }
> = {
    success: {
        label: 'Success',
        variant: 'success',
        Icon: CheckCircle2Icon,
    },
    'already-checked-in': {
        label: 'Already Checked In',
        variant: 'warning',
        Icon: ClockIcon,
    },
    'invalid-token': {
        label: 'Invalid',
        variant: 'error',
        Icon: XCircleIcon,
    },
    'wrong-event': {
        label: 'Wrong Event',
        variant: 'warning',
        Icon: AlertTriangleIcon,
    },
    'capacity-full': {
        label: 'Capacity Full',
        variant: 'error',
        Icon: XCircleIcon,
    },
}

export function ScanSessionLog({ entries, onClear }: ScanSessionLogProps) {
    const { ok, total } = countScanSessionLog(entries)

    return (
        <Card className="mt-4 border border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <div>
                    <CardTitle className="text-base">Session Scan Log</CardTitle>
                    <CardDescription>
                        {ok} OK / {total} total
                    </CardDescription>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClear}
                    disabled={entries.length === 0}
                >
                    <Trash2Icon className="mr-1.5 size-3.5" aria-hidden="true" />
                    Clear log
                </Button>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
                        No scans recorded in this session yet.
                    </p>
                ) : (
                    <ol
                        aria-label="Recent session scans"
                        className="divide-y divide-border/70 rounded-xl border border-border/80 bg-background"
                    >
                        {entries.map((entry) => {
                            const { label, variant, Icon } = OUTCOME_BADGE_META[entry.outcome]
                            const isRawToken =
                                Boolean(entry.ticketCode) && entry.subject === entry.ticketCode

                            return (
                                <li
                                    key={entry.id}
                                    className="flex flex-wrap items-center gap-3 px-3.5 py-2.5 text-xs sm:flex-nowrap"
                                >
                                    <time className="w-20 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                                        {entry.scannedAt}
                                    </time>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={
                                                isRawToken
                                                    ? 'truncate font-mono font-medium text-foreground'
                                                    : 'truncate font-medium text-foreground'
                                            }
                                        >
                                            {entry.subject}
                                        </p>
                                        {entry.ticketCode && !isRawToken && (
                                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                                                {entry.ticketCode}
                                            </p>
                                        )}
                                    </div>
                                    <Badge variant={variant} size="sm" className="ml-auto shrink-0">
                                        <Icon className="size-3" aria-hidden="true" />
                                        {label}
                                    </Badge>
                                </li>
                            )
                        })}
                    </ol>
                )}
            </CardContent>
        </Card>
    )
}
