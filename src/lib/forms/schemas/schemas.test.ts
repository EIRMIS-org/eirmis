import { describe, expect, it } from 'vitest'

import {
  attendeeCreateSchema,
  attendeeUpdateSchema,
  eventCreateSchema,
  eventUpdateSchema,
  headcountRequestCreateSchema,
  invitationCreateSchema,
  invitationCreateResolver,
  invitationOrganizerUpdateSchema,
  invitationRsvpUpdateSchema,
  orgSettingsSchema,
  orgSettingsUpdateSchema,
  registerPublicSchema,
} from './index'

const eventId = '55555555-5555-5555-5555-555555555555'
const guestId = '33333333-3333-3333-3333-333333333333'
const invitationId = '66666666-6666-6666-6666-666666666666'

describe('contract form schemas', () => {
  it('accepts mock identifiers through the invitation resolver and rejects malformed IDs', async () => {
    const values = { event_id: eventId, guest_id: guestId }
    expect(await invitationCreateResolver(values, undefined, {
      fields: {}, shouldUseNativeValidation: false,
    })).toEqual({ values, errors: {} })
    expect(invitationCreateSchema.safeParse({ ...values, guest_id: 'invalid' }).success).toBe(false)
  })

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

  it('enforces the RSVP cutoff on create and update using absolute time', () => {
    const event = {
      title: 'Gala', slug: 'gala', event_timezone: 'Asia/Manila',
      capacity: 1, visibility_mode: 'invite_only',
      starts_at: '2026-12-15T18:00:00+08:00', ends_at: '2026-12-15T19:00:00+08:00',
      rsvp_deadline: '2026-12-15T10:00:00Z',
    }
    for (const schema of [eventCreateSchema, eventUpdateSchema]) {
      expect(schema.safeParse(event).success).toBe(true)
      const late = schema.safeParse({ ...event, rsvp_deadline: '2026-12-15T10:00:01Z' })
      expect(late.error?.issues.map(issue => issue.path)).toEqual([['rsvp_deadline']])
    }
    expect(eventUpdateSchema.safeParse({ starts_at: event.starts_at }).success).toBe(true)
    expect(eventUpdateSchema.safeParse({ rsvp_deadline: event.rsvp_deadline }).success).toBe(true)
  })

  it('requires an event slug that is safe as one URL path segment', () => {
    const event = {
      title: 'Gala',
      slug: 'gala-2026',
      starts_at: '2026-12-15T18:00:00+08:00',
      ends_at: '2026-12-15T19:00:00+08:00',
      event_timezone: 'Asia/Manila',
      capacity: 1,
      rsvp_deadline: '2026-12-15T17:00:00+08:00',
      visibility_mode: 'open_registration',
    }

    expect(eventCreateSchema.safeParse(event).success).toBe(true)
    expect(eventUpdateSchema.safeParse({ slug: event.slug }).success).toBe(true)
    for (const slug of ['gala/2026', 'gala?preview', 'gala#one']) {
      expect(eventCreateSchema.safeParse({ ...event, slug }).success).toBe(false)
      expect(eventUpdateSchema.safeParse({ slug }).success).toBe(false)
    }
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

  it('treats a blank optional party size as omitted', async () => {
    const values = {
      event_id: eventId,
      guest_id: guestId,
      max_party_size: '',
    }
    const result = await invitationCreateResolver(values, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    })

    expect(result).toEqual({
      values: { event_id: eventId, guest_id: guestId },
      errors: {},
    })
    expect(invitationCreateSchema.safeParse({
      ...values,
      max_party_size: 0,
    }).success).toBe(false)
    expect(invitationOrganizerUpdateSchema.safeParse({
      max_party_size: '',
    }).success).toBe(false)
  })

  it('accepts organization settings and public registration payloads', () => {
    expect(orgSettingsSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
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
