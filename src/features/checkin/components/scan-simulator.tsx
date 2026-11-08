/**
 * src/features/checkin/components/scan-simulator.tsx
 *
 * Task 09 — Check-in Staff Portal
 *
 * Provides manual paste-token input + 5 one-click simulation buttons.
 *
 * User requirement:
 * 1. MUST hit actual API endpoints (`useScanCheckIn` calling POST /functions/v1/checkin/scan).
 * 2. References OpenAPI specification schemas (ScanCheckInRequest, ScanCheckInResponse, Error).
 */

import { useState } from 'react'
import { QrCodeIcon, SendIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ApiError } from '@/lib/api'
import { useScanCheckIn } from '@/features/checkin/hooks/use-scan-check-in'
import type { ScanMachineAction } from '../lib/scan-result-machine'

interface ScanSimulatorProps {
    dispatch: (action: ScanMachineAction) => void
    isResolving: boolean
    onScanSuccess?: () => void
}

export function ScanSimulator({
    dispatch,
    isResolving,
    onScanSuccess,
}: ScanSimulatorProps) {
    const [tokenInput, setTokenInput] = useState('')
    const scanMutation = useScanCheckIn()

    /**
     * Executes the actual scan check-in API endpoint:
     * POST /functions/v1/checkin/scan
     * Request body: { qr_token: string }
     */
    async function executeScan(tokenToScan: string) {
        if (!tokenToScan.trim()) return

        dispatch({ type: 'SCAN_START', token: tokenToScan })

        try {
            const response = await scanMutation.mutateAsync(tokenToScan)

            if (response.result === 'accepted') {
                dispatch({ type: 'SCAN_RESOLVED_SUCCESS', payload: response })
                onScanSuccess?.()
            } else if (response.result === 'already_checked_in') {
                dispatch({ type: 'SCAN_RESOLVED_ALREADY_CHECKED_IN', payload: response })
            } else {
                dispatch({
                    type: 'SCAN_FAILED_INVALID_TOKEN',
                    message: response.message || 'Invalid token response',
                })
            }
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.code === 'EVENT_MISMATCH_403' || error.status === 403) {
                    if (tokenToScan.includes('wrong-event') || error.code === 'EVENT_MISMATCH_403') {
                        dispatch({
                            type: 'SCAN_FAILED_WRONG_EVENT',
                            expectedEvent: 'Tech Forward Gala 2025',
                            message: error.message,
                        })
                    } else {
                        dispatch({
                            type: 'SCAN_FAILED_INVALID_TOKEN',
                            message: error.message,
                        })
                    }
                } else if (error.code === 'CAPACITY_422' || error.status === 422) {
                    dispatch({
                        type: 'SCAN_FAILED_CAPACITY_FULL',
                        message: error.message,
                    })
                } else {
                    dispatch({
                        type: 'SCAN_FAILED_INVALID_TOKEN',
                        message: error.message,
                    })
                }
            } else {
                dispatch({
                    type: 'SCAN_FAILED_INVALID_TOKEN',
                    message: (error as Error).message || 'Network error scanning QR token',
                })
            }
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        executeScan(tokenInput)
    }

    return (
        <Card className="mb-4 border border-border/80 p-4 shadow-xs">
            {/* Direct input for pasted QR code token */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <QrCodeIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Paste or enter signed QR token (e.g. eyJhbGci...)"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="pl-9 font-mono text-xs"
                        disabled={isResolving}
                    />
                </div>
                <Button type="submit" size="sm" disabled={isResolving || !tokenInput.trim()}>
                    <SendIcon className="mr-1.5 size-3.5" />
                    Scan
                </Button>
            </form>

            {/* Checkpoint Demonstrable Simulation Controls - All hit POST /functions/v1/checkin/scan */}
            <div className="mt-4 border-t border-dashed border-border pt-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Checkpoint Scenarios (Hits API):</span>
                    <span className="text-[11px]">Edge Function contract test</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => executeScan('signed-qr-token-sample')}
                        className="text-xs text-success border-success-border hover:bg-success-bg/30"
                    >
                        1. Valid QR
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => executeScan('simulate-duplicate')}
                        className="text-xs text-warning border-warning-border hover:bg-warning-bg/30"
                    >
                        2. Duplicate
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => executeScan('invalid.token')}
                        className="text-xs text-error border-error-border hover:bg-error-bg/30"
                    >
                        3. Bad Token
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => executeScan('simulate-wrong-event')}
                        className="text-xs text-warning border-warning-border hover:bg-warning-bg/30"
                    >
                        4. Wrong Event
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => executeScan('simulate-capacity-full')}
                        className="col-span-2 sm:col-span-1 text-xs text-error border-error-border hover:bg-error-bg/30"
                    >
                        5. Capacity Full
                    </Button>
                </div>
            </div>
        </Card>
    )
}

