/**
 * src/features/checkin/components/scan-outcome-display.tsx
 *
 * Task 09 — Check-in Staff Portal
 *
 * Bridges the scan-result-machine state to the domain ScanResult UI component.
 * Maps the 5 state machine outcomes to the visual contract:
 * - success → approved (green)
 * - already-checked-in → duplicate (amber)
 * - invalid-token → rejected (red)
 * - wrong-event → warning/rejected (red/amber)
 * - capacity-full → rejected (red) with manual search action
 */

import { ScanResult, type ScanStatus as DomainScanStatus } from '@/components/eirmis/scan-result'
import type { ScanResultData } from '../lib/scan-result-machine'

interface ScanOutcomeDisplayProps {
    data: ScanResultData
    onReset: () => void
    onManualSearch?: () => void
}

export function ScanOutcomeDisplay({
    data,
    onReset,
    onManualSearch,
}: ScanOutcomeDisplayProps) {
    if (data.status === 'idle') {
        return null
    }

    if (data.status === 'resolving') {
        return (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm font-medium text-foreground">
                    Calling POST /functions/v1/checkin/scan...
                </span>
            </div>
        )
    }

    let status: DomainScanStatus = 'approved'
    let title: string | undefined
    let subtitle: string | undefined
    let notes: string | undefined

    switch (data.status) {
        case 'success':
            status = 'approved'
            title = 'Check-in Verified'
            subtitle = data.message || 'Credential verified & recorded successfully'
            break

        case 'already-checked-in':
            status = 'duplicate'
            title = 'Duplicate Scan Detected'
            subtitle = data.message || `Already checked in at ${data.originalCheckInTime || 'an earlier gate'}`
            break

        case 'invalid-token':
            status = 'rejected'
            title = 'Invalid Token Signature'
            subtitle = data.message || 'Token not recognized or cryptographic signature invalid'
            break

        case 'wrong-event':
            status = 'warning'
            title = 'Wrong Event Assignment'
            subtitle = data.message || `Token belongs to ${data.expectedEvent || 'another event'}`
            break

        case 'capacity-full':
            status = 'rejected'
            title = 'Capacity Limit Reached'
            subtitle = data.message || 'Event maximum capacity has been reached.'
            notes = 'Override requires organizer approval or manual check-in verification.'
            break
    }

    return (
        <div className="space-y-2">
            <ScanResult
                status={status}
                title={title}
                subtitle={subtitle}
                attendeeName={data.attendeeName || 'Unknown Attendee'}
                ticketCode={data.ticketCode || 'TOKEN-N/A'}
                ticketTier={data.ticketTier || 'General'}
                scannedAt={data.scannedAt || 'Just now'}
                notes={notes}
                onNextScan={onReset}
                onOverride={onManualSearch}
            />
        </div>
    )
}

