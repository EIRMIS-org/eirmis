import { toast } from 'sonner'
import type { ScanCheckInResponse } from '@/lib/api'

export function notifyScanOutcome(
    response: Pick<ScanCheckInResponse, 'result' | 'message'>,
): void {
    if (response.result === 'accepted') {
        toast.success('Check-in recorded')
    } else if (response.result === 'already_checked_in') {
        toast.warning(response.message ?? 'Attendee already checked in')
    } else {
        toast.error(response.message ?? 'Invalid QR token')
    }
}
