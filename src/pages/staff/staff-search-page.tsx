import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ManualSearchTable } from '@/features/checkin/components/manual-search-table'
import { WalkInModal } from '@/features/checkin/components/walk-in-modal'

export function StaffSearchPage() {
    return (
        <div className="mx-auto max-w-5xl px-4 py-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Back to scanner"
                        render={<Link to="/staff" />}
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Button>
                    <div>
                        <h1 className="font-display text-xl font-bold text-foreground">
                            Manual Check-in
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Find an attendee by name or email when their QR code is unavailable.
                        </p>
                    </div>
                </div>
                <WalkInModal />
            </div>

            <ManualSearchTable />
        </div>
    )
}

export default StaffSearchPage
