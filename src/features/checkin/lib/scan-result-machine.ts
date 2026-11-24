/**
 * src/features/checkin/lib/scan-result-machine.ts
 *
 * Task 09 — Check-in Staff Portal (Core Flows)
 *
 * Pure reducer state machine for scan outcomes.
 * STRICT REQUIREMENT: No React imports — pure function, easily unit-testable in Week 2.
 * Reference: contract/components/schemas/ScanCheckIn.yaml and plan/task-09-checkin-staff-portal/task.md
 */

import type { Attendee, ScanCheckInResponse } from '@/lib/api'

export type ScanStatus =
    | 'idle'
    | 'resolving'
    | 'success'
    | 'already-checked-in'
    | 'invalid-token'
    | 'wrong-event'
    | 'capacity-full'

export interface ScanResultData {
    status: ScanStatus
    attendee?: Attendee | null
    attendeeName?: string
    ticketCode?: string
    ticketTier?: string
    scannedAt?: string
    originalCheckInTime?: string
    expectedEvent?: string
    message?: string
}

export type ScanMachineAction =
    | { type: 'SCAN_START'; token: string }
    | { type: 'SCAN_RESOLVED_SUCCESS'; payload: ScanCheckInResponse }
    | { type: 'SCAN_RESOLVED_ALREADY_CHECKED_IN'; payload: ScanCheckInResponse }
    | { type: 'SCAN_FAILED_INVALID_TOKEN'; message?: string }
    | { type: 'SCAN_FAILED_WRONG_EVENT'; expectedEvent?: string; message?: string }
    | { type: 'SCAN_FAILED_CAPACITY_FULL'; message?: string }
    | { type: 'SCAN_RESET' }

export const initialScanState: ScanResultData = {
    status: 'idle',
}

/**
 * Pure reducer handling transitions between scanner states.
 */
export function scanResultReducer(
    state: ScanResultData,
    action: ScanMachineAction,
): ScanResultData {
    switch (action.type) {
        case 'SCAN_START':
            return {
                status: 'resolving',
                ticketCode: action.token,
            }

        case 'SCAN_RESOLVED_SUCCESS': {
            const { attendee, checked_in_at, message } = action.payload
            return {
                status: 'success',
                attendee,
                attendeeName: attendee?.full_name ?? 'Attendee',
                ticketCode: attendee?.qr_token ?? state.ticketCode ?? 'TICKET',
                ticketTier: attendee?.is_primary ? 'Primary Guest' : 'Guest',
                scannedAt: checked_in_at ? new Date(checked_in_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
                message: message ?? undefined,
            }
        }

        case 'SCAN_RESOLVED_ALREADY_CHECKED_IN': {
            const { attendee, checked_in_at, message } = action.payload
            return {
                status: 'already-checked-in',
                attendee,
                attendeeName: attendee?.full_name ?? 'Attendee',
                ticketCode: attendee?.qr_token ?? state.ticketCode ?? 'TICKET',
                ticketTier: attendee?.is_primary ? 'Primary Guest' : 'Guest',
                originalCheckInTime: checked_in_at ? new Date(checked_in_at).toLocaleTimeString() : undefined,
                message: message ?? 'This pass has already been checked in.',
            }
        }

        case 'SCAN_FAILED_INVALID_TOKEN':
            return {
                status: 'invalid-token',
                ticketCode: state.ticketCode,
                message: action.message ?? 'Token signature invalid or expired. Please rescan.',
            }

        case 'SCAN_FAILED_WRONG_EVENT':
            return {
                status: 'wrong-event',
                ticketCode: state.ticketCode,
                expectedEvent: action.expectedEvent ?? 'Assigned Event',
                message: action.message ?? 'This token belongs to a different event.',
            }

        case 'SCAN_FAILED_CAPACITY_FULL':
            return {
                status: 'capacity-full',
                ticketCode: state.ticketCode,
                message: action.message ?? 'Event has reached maximum capacity. Please verify manually.',
            }

        case 'SCAN_RESET':
            return initialScanState

        default:
            return state
    }
}

export type ScanLogOutcome = Exclude<ScanStatus, 'idle' | 'resolving'>

export interface ScanSessionLogEntry {
    id: string
    scannedAt: string
    subject: string
    ticketCode?: string
    outcome: ScanLogOutcome
    message?: string
}

export interface ScanSessionState {
    current: ScanResultData
    log: ScanSessionLogEntry[]
}

export type ScanSessionAction =
    | ScanMachineAction
    | { type: 'SESSION_LOG_APPEND'; entry: ScanSessionLogEntry }
    | { type: 'SESSION_LOG_CLEAR' }

export const initialScanSessionState: ScanSessionState = {
    current: initialScanState,
    log: [],
}

/** Upper bound on persisted session-log entries (B-03). Oldest entries are dropped. */
export const MAX_SCAN_SESSION_LOG_ENTRIES = 200

export function capScanSessionLog(
    log: readonly ScanSessionLogEntry[],
): ScanSessionLogEntry[] {
    return log.length > MAX_SCAN_SESSION_LOG_ENTRIES
        ? log.slice(0, MAX_SCAN_SESSION_LOG_ENTRIES)
        : [...log]
}

const TERMINAL_SCAN_OUTCOMES: ReadonlySet<ScanStatus> = new Set<ScanLogOutcome>([
    'success',
    'already-checked-in',
    'invalid-token',
    'wrong-event',
    'capacity-full',
])

export function isScanLogOutcome(status: ScanStatus): status is ScanLogOutcome {
    return TERMINAL_SCAN_OUTCOMES.has(status)
}

function generateLogEntryId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createScanLogEntry(
    result: ScanResultData,
    id?: string,
): ScanSessionLogEntry | null {
    if (!isScanLogOutcome(result.status)) {
        return null
    }

    const subject =
        result.attendeeName?.trim() ||
        result.ticketCode?.trim() ||
        'Unknown token'

    return {
        id: id ?? generateLogEntryId(),
        scannedAt: result.scannedAt || new Date().toLocaleTimeString(),
        subject,
        ticketCode: result.ticketCode,
        outcome: result.status,
        message: result.message,
    }
}

/**
 * Pure additive session reducer combining the untouched scanResultReducer
 * with a most-recent-first session log of resolved scan outcomes.
 */
export function scanSessionReducer(
    state: ScanSessionState,
    action: ScanSessionAction,
): ScanSessionState {
    if (action.type === 'SESSION_LOG_CLEAR') {
        return {
            ...state,
            log: [],
        }
    }

    if (action.type === 'SESSION_LOG_APPEND') {
        return {
            ...state,
            log: capScanSessionLog([action.entry, ...state.log]),
        }
    }

    const nextCurrent = scanResultReducer(state.current, action)
    const entry = createScanLogEntry(nextCurrent)

    if (!entry) {
        return {
            ...state,
            current: nextCurrent,
        }
    }

    return {
        current: nextCurrent,
        log: capScanSessionLog([entry, ...state.log]),
    }
}

export function countScanSessionLog(
    log: readonly ScanSessionLogEntry[],
): { ok: number; total: number } {
    let ok = 0
    for (const entry of log) {
        if (entry.outcome === 'success') {
            ok += 1
        }
    }
    return { ok, total: log.length }
}

