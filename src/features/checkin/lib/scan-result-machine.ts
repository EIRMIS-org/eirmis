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

