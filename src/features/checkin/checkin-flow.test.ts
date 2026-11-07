import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
    listAttendees,
    listInvitations,
    scanCheckIn,
    setRole,
    submitAttendee,
} from '@/lib/api'
import { resetMockCheckInState } from '@/mocks/handlers'
import { server } from '@/mocks/server'

const eventId = '55555555-5555-5555-5555-555555555555'
const invitationId = '66666666-6666-6666-6666-666666666666'

describe('check-in cross-portal flow', () => {
    it('rejects an unknown token without changing attendance', async () => {
        const result = await scanCheckIn('unknown-token')
        expect(result.result).toBe('invalid_token')
        const invitations = await listInvitations({ event_id: `eq.${eventId}` })
        expect(invitations[0]?.checked_in_count).toBe(0)
    })
    beforeAll(() => server.listen())

    afterEach(() => {
        resetMockCheckInState()
        server.resetHandlers()
    })

    afterAll(() => {
        setRole('public')
        server.close()
    })

    it('moves the organizer attendance count only on the first successful scan', async () => {
        setRole('checkin')
        const firstScan = await scanCheckIn('signed-qr-token-sample')
        const duplicateScan = await scanCheckIn('signed-qr-token-sample')

        expect(firstScan.result).toBe('accepted')
        expect(duplicateScan.result).toBe('already_checked_in')

        setRole('organizer')
        const invitations = await listInvitations({ event_id: `eq.${eventId}` })
        const attendees = await listAttendees({ invitation_id: `eq.${invitationId}` })

        expect(invitations[0]?.checked_in_count).toBe(1)
        expect(attendees[0]?.checked_in).toBe(true)
    })

    it('creates a walk-in and checks them in across staff and organizer views', async () => {
        setRole('checkin')
        const walkIn = await submitAttendee({
            is_walk_in: true,
            invitation_id: invitationId,
            full_name: 'On-site Guest',
            email: 'walkin@example.com',
        })

        expect(walkIn.is_walk_in).toBe(true)
        expect(walkIn.qr_token).toBeTruthy()

        await scanCheckIn(walkIn.qr_token!)

        setRole('organizer')
        const invitations = await listInvitations({ event_id: `eq.${eventId}` })
        const attendees = await listAttendees({ invitation_id: `eq.${invitationId}` })
        const storedWalkIn = attendees.find((attendee) => attendee.id === walkIn.id)

        expect(invitations[0]?.checked_in_count).toBe(1)
        expect(storedWalkIn).toMatchObject({
            is_walk_in: true,
            checked_in: true,
        })
    })
})
