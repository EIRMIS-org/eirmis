/**
 * src/pages/staff/staff-scan-page.tsx
 *
 * Task 09 — Check-in Staff Portal (Index Route: /staff)
 *
 * Scoped scanning screen satisfying Steps 1-3 plus check-in hardening:
 * 1. Assigned-event header via useAssignedEvent (with actionable empty-assignment guidance).
 * 2. Scan-result state machine + session scan log (persisted in sessionStorage).
 * 3. Wires useScanCheckIn → machine transitions; 5 simulate buttons that hit the API.
 */

import { useEffect, useMemo, useReducer } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircleIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AssignedEventHeader } from '@/features/checkin/components/assigned-event-header'
import { ScanOutcomeDisplay } from '@/features/checkin/components/scan-outcome-display'
import { ScanSessionLog } from '@/features/checkin/components/scan-session-log'
import { ScanSimulator } from '@/features/checkin/components/scan-simulator'
import { useAssignedEvent } from '@/features/checkin/hooks/use-assigned-event'
import {
    initialScanSessionState,
    isScanLogOutcome,
    scanSessionReducer,
    type ScanSessionLogEntry,
    type ScanSessionState,
} from '@/features/checkin/lib/scan-result-machine'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { useListInvitations } from '@/features/organizer/hooks/use-list-invitations'

const DEFAULT_EVENT_ID = '55555555-5555-5555-5555-555555555555'

export interface StaffScanPageProps {
    eventId?: string
}

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
            log: parsed.filter(isValidLogEntry),
        }
    } catch {
        return initialScanSessionState
    }
}

export function StaffScanPage({ eventId = DEFAULT_EVENT_ID }: StaffScanPageProps) {
    const navigate = useNavigate()
    const storageKey = getSessionLogStorageKey(eventId)
    const [sessionState, dispatch] = useReducer(
        scanSessionReducer,
        storageKey,
        loadInitialScanSessionState,
    )

    const {
        data: assignedEvents,
        isLoading: isAssignmentLoading,
        isError: isAssignmentError,
    } = useAssignedEvent(eventId)
    const assignedEvent = assignedEvents?.[0]

    const invitationsQuery = useListInvitations({ event_id: `eq.${assignedEvent?.id ?? eventId}` })
    const { data: attendees = [] } = useListAttendees()

    const checkedInCount = useMemo(() => {
        const invitationIds = new Set(
            (invitationsQuery.data ?? []).map((invitation) => invitation.id),
        )
        return attendees.filter(
            (attendee) =>
                attendee.checked_in && invitationIds.has(attendee.invitation_id),
        ).length
    }, [attendees, invitationsQuery.data])

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

    const hasAssignment = Boolean(assignedEvent)

    return (
        <div className="mx-auto max-w-2xl px-4 py-6">
            {/* Header with Navigation to Manual Search (only when assigned) */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h1 className="font-display text-xl font-bold text-foreground">
                        Entrance Scanner
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Scan attendee QR token or test checkpoint scenarios
                    </p>
                </div>
                {hasAssignment && (
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

            {isAssignmentLoading && (
                <AssignedEventHeader eventId={eventId} checkedInCount={0} />
            )}

            {!isAssignmentLoading && (isAssignmentError || !assignedEvent) && (
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
                    {/* Step 1: Assigned-event header */}
                    <AssignedEventHeader
                        eventId={assignedEvent.id}
                        checkedInCount={checkedInCount}
                    />

                    {/* Simulated Viewfinder Visual from Mockup Contract */}
                    <Card className="mb-4 overflow-hidden border-border bg-slate-950 p-6 text-white shadow-card">
                        <CardContent className="flex flex-col items-center justify-center p-0 py-4">
                            <div className="relative flex size-36 items-center justify-center rounded-xl border-2 border-dashed border-sky-400/80 bg-slate-900/60">
                                <div className="size-16 rounded-lg border border-sky-500/40" />
                                <span className="absolute -bottom-6 font-mono text-[11px] text-slate-400">
                                    {sessionState.current.status === 'resolving'
                                        ? 'Verifying payload...'
                                        : 'Reticle active'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 3: Wire useScanCheckIn → machine transitions; simulation buttons hitting API */}
                    <ScanSimulator
                        dispatch={dispatch}
                        isResolving={sessionState.current.status === 'resolving'}
                    />

                    {/* Step 2: Scan-result state machine UI states via scan-result.tsx */}
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
            )}
        </div>
    )
}
export default StaffScanPage
