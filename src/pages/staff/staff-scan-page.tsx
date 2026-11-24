/**
 * src/pages/staff/staff-scan-page.tsx
 *
 * Task 09 — Check-in Staff Portal (Index Route: /staff)
 *
 * Scoped scanning screen:
 * 1. Assigned event derived from `checkin_assignments` via `useMyAssignment`
 *    (handles zero, one, or many active assignments).
 * 2. Read-only attendance summary panel (expected vs. checked-in vs. capacity).
 * 3. Scan-result state machine + capped session scan log (persisted in sessionStorage).
 */

import { useEffect, useReducer } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircleIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AssignedEventHeader } from '@/features/checkin/components/assigned-event-header'
import { AssignmentPicker } from '@/features/checkin/components/assignment-picker'
import { AttendanceSummary } from '@/features/checkin/components/attendance-summary'
import { ScanOutcomeDisplay } from '@/features/checkin/components/scan-outcome-display'
import { ScanSessionLog } from '@/features/checkin/components/scan-session-log'
import { ScanSimulator } from '@/features/checkin/components/scan-simulator'
import { useAssignedEvent } from '@/features/checkin/hooks/use-assigned-event'
import { useAttendanceSummary } from '@/features/checkin/hooks/use-attendance-summary'
import { useMyAssignment } from '@/features/checkin/hooks/use-my-assignment'
import {
    capScanSessionLog,
    initialScanSessionState,
    isScanLogOutcome,
    scanSessionReducer,
    type ScanSessionLogEntry,
    type ScanSessionState,
} from '@/features/checkin/lib/scan-result-machine'

function getSessionLogStorageKey(eventId: string): string {
    return `eirmis:staff-scan-log:${eventId}`
}

function isValidLogEntry(value: unknown): value is ScanSessionLogEntry {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Record<string, unknown>
    return (
        typeof candidate.id === 'string' &&
        typeof candidate.scannedAt === 'string' &&
        typeof candidate.subject === 'string' &&
        typeof candidate.outcome === 'string' &&
        isScanLogOutcome(candidate.outcome as ScanSessionLogEntry['outcome'])
    )
}

function loadInitialScanSessionState(storageKey: string): ScanSessionState {
    if (typeof window === 'undefined') {
        return initialScanSessionState
    }

    try {
        const raw = window.sessionStorage.getItem(storageKey)
        if (!raw) return initialScanSessionState
        const parsed: unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) return initialScanSessionState
        return {
            ...initialScanSessionState,
            log: capScanSessionLog(parsed.filter(isValidLogEntry)),
        }
    } catch {
        return initialScanSessionState
    }
}

function ScanWorkspace({ eventId }: { eventId: string }) {
    const navigate = useNavigate()
    const storageKey = getSessionLogStorageKey(eventId)
    const [sessionState, dispatch] = useReducer(
        scanSessionReducer,
        storageKey,
        loadInitialScanSessionState,
    )

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            window.sessionStorage.setItem(
                storageKey,
                JSON.stringify(sessionState.log),
            )
        } catch {
            // Ignore storage quota or private-mode restrictions.
        }
    }, [sessionState.log, storageKey])

    return (
        <>
            {/* Viewfinder visual */}
            <Card className="mb-4 overflow-hidden border-border bg-slate-950 p-6 text-white shadow-card">
                <CardContent className="flex flex-col items-center justify-center p-0 py-4">
                    <div className="relative flex size-36 items-center justify-center rounded-xl border-2 border-dashed border-sky-400/80 bg-slate-900/60">
                        <div className="size-16 rounded-lg border border-sky-500/40" />
                        <span className="absolute -bottom-6 font-mono text-[11px] text-slate-400">
                            {sessionState.current.status === 'resolving'
                                ? 'Verifying ticket…'
                                : 'Reticle active'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Token input + dev-only presets */}
            <ScanSimulator
                dispatch={dispatch}
                isResolving={sessionState.current.status === 'resolving'}
            />

            {/* Scan-result state machine UI */}
            <ScanOutcomeDisplay
                data={sessionState.current}
                onReset={() => dispatch({ type: 'SCAN_RESET' })}
                onManualSearch={() => {
                    navigate('/staff/search')
                }}
            />

            {/* Running session scan log */}
            <ScanSessionLog
                entries={sessionState.log}
                onClear={() => dispatch({ type: 'SESSION_LOG_CLEAR' })}
            />
        </>
    )
}

export function StaffScanPage() {
    const assignment = useMyAssignment()
    const activeEventId =
        assignment.status === 'single'
            ? assignment.eventId
            : assignment.status === 'multiple'
              ? (assignment.eventId ?? undefined)
              : undefined

    const {
        data: assignedEvents,
        isLoading: isEventLoading,
        isError: isEventError,
    } = useAssignedEvent(activeEventId)
    const assignedEvent = assignedEvents?.[0]

    const attendance = useAttendanceSummary(assignedEvent?.id)

    const isLoading =
        assignment.status === 'loading' || (Boolean(activeEventId) && isEventLoading)
    const showNoAssignment =
        assignment.status === 'none' ||
        (Boolean(activeEventId) && !isEventLoading && (isEventError || !assignedEvent))
    const needsSelection =
        assignment.status === 'multiple' && assignment.eventId === null

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            {/* Header with Navigation to Manual Search (only when an assigned event is active) */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h1 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
                        Entrance Scanner
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Scan or paste an attendee QR token
                    </p>
                </div>
                {assignedEvent && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={<Link to="/staff/search" />}
                        >
                            <SearchIcon className="mr-1.5 size-3.5" aria-hidden="true" />
                            Manual Search
                        </Button>
                    </div>
                )}
            </div>

            {assignment.status === 'multiple' && (
                <AssignmentPicker
                    assignments={assignment.assignments}
                    selectedEventId={assignment.eventId}
                    onSelect={assignment.select}
                />
            )}

            {isLoading && (
                <div className="mb-4 space-y-3">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                </div>
            )}

            {needsSelection && (
                <Card role="status" className="border-border/80 p-6 shadow-xs">
                    <CardContent className="p-0 text-sm text-muted-foreground">
                        Choose an event above to start checking in attendees.
                    </CardContent>
                </Card>
            )}

            {!isLoading && showNoAssignment && (
                <Card
                    role="status"
                    className="border-warning-border bg-warning-bg/40 p-6 shadow-xs"
                >
                    <CardContent className="flex items-start gap-3 p-0">
                        <AlertCircleIcon
                            className="mt-0.5 size-5 shrink-0 text-warning"
                            aria-hidden="true"
                        />
                        <div className="space-y-1">
                            <h2 className="font-display text-base font-semibold text-foreground">
                                No assigned event
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                No check-in assignment found for your account — ask an organizer to
                                assign you to an event.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {assignedEvent && (
                <>
                    <AssignedEventHeader
                        eventId={assignedEvent.id}
                        checkedInCount={attendance.checkedIn}
                    />
                    <AttendanceSummary
                        eventId={assignedEvent.id}
                        capacity={assignedEvent.capacity}
                    />
                    <ScanWorkspace key={assignedEvent.id} eventId={assignedEvent.id} />
                </>
            )}
        </div>
    )
}

export default StaffScanPage
