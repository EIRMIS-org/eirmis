/**
 * src/pages/staff/staff-scan-page.tsx
 *
 * Task 09 — Check-in Staff Portal (Index Route: /staff)
 *
 * Scoped scanning screen satisfying Steps 1-3:
 * 1. Assigned-event header via useAssignedEvent (shows event name, date, venue).
 * 2. Scan-result state machine as pure reducer with 5 outcome cards via ScanResult.
 * 3. Wires useScanCheckIn → machine transitions; 5 simulate buttons that hit the API.
 */

import { useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AssignedEventHeader } from '@/features/checkin/components/assigned-event-header'
import { ScanSimulator } from '@/features/checkin/components/scan-simulator'
import { ScanOutcomeDisplay } from '@/features/checkin/components/scan-outcome-display'
import {
    initialScanState,
    scanResultReducer,
} from '@/features/checkin/lib/scan-result-machine'

export function StaffScanPage() {
    const [scanState, dispatch] = useReducer(scanResultReducer, initialScanState)
    const [liveCheckedIn, setLiveCheckedIn] = useState(0)

    const handleSuccess = () => {
        setLiveCheckedIn((prev) => prev + 1)
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6">
            {/* Header with Navigation to Manual Search */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="font-display text-xl font-bold text-foreground">
                        Entrance Scanner
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Scan attendee QR token or test checkpoint scenarios
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" render={<Link to="/staff/search" />}>
                        <SearchIcon className="mr-1.5 size-3.5" />
                        Manual Search
                    </Button>
                </div>
            </div>

            {/* Step 1: Assigned-event header */}
            <AssignedEventHeader checkedInCount={liveCheckedIn} />

            {/* Simulated Viewfinder Visual from Mockup Contract */}
            <Card className="mb-4 overflow-hidden border-border bg-slate-950 p-6 text-white shadow-card">
                <CardContent className="flex flex-col items-center justify-center p-0 py-4">
                    <div className="relative flex size-36 items-center justify-center rounded-xl border-2 border-dashed border-sky-400/80 bg-slate-900/60">
                        <div className="size-16 rounded-lg border border-sky-500/40" />
                        <span className="absolute -bottom-6 font-mono text-[11px] text-slate-400">
                            {scanState.status === 'resolving' ? 'Verifying payload...' : 'Reticle active'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Step 3: Wire useScanCheckIn → machine transitions; simulation buttons hitting API */}
            <ScanSimulator
                dispatch={dispatch}
                isResolving={scanState.status === 'resolving'}
                onScanSuccess={handleSuccess}
            />

            {/* Step 2: Scan-result state machine UI states via scan-result.tsx */}
            <ScanOutcomeDisplay
                data={scanState}
                onReset={() => dispatch({ type: 'SCAN_RESET' })}
                onManualSearch={() => {
                    window.location.href = '/staff/search'
                }}
            />
        </div>
    )
}
export default StaffScanPage

