import { describe, expect, it } from 'vitest'

import {
  attendeeCreateSchema,
  attendeeUpdateSchema,
  eventCreateSchema,
  eventUpdateSchema,
  headcountRequestCreateSchema,
  invitationCreateSchema,
  invitationOrganizerUpdateSchema,
  invitationRsvpUpdateSchema,
  orgSettingsSchema,
  orgSettingsUpdateSchema,
  registerPublicSchema,
} from './index'

const eventId = '550e8400-e29b-41d4-a716-446655440000'
const guestId = '86c7465e-2874-4a6e-9d3e-06d596824b9b'
const invitationId = '68d26a7e-5a92-407f-b559-75e0555b03eb'

describe('contract form schemas', () => {
  it('parses an EventCreate payload and coerces its capacity', () => {
    const result = eventCreateSchema.parse({
      title: 'Annual Gala',
      slug: 'annual-gala',
      starts_at: '2026-12-15T18:00:00+08:00',
      ends_at: '2026-12-15T22:00:00+08:00',
      event_timezone: 'Asia/Manila',
      capacity: '500',
      rsvp_deadline: '2026-12-01T23:59:59+08:00',
      visibility_mode: 'open_registration',
    })

    expect(result.capacity).toBe(500)
  })

  it('rejects invalid event chronology and empty patch payloads', () => {
    const chronology = eventCreateSchema.safeParse({
      title: 'Annual Gala',
      slug: 'annual-gala',
      starts_at: '2026-12-15T22:00:00+08:00',
      ends_at: '2026-12-15T18:00:00+08:00',
      event_timezone: 'Asia/Manila',
      capacity: 500,
      rsvp_deadline: '2026-12-01T23:59:59+08:00',
      visibility_mode: 'invite_only',
    })

    expect(chronology.success).toBe(false)
    expect(eventUpdateSchema.safeParse({}).success).toBe(false)
    expect(invitationRsvpUpdateSchema.safeParse({}).success).toBe(false)
    expect(invitationOrganizerUpdateSchema.safeParse({}).success).toBe(false)
    expect(attendeeUpdateSchema.safeParse({}).success).toBe(false)
    expect(orgSettingsUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('accepts invitation, attendee, and headcount request payloads', () => {
    expect(invitationCreateSchema.safeParse({
      event_id: eventId,
      guest_id: guestId,
      max_party_size: '4',
    }).success).toBe(true)

    const attendee = attendeeCreateSchema.parse({
      invitation_id: invitationId,
      full_name: 'Juan dela Cruz',
      email: '',
    })
    expect(attendee.email).toBeNull()

    expect(headcountRequestCreateSchema.safeParse({
      invitation_id: invitationId,
      requested_additional_heads: '2',
    }).success).toBe(true)
  })

  it('accepts organization settings and public registration payloads', () => {
    expect(orgSettingsSchema.safeParse({
      id: eventId,
      org_name: 'EIRMIS',
      default_timezone: 'Asia/Manila',
      default_capacity_ceiling: 150,
      sender_domain: 'invites.eirmis.org',
      malware_sandbox_enabled: true,
      self_registration_gate_enabled: true,
      created_at: '2026-09-01T08:00:00+08:00',
      updated_at: '2026-09-10T12:30:00+08:00',
    }).success).toBe(true)

    expect(registerPublicSchema.safeParse({
      event_id: eventId,
      email: 'guest@example.com',
      full_name: 'Guest Example',
    }).success).toBe(true)
  })
})
