/**
 * src/mocks/handlers.ts
 *
 * MSW request handlers — Task 05 (Issue #84)
 *
 * Mirrors every documented PostgREST + Edge Function operation from
 * `contract/openapi.yaml`, returning the contract example payloads (the same
 * examples Stoplight Prism serves). Used for:
 *   - M4 unit/component tests via `src/mocks/server.ts` (setupServer)
 *   - Browser mocking via `src/mocks/browser.ts` (setupWorker)
 *
 * Error paths: requests WITHOUT a user JWT (no Authorization header, or a Bearer
 * equal to the public/anon key) receive the documented
 * `401` response carrying the unified Error schema `{ code, message, details, hint }`.
 */

import { http, HttpResponse, delay } from 'msw';
import type { components } from '../../contract/generated/schema';
import { resolvePublicKey } from '../lib/api';

const PUBLIC_KEY = resolvePublicKey();

type ErrorSchema = components['schemas']['Error'];
type Event = components['schemas']['Event'];
type Guest = components['schemas']['Guest'];
type Invitation = components['schemas']['Invitation'];
type Attendee = components['schemas']['Attendee'];
type HeadcountIncreaseRequest =
    components['schemas']['HeadcountIncreaseRequest'];
type OrganizerProfile = components['schemas']['OrganizerProfile'];
type AdminProfile = components['schemas']['AdminProfile'];
type OrgSettings = components['schemas']['OrgSettings'];
type ReminderSchedule = components['schemas']['ReminderSchedule'];
type InvitationDesign = components['schemas']['InvitationDesign'];
type InvitationImage = components['schemas']['InvitationImage'];
type CheckInAssignment = components['schemas']['CheckInAssignment'];
type EmailLog = components['schemas']['EmailLog'];
type AuditLogEntry = components['schemas']['AuditLogEntry'];
type ScanCheckInResponse = components['schemas']['ScanCheckInResponse'];

// ─── Well-known example UUIDs (match contract examples & seed) ────────────────

const UUID = {
    ORGANIZER: '11111111-1111-1111-1111-111111111111',
    ADMIN: '22222222-2222-2222-2222-222222222222',
    GUEST: '33333333-3333-3333-3333-333333333333',
    CHECKIN_STAFF: '44444444-4444-4444-4444-444444444444',
    EVENT: '55555555-5555-5555-5555-555555555555',
    INVITATION: '66666666-6666-6666-6666-666666666666',
    ATTENDEE: '77777777-7777-7777-7777-777777777777',
    ASSIGNMENT: '88888888-8888-8888-8888-888888888888',
    REMINDER: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    HIR: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    DESIGN: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    IMAGE: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    EMAIL_LOG: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    AUDIT: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
} as const;

// ─── Unified error helpers ────────────────────────────────────────────────────

function errorBody(
    code: string,
    message: string,
    details: string | null = null,
    hint: string | null = null,
): ErrorSchema {
    return { code, message, details, hint };
}

const unauthorized = () =>
    HttpResponse.json(
        errorBody(
            'PGRST301',
            'JWT missing or invalid',
            null,
            'Include a valid Authorization: Bearer <jwt> header.',
        ),
        { status: 401 },
    );

/**
 * True when the request carries a user JWT. A Bearer equal to the project
 * public key is anonymous (Supabase `anon` role), not authenticated.
 */
function hasAuth(request: Request): boolean {
    const header = request.headers.get('Authorization');
    if (!header) return false;
    return header !== `Bearer ${PUBLIC_KEY}`;
}

// ─── Contract example fixtures (from contract/components/schemas examples) ───

const exampleEvent: Event = {
    id: UUID.EVENT,
    organizer_id: UUID.ORGANIZER,
    title: 'Annual Gala 2026',
    slug: 'annual-gala-2026',
    description: 'A celebration of achievements and milestones.',
    starts_at: '2026-12-15T18:00:00+08:00',
    ends_at: '2026-12-15T22:00:00+08:00',
    event_timezone: 'Asia/Manila',
    venue_name: 'Grand Ballroom',
    address: '123 Rizal Avenue',
    city: 'Cebu City',
    capacity: 500,
    rsvp_deadline: '2026-12-01T23:59:59+08:00',
    visibility_mode: 'open_registration',
    status: 'published',
    deleted_at: null,
    created_at: '2026-09-01T08:00:00+08:00',
    updated_at: '2026-09-10T12:30:00+08:00',
};

const exampleGuest: Guest = {
    id: UUID.GUEST,
    email: 'guest@example.com',
    full_name: 'Maria Santos',
    auth_user_id: UUID.GUEST,
    created_at: '2026-09-05T08:00:00+08:00',
    updated_at: '2026-09-05T08:00:00+08:00',
};

const exampleInvitation: Invitation = {
    id: UUID.INVITATION,
    event_id: UUID.EVENT,
    guest_id: UUID.GUEST,
    status: 'accepted',
    max_party_size: 4,
    party_size: 2,
    checked_in_count: 0,
    dietary_preference: 'Vegetarian',
    special_requests: null,
    invited_by: UUID.ORGANIZER,
    invited_at: '2026-10-01T09:00:00+08:00',
    responded_at: '2026-10-05T14:30:00+08:00',
    waitlisted_at: null,
    created_at: '2026-10-01T09:00:00+08:00',
    updated_at: '2026-10-05T14:30:00+08:00',
};

const exampleAttendee: Attendee = {
    id: UUID.ATTENDEE,
    invitation_id: UUID.INVITATION,
    full_name: 'Maria Santos',
    email: 'maria.santos@example.com',
    is_primary: true,
    status: 'approved',
    submitted_at: '2026-10-05T14:00:00+08:00',
    reviewed_by: UUID.ORGANIZER,
    reviewed_at: '2026-10-06T09:00:00+08:00',
    review_reason: 'Primary guest approved',
    qr_token: 'signed-qr-token-sample',
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    is_walk_in: false,
};

const exampleGuest2: Guest = {
    id: '33333333-3333-3333-3333-333333333334',
    email: 'waitlist.guest@example.com',
    full_name: 'Jose Rizal',
    auth_user_id: '33333333-3333-3333-3333-333333333334',
    created_at: '2026-09-06T08:00:00+08:00',
    updated_at: '2026-09-06T08:00:00+08:00',
};

const exampleWaitlistedInvitation: Invitation = {
    id: '66666666-6666-6666-6666-666666666667',
    event_id: UUID.EVENT,
    guest_id: exampleGuest2.id,
    status: 'waitlisted',
    max_party_size: 2,
    party_size: 0,
    checked_in_count: 0,
    dietary_preference: null,
    special_requests: 'Aisle seat preferred',
    invited_by: UUID.ORGANIZER,
    invited_at: '2026-10-02T09:00:00+08:00',
    responded_at: null,
    waitlisted_at: '2026-10-03T11:00:00+08:00',
    created_at: '2026-10-02T09:00:00+08:00',
    updated_at: '2026-10-03T11:00:00+08:00',
};

let mockEvents: Event[] = [{ ...exampleEvent }];
let mockGuests: Guest[] = [{ ...exampleGuest }, { ...exampleGuest2 }];
let mockInvitation: Invitation = { ...exampleInvitation };
let mockExtraInvitations: Invitation[] = [{ ...exampleWaitlistedInvitation }];
let mockAttendees: Attendee[] = [{ ...exampleAttendee }];
let mockHeadcountRequests: HeadcountIncreaseRequest[] = [];

export function resetMockCheckInState(): void {
    mockInvitation = { ...exampleInvitation };
    mockExtraInvitations = [{ ...exampleWaitlistedInvitation }];
    mockAttendees = [{ ...exampleAttendee }];
    mockHeadcountRequests = [];
    resetMockOrganizerState();
}

const exampleHir: HeadcountIncreaseRequest = {
    id: UUID.HIR,
    invitation_id: UUID.INVITATION,
    requested_additional_heads: 2,
    status: 'pending',
    note: 'My two siblings confirmed they can come.',
    requested_at: '2026-11-01T10:00:00+08:00',
    reviewed_by: null,
    reviewed_at: null,
    review_reason: null,
};

mockHeadcountRequests = [{ ...exampleHir }];

const exampleOrganizerProfile: OrganizerProfile = {
    id: UUID.ORGANIZER,
    email: 'organizer@example.com',
    full_name: 'Jomari Barrera',
    status: 'pending',
    created_at: '2026-09-01T08:00:00+08:00',
    updated_at: '2026-09-10T12:30:00+08:00',
};

const organizerProfiles: OrganizerProfile[] = Array.from(
    { length: 21 },
    (_, index) => {
        if (index === 0) return { ...exampleOrganizerProfile };
        const suffix = String(index).padStart(12, '0');
        return {
            ...exampleOrganizerProfile,
            id: `11111111-1111-1111-1111-${suffix}`,
            email: `organizer${index.toString().padStart(2, '0')}@example.com`,
            full_name: `Organizer ${index.toString().padStart(2, '0')}`,
            created_at: `2026-09-${String(index + 1).padStart(2, '0')}T08:00:00+08:00`,
        };
    },
);

const exampleAdminProfile: AdminProfile = {
    id: UUID.ADMIN,
    email: 'admin@example.com',
    full_name: 'System Administrator',
    created_at: '2026-09-01T08:00:00+08:00',
};

const exampleOrgSettings: OrgSettings = {
    id: '00000000-0000-0000-0000-000000000001',
    org_name: 'EIRMIS Enterprise Cloud Platform',
    default_timezone: 'Asia/Manila',
    default_capacity_ceiling: 150,
    sender_domain: 'invites.eirmis.org',
    malware_sandbox_enabled: true,
    self_registration_gate_enabled: true,
    created_at: '2026-09-01T08:00:00+08:00',
    updated_at: '2026-09-10T12:30:00+08:00',
};

const exampleReminder: ReminderSchedule = {
    id: UUID.REMINDER,
    event_id: UUID.EVENT,
    days_before_event: 7,
    send_time_of_day: '09:00',
    enabled: true,
    last_sent_at: null,
};

const exampleDesign: InvitationDesign = {
    id: UUID.DESIGN,
    event_id: UUID.EVENT,
    design_type: 'html',
    html_storage_path: `designs/${UUID.EVENT}/invitation.html`,
    validation_status: 'pending',
    validation_notes: null,
    validated_at: null,
    created_at: '2026-11-01T10:00:00+08:00',
    updated_at: '2026-11-01T10:00:00+08:00',
};

const exampleImage: InvitationImage = {
    id: UUID.IMAGE,
    event_id: UUID.EVENT,
    storage_path: `designs/${UUID.EVENT}/gallery/001.jpg`,
    sort_order: 1,
    caption: 'Welcome to the Annual Gala',
    created_at: '2026-09-07T10:00:00+08:00',
};

const exampleAssignment: CheckInAssignment = {
    id: UUID.ASSIGNMENT,
    event_id: UUID.EVENT,
    staff_email: 'staff@example.com',
    auth_user_id: UUID.CHECKIN_STAFF,
    invited_by: UUID.ORGANIZER,
    status: 'active',
    created_at: '2026-12-10T08:00:00+08:00',
    updated_at: '2026-12-10T08:00:00+08:00',
};

const exampleEmailLog: EmailLog = {
    id: UUID.EMAIL_LOG,
    event_id: UUID.EVENT,
    invitation_id: UUID.INVITATION,
    attendee_id: null,
    recipient_email: 'guest@example.com',
    type: 'rsvp_confirmation',
    provider_message_id: 'resend_msg_123456789',
    status: 'sent',
    sent_at: '2026-12-01T09:15:30+08:00',
    created_at: '2026-12-01T09:15:00+08:00',
};

const exampleAuditEntry: AuditLogEntry = {
    id: UUID.AUDIT,
    actor_type: 'organizer',
    actor_id: UUID.ORGANIZER,
    action: 'attendee.approved',
    entity_type: 'attendee',
    entity_id: UUID.ATTENDEE,
    old_value: null,
    new_value: null,
    reason: 'Verified team member',
    created_at: '2026-12-10T08:05:00+08:00',
};

const exampleAuditEntries: AuditLogEntry[] = [
    exampleAuditEntry,
    {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffff02',
        actor_type: 'admin',
        actor_id: UUID.ADMIN,
        action: 'organizer.verified',
        entity_type: 'organizer_profile',
        entity_id: UUID.ORGANIZER,
        old_value: { status: 'pending' },
        new_value: { status: 'active' },
        reason: 'Completed identity and domain verification',
        created_at: '2026-12-10T09:15:00+08:00',
    },
    {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffff03',
        actor_type: 'system',
        actor_id: null,
        action: 'invitation_design.uploaded',
        entity_type: 'invitation_design',
        entity_id: UUID.DESIGN,
        old_value: null,
        new_value: { validation_status: 'passed' },
        reason: 'Automated HTML sandbox validation passed',
        created_at: '2026-12-11T14:30:00+08:00',
    },
    {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffff04',
        actor_type: 'check_in_staff',
        actor_id: UUID.ASSIGNMENT,
        action: 'checkin.attendee_scanned',
        entity_type: 'attendee',
        entity_id: UUID.ATTENDEE,
        old_value: { checked_in: false },
        new_value: { checked_in: true },
        reason: 'Entrance gate QR scan accepted',
        created_at: '2026-12-15T18:02:00+08:00',
    },
];

const exampleReminder2: ReminderSchedule = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
    event_id: UUID.EVENT,
    days_before_event: 1,
    send_time_of_day: '08:00',
    enabled: true,
    last_sent_at: null,
};

const exampleImage2: InvitationImage = {
    id: 'dddddddd-dddd-dddd-dddd-ddddddddddde',
    event_id: UUID.EVENT,
    storage_path: `designs/${UUID.EVENT}/gallery/002.jpg`,
    sort_order: 2,
    caption: 'Grand Ballroom Reception Hall',
    created_at: '2026-09-08T10:00:00+08:00',
};

const exampleEmailLog2: EmailLog = {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef',
    event_id: UUID.EVENT,
    invitation_id: UUID.INVITATION,
    attendee_id: UUID.ATTENDEE,
    recipient_email: 'maria.santos@example.com',
    type: 'qr_codes_issued',
    provider_message_id: 'resend_msg_987654321',
    status: 'delivered',
    sent_at: '2026-12-05T14:20:00+08:00',
    created_at: '2026-12-05T14:19:45+08:00',
};

let mockReminderSchedules: ReminderSchedule[] = [
    { ...exampleReminder },
    { ...exampleReminder2 },
];
let mockInvitationDesigns: InvitationDesign[] = [{ ...exampleDesign }];
let mockInvitationImages: InvitationImage[] = [
    { ...exampleImage },
    { ...exampleImage2 },
];
let mockCheckInAssignments: CheckInAssignment[] = [{ ...exampleAssignment }];
let mockEmailLogs: EmailLog[] = [{ ...exampleEmailLog }, { ...exampleEmailLog2 }];

export function resetMockOrganizerState(): void {
    mockEvents = [{ ...exampleEvent }];
    mockGuests = [{ ...exampleGuest }, { ...exampleGuest2 }];
    mockInvitation = { ...exampleInvitation };
    mockExtraInvitations = [{ ...exampleWaitlistedInvitation }];
    mockReminderSchedules = [{ ...exampleReminder }, { ...exampleReminder2 }];
    mockInvitationDesigns = [{ ...exampleDesign }];
    mockInvitationImages = [{ ...exampleImage }, { ...exampleImage2 }];
    mockCheckInAssignments = [{ ...exampleAssignment }];
    mockEmailLogs = [{ ...exampleEmailLog }, { ...exampleEmailLog2 }];
    organizerProfiles[0] = { ...exampleOrganizerProfile };
}

// ─── Handler helpers ──────────────────────────────────────────────────────────

/** Wraps a JSON list response with a PostgREST-style Content-Range header. */
function jsonList<T>(
    items: T[],
    total = items.length,
    start = 0,
): HttpResponse<unknown> {
    return HttpResponse.json(items, {
        headers: {
            'Content-Range': `${start}-${Math.max(start + items.length - 1, start)}/${total}`,
        },
    });
}

/** Simulate PostgREST filter matching on a single `?column=eq.value` param. */
function filterByEq<T extends Record<string, unknown>>(
    request: Request,
    items: T[],
    column: string,
): T[] {
    const url = new URL(request.url);
    const filter = url.searchParams.get(column);
    if (!filter || !filter.startsWith('eq.')) return items;
    const value = filter.slice(3);
    return items.filter((item) => item[column] === value);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
    // ═══ PostgREST: events ═══
    http.get('*/rest/v1/events', ({ request }) => {
        if (!hasAuth(request)) {
            // Public discovery — RLS anon-read only exposes open-registration published events.
            return jsonList(
                mockEvents
                    .filter(
                        (e) =>
                            e.visibility_mode === 'open_registration' &&
                            e.status === 'published',
                    )
                    .map((e) => ({
                        ...e,
                        visibility_mode: 'open_registration' as const,
                        status: 'published' as const,
                    })),
            );
        }
        return jsonList(filterByEq(request, mockEvents, 'id'));
    }),

    http.post('*/rest/v1/events', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Event>;
        const now = new Date().toISOString();
        const created: Event = {
            ...exampleEvent,
            ...body,
            id: crypto.randomUUID(),
            organizer_id: UUID.ORGANIZER,
            created_at: now,
            updated_at: now,
        };
        mockEvents = [...mockEvents, created];
        return HttpResponse.json(created, { status: 201 });
    }),

    http.patch('*/rest/v1/events', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        const body = (await request.json()) as Partial<Event>;
        const target = mockEvents.find((event) => event.id === id) ?? mockEvents[0] ?? exampleEvent;
        const updated: Event = {
            ...target,
            ...body,
            updated_at: new Date().toISOString(),
        };
        mockEvents = mockEvents.map((event) =>
            event.id === updated.id ? updated : event,
        );
        return HttpResponse.json(updated);
    }),

    // ═══ PostgREST: reminder_schedules ═══
    http.get('*/rest/v1/reminder_schedules', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, mockReminderSchedules, 'event_id'));
    }),

    http.post('*/rest/v1/reminder_schedules', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<ReminderSchedule>;
        const existingIndex = mockReminderSchedules.findIndex(
            (item) =>
                item.event_id === (body.event_id ?? UUID.EVENT) &&
                item.days_before_event === body.days_before_event,
        );
        if (existingIndex >= 0) {
            const updated: ReminderSchedule = {
                ...mockReminderSchedules[existingIndex],
                ...body,
            };
            mockReminderSchedules = mockReminderSchedules.map((item, idx) =>
                idx === existingIndex ? updated : item,
            );
            return HttpResponse.json(updated, { status: 201 });
        }
        const created: ReminderSchedule = {
            ...exampleReminder,
            ...body,
            id: crypto.randomUUID(),
            send_time_of_day: body.send_time_of_day ?? '09:00',
            enabled: body.enabled ?? true,
            last_sent_at: null,
        };
        mockReminderSchedules = [...mockReminderSchedules, created];
        return HttpResponse.json(created, { status: 201 });
    }),

    http.delete('*/rest/v1/reminder_schedules', ({ request }) => {
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        if (id) {
            mockReminderSchedules = mockReminderSchedules.filter((item) => item.id !== id);
        }
        return new HttpResponse(null, { status: 204 });
    }),

    // ═══ PostgREST: guests ═══
    http.get('*/rest/v1/guests', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const authUserId = new URL(request.url).searchParams.get('auth_user_id');
        if (authUserId?.startsWith('eq.')) {
            return jsonList(
                mockGuests.filter((guest) => guest.auth_user_id === authUserId.slice(3)),
            );
        }
        return jsonList(filterByEq(request, mockGuests, 'id'));
    }),

    http.patch('*/rest/v1/guests', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Guest>;
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        const target = mockGuests.find((guest) => guest.id === id) ?? mockGuests[0] ?? exampleGuest;
        const updated: Guest = {
            ...target,
            ...body,
            updated_at: new Date().toISOString(),
        };
        mockGuests = mockGuests.map((guest) =>
            guest.id === updated.id ? updated : guest,
        );
        return HttpResponse.json(updated);
    }),

    // ═══ PostgREST: invitations ═══
    http.get('*/rest/v1/invitations', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const isGuest =
            request.headers.get('Authorization') === 'Bearer fake-guest-jwt';
        const visibleInvitations = isGuest
            ? [mockInvitation]
            : [mockInvitation, ...mockExtraInvitations];
        return jsonList(filterByEq(request, visibleInvitations, 'event_id'));
    }),

    http.post('*/rest/v1/invitations', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Invitation>;
        const created: Invitation = {
            ...exampleInvitation,
            ...body,
            id: crypto.randomUUID(),
            status: body.status ?? ('pending' as const),
            party_size: 0,
        };
        mockExtraInvitations = [...mockExtraInvitations, created];
        return HttpResponse.json(created, { status: 201 });
    }),

    http.patch('*/rest/v1/invitations', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        const body = (await request.json()) as Partial<Invitation>;
        if (!id || id === mockInvitation.id) {
            mockInvitation = { ...mockInvitation, ...body };
            return HttpResponse.json(mockInvitation);
        }
        const target = mockExtraInvitations.find((inv) => inv.id === id);
        if (target) {
            const updated: Invitation = { ...target, ...body };
            mockExtraInvitations = mockExtraInvitations.map((inv) =>
                inv.id === id ? updated : inv,
            );
            return HttpResponse.json(updated);
        }
        mockInvitation = { ...mockInvitation, ...body };
        return HttpResponse.json(mockInvitation);
    }),

    // ═══ PostgREST: attendees ═══
    http.get('*/rest/v1/attendees', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, mockAttendees, 'invitation_id'));
    }),

    http.post('*/rest/v1/attendees', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Attendee>;
        const isWalkIn =
            request.headers.get('Authorization') === 'Bearer fake-checkin-staff-jwt';
        if (body.invitation_id !== mockInvitation.id || mockInvitation.status !== 'accepted') {
            return HttpResponse.json(errorBody('42501', 'Select an accepted invitation for the assigned event'), { status: 403 });
        }
        const id = crypto.randomUUID();
        const attendee: Attendee = {
            ...exampleAttendee,
            ...body,
            id,
            is_primary: false,
            status: isWalkIn ? 'approved' : 'pending',
            submitted_at: new Date().toISOString(),
            reviewed_by: isWalkIn ? UUID.CHECKIN_STAFF : null,
            reviewed_at: isWalkIn ? new Date().toISOString() : null,
            review_reason: isWalkIn ? 'Registered on site' : null,
            qr_token: isWalkIn ? `walk-in-${id}` : null,
            checked_in: false,
            checked_in_at: null,
            checked_in_by: null,
            is_walk_in: isWalkIn,
        };

        mockAttendees = [...mockAttendees, attendee];
        if (isWalkIn) {
            mockInvitation = {
                ...mockInvitation,
                party_size: mockInvitation.party_size + 1,
            };
        }

        return HttpResponse.json(attendee, { status: 201 });
    }),

    http.patch('*/rest/v1/attendees', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Attendee>;
        const url = new URL(request.url);
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        const current = mockAttendees.find((attendee) => attendee.id === id) ?? exampleAttendee;
        const attendee = { ...current, ...body };
        mockAttendees = mockAttendees.map((item) => item.id === attendee.id ? attendee : item);
        return HttpResponse.json(attendee);
    }),

    // ═══ PostgREST: headcount_increase_requests ═══
    http.get('*/rest/v1/headcount_increase_requests', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, mockHeadcountRequests, 'invitation_id'));
    }),

    // ═══ Edge Function: submit headcount request and notify organizer ═══
    http.post('*/functions/v1/submit-headcount-request', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<HeadcountIncreaseRequest>;
        const requestRecord: HeadcountIncreaseRequest = {
            ...exampleHir,
            ...body,
            id: crypto.randomUUID(),
            status: 'pending',
        };
        mockHeadcountRequests = [...mockHeadcountRequests, requestRecord];
        return HttpResponse.json(requestRecord, { status: 201 });
    }),

    // ═══ PostgREST: invitation_designs ═══
    http.get('*/rest/v1/invitation_designs', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, mockInvitationDesigns, 'event_id'));
    }),

    http.post('*/rest/v1/invitation_designs', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<InvitationDesign>;
        const targetEventId = body.event_id ?? UUID.EVENT;
        const now = new Date().toISOString();
        const existing = mockInvitationDesigns.find((d) => d.event_id === targetEventId);
        if (existing) {
            const updated: InvitationDesign = {
                ...existing,
                ...body,
                updated_at: now,
            };
            mockInvitationDesigns = mockInvitationDesigns.map((d) =>
                d.event_id === targetEventId ? updated : d,
            );
            return HttpResponse.json(updated, { status: 201 });
        }
        const created: InvitationDesign = {
            ...exampleDesign,
            ...body,
            id: crypto.randomUUID(),
            event_id: targetEventId,
            created_at: now,
            updated_at: now,
        };
        mockInvitationDesigns = [...mockInvitationDesigns, created];
        return HttpResponse.json(created, { status: 201 });
    }),

    // ═══ PostgREST: invitation_images ═══
    http.get('*/rest/v1/invitation_images', ({ request }) => {
        // Public gallery read is allowed unauthenticated for open-registration events.
        const filtered = filterByEq(request, mockInvitationImages, 'event_id').sort(
            (a, b) => a.sort_order - b.sort_order,
        );
        return jsonList(filtered);
    }),

    http.post('*/rest/v1/invitation_images', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<InvitationImage>;
        const created: InvitationImage = {
            ...exampleImage,
            ...body,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
        };
        mockInvitationImages = [...mockInvitationImages, created];
        return HttpResponse.json(created, { status: 201 });
    }),

    http.patch('*/rest/v1/invitation_images', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        const body = (await request.json()) as Partial<InvitationImage>;
        if (id) {
            mockInvitationImages = mockInvitationImages.map((img) =>
                img.id === id ? { ...img, ...body } : img,
            );
        }
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/rest/v1/invitation_images', ({ request }) => {
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        if (id) {
            mockInvitationImages = mockInvitationImages.filter((img) => img.id !== id);
        }
        return new HttpResponse(null, { status: 204 });
    }),

    // ═══ PostgREST: checkin_assignments ═══
    http.get('*/rest/v1/checkin_assignments', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, mockCheckInAssignments, 'event_id'));
    }),

    http.post('*/rest/v1/checkin_assignments', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<CheckInAssignment>;
        const now = new Date().toISOString();
        const created: CheckInAssignment = {
            ...exampleAssignment,
            ...body,
            id: crypto.randomUUID(),
            invited_by: UUID.ORGANIZER,
            status: 'active' as const,
            created_at: now,
            updated_at: now,
        };
        mockCheckInAssignments = [...mockCheckInAssignments, created];
        return HttpResponse.json(created, { status: 201 });
    }),

    http.patch('*/rest/v1/checkin_assignments', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        const body = (await request.json()) as Partial<CheckInAssignment>;
        if (id) {
            mockCheckInAssignments = mockCheckInAssignments.map((item) =>
                item.id === id
                    ? { ...item, ...body, updated_at: new Date().toISOString() }
                    : item,
            );
        }
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/rest/v1/checkin_assignments', ({ request }) => {
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        if (id) {
            mockCheckInAssignments = mockCheckInAssignments.filter((item) => item.id !== id);
        }
        return new HttpResponse(null, { status: 204 });
    }),

    // ═══ PostgREST: email_logs & audit_log_entries ═══
    http.get('*/rest/v1/email_logs', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, mockEmailLogs, 'event_id'));
    }),

    http.get('*/rest/v1/audit_log_entries', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(exampleAuditEntries);
    }),

    // ═══ PostgREST: organizer_profiles ═══
    http.get('*/rest/v1/organizer_profiles', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const status = url.searchParams.get('status');
        const filteredProfiles = organizerProfiles.filter((profile) => {
            const matchesId = !id || id === `eq.${profile.id}`;
            const matchesStatus = !status || status === `eq.${profile.status}`;
            return matchesId && matchesStatus;
        });
        const limit = Number(url.searchParams.get('limit') ?? filteredProfiles.length);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const profiles = filteredProfiles.slice(offset, offset + limit);
        return jsonList(profiles, filteredProfiles.length, offset);
    }),

    http.patch('*/rest/v1/organizer_profiles', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        // PostgREST targets rows by query filter: ?id=eq.<uuid>
        const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
        const body = (await request.json()) as Partial<OrganizerProfile>;
        const profile = organizerProfiles.find((item) => item.id === id);
        if (!profile || (!body.status && !body.full_name)) {
            return HttpResponse.json(
                errorBody('PGRST116', 'Organizer profile not found or status is missing'),
                { status: 404 },
            );
        }

        if (body.full_name && !body.status) {
            profile.full_name = body.full_name;
            profile.updated_at = new Date().toISOString();
            return HttpResponse.json(profile);
        }

        if (!body.status || !['pending', 'active'].includes(body.status)) {
            return HttpResponse.json(
                errorBody('PGRST102', 'Invalid organizer status'),
                { status: 400 },
            );
        }

        const previousStatus = profile.status;
        profile.status = body.status;
        profile.updated_at = new Date().toISOString();
        const auditEntry: AuditLogEntry = {
            ...exampleAuditEntry,
            id: crypto.randomUUID(),
            actor_type: 'system',
            actor_id: null,
            action: 'organizer.status_updated',
            entity_type: 'organizer_profile',
            entity_id: profile.id,
            old_value: { status: previousStatus },
            new_value: { status: profile.status },
            reason: 'Administrator verification decision',
            created_at: profile.updated_at,
        };
        exampleAuditEntries.push(auditEntry);
        return HttpResponse.json(profile);
    }),

    // ═══ PostgREST: admin_profiles ═══
    http.get('*/rest/v1/admin_profiles', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList([exampleAdminProfile]);
    }),

    // ═══ PostgREST: org_settings ═══
    http.get('*/rest/v1/org_settings', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList([exampleOrgSettings]);
    }),

    http.patch('*/rest/v1/org_settings', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<OrgSettings>;
        Object.assign(exampleOrgSettings, body, {
            id: exampleOrgSettings.id,
            updated_at: new Date().toISOString(),
        });
        return HttpResponse.json(exampleOrgSettings);
    }),

    // ═══ Edge Functions ═══
    http.post('*/functions/v1/register', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        if (!body.email || !body.event_id) {
            return HttpResponse.json(
                errorBody('P0001', 'Validation failed: email and event_id are required'),
                { status: 400 },
            );
        }
        if (body.email === 'duplicate@example.com') {
            return HttpResponse.json(
                errorBody('23505', 'duplicate key value violates unique constraint', null, 'Guest already registered.'),
                { status: 409 },
            );
        }
        return HttpResponse.json(exampleInvitation, { status: 201 });
    }),

    http.post('*/functions/v1/invitation-html', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const contentType = request.headers.get('content-type') ?? '';
        if (!contentType.includes('multipart/form-data')) {
            return HttpResponse.json(
                {
                    design: exampleDesign,
                    errors: [{ rule: 'multipart_required', detail: 'multipart/form-data body required' }],
                },
                { status: 422 },
            );
        }
        const formData = await request.formData();
        const eventId = String(formData.get('event_id') ?? UUID.EVENT);
        const uploadedFile = formData.get('file');
        const fileName =
            uploadedFile && typeof uploadedFile === 'object' && 'name' in uploadedFile && uploadedFile.name
                ? String(uploadedFile.name)
                : 'invitation.html';
        const now = new Date().toISOString();
        const existing = mockInvitationDesigns.find((d) => d.event_id === eventId);
        const updatedDesign: InvitationDesign = {
            ...(existing ?? exampleDesign),
            id: existing?.id ?? crypto.randomUUID(),
            event_id: eventId,
            design_type: 'html',
            html_storage_path: `designs/${eventId}/${fileName}`,
            validation_status: 'pending',
            validation_notes: null,
            updated_at: now,
        };
        if (existing) {
            mockInvitationDesigns = mockInvitationDesigns.map((d) =>
                d.event_id === eventId ? updatedDesign : d,
            );
        } else {
            mockInvitationDesigns = [...mockInvitationDesigns, updatedDesign];
        }
        return HttpResponse.json({ design: updatedDesign, errors: [] });
    }),

    http.post('*/functions/v1/attendees/:id/decision', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as { decision?: string };
        if (!body.decision) {
            return HttpResponse.json(errorBody('P0001', 'decision is required'), { status: 400 });
        }
        const id = new URL(request.url).pathname.split('/').at(-2);
        const current = mockAttendees.find((attendee) => attendee.id === id);
        if (!current) {
            return HttpResponse.json(errorBody('PGRST116', 'Attendee not found'), { status: 404 });
        }
        const approved = body.decision === 'approve';
        const updatedAttendee: Attendee = {
            ...current,
            status: approved ? 'approved' : 'rejected',
            reviewed_by: UUID.ORGANIZER,
            reviewed_at: new Date().toISOString(),
            review_reason: (body as { reason?: string | null }).reason ?? null,
            qr_token: approved ? current.qr_token ?? `signed-qr-token-${current.id}` : null,
        };
        mockAttendees = mockAttendees.map((attendee) =>
            attendee.id === updatedAttendee.id ? updatedAttendee : attendee,
        );
        if (approved) {
            mockInvitation = { ...mockInvitation, status: 'accepted' };
        }
        return HttpResponse.json({
            attendee: updatedAttendee,
            capacity_warning: null,
        });
    }),

    http.post('*/functions/v1/headcount-requests/:id/decision', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as { decision?: string };
        const id = new URL(request.url).pathname.split('/').at(-2);
        const current = mockHeadcountRequests.find((item) => item.id === id);
        if (!current) {
            return HttpResponse.json(errorBody('PGRST116', 'Headcount request not found'), { status: 404 });
        }
        const approved = body.decision === 'approve';
        const updatedRequest: HeadcountIncreaseRequest = {
            ...current,
            status: approved ? 'approved' : 'rejected',
            reviewed_by: UUID.ORGANIZER,
            reviewed_at: new Date().toISOString(),
            review_reason: (body as { reason?: string | null }).reason ?? null,
        };
        mockHeadcountRequests = mockHeadcountRequests.map((item) =>
            item.id === updatedRequest.id ? updatedRequest : item,
        );
        if (approved) {
            mockInvitation = {
                ...mockInvitation,
                max_party_size:
                    mockInvitation.max_party_size +
                    updatedRequest.requested_additional_heads,
            };
        }
        return HttpResponse.json({
            ...updatedRequest,
        });
    }),

    http.post('*/functions/v1/qr-bundle', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        await request.json();
        return HttpResponse.json({
            dispatched_count: 1,
            invitation_ids: [UUID.INVITATION],
        });
    }),

    http.post('*/functions/v1/checkin/scan', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as { qr_token?: string };
        if (body.qr_token === 'invalid.token' || body.qr_token === 'simulate-invalid-token') {
            return HttpResponse.json(errorBody('SCAN_403', 'QR token signature invalid'), { status: 403 });
        }
        if (body.qr_token === 'simulate-wrong-event') {
            return HttpResponse.json(errorBody('EVENT_MISMATCH_403', 'Token belongs to another event: Tech Forward Gala 2025'), { status: 403 });
        }
        if (body.qr_token === 'simulate-capacity-full') {
            return HttpResponse.json(errorBody('CAPACITY_422', 'Event has reached maximum capacity'), { status: 422 });
        }
        if (body.qr_token === 'simulate-duplicate') {
            const scanResponse: ScanCheckInResponse = {
                result: 'already_checked_in',
                attendee: { ...exampleAttendee, checked_in: true },
                checked_in_at: '2026-12-15T17:45:00+08:00',
                message: 'Attendee was already checked in at 5:45 PM.',
            };
            return HttpResponse.json(scanResponse);
        }

        const matchedAttendee = mockAttendees.find(
            (attendee) => attendee.qr_token === body.qr_token,
        );

        if (!matchedAttendee || matchedAttendee.status !== 'approved') {
            return HttpResponse.json({
                result: 'invalid_token',
                attendee: null,
                message: 'Token does not belong to an approved attendee.',
            } satisfies ScanCheckInResponse);
        }

        if (matchedAttendee.checked_in) {
            const scanResponse: ScanCheckInResponse = {
                result: 'already_checked_in',
                attendee: matchedAttendee,
                checked_in_at: matchedAttendee.checked_in_at,
                message: 'Attendee was already checked in.',
            };
            return HttpResponse.json(scanResponse);
        }

        const checkedInAt = new Date().toISOString();
        const checkedInAttendee: Attendee = {
            ...matchedAttendee,
            checked_in: true,
            checked_in_at: checkedInAt,
            checked_in_by: UUID.CHECKIN_STAFF,
        };
        mockAttendees = mockAttendees.map((attendee) =>
            attendee.id === checkedInAttendee.id ? checkedInAttendee : attendee,
        );
        mockInvitation = {
            ...mockInvitation,
            checked_in_count: mockInvitation.checked_in_count + 1,
        };

        const scanResponse: ScanCheckInResponse = {
            result: 'accepted',
            attendee: checkedInAttendee,
            checked_in_at: checkedInAt,
            message: null,
        };
        return HttpResponse.json(scanResponse);
    }),

    http.post('*/functions/v1/waitlist/promote', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as {
            event_id?: string;
            max_promotions?: number;
        };
        const limit = Math.max(1, body.max_promotions ?? 1);
        const promotedIds: string[] = [];

        if (
            mockInvitation.status === 'waitlisted' &&
            (!body.event_id || mockInvitation.event_id === body.event_id) &&
            promotedIds.length < limit
        ) {
            mockInvitation = { ...mockInvitation, status: 'accepted', waitlisted_at: null };
            promotedIds.push(mockInvitation.id);
        }

        mockExtraInvitations = mockExtraInvitations.map((inv) => {
            if (
                inv.status === 'waitlisted' &&
                (!body.event_id || inv.event_id === body.event_id) &&
                promotedIds.length < limit
            ) {
                promotedIds.push(inv.id);
                return { ...inv, status: 'accepted', waitlisted_at: null };
            }
            return inv;
        });

        return HttpResponse.json({
            promoted_count: promotedIds.length,
            promoted_invitation_ids: promotedIds,
        });
    }),

    // x-internal operations — documented but service-role only; MSW mirrors them
    // for completeness (same as the Prism suite's SKIP entries).
    http.post('*/functions/v1/html-scan-callback', () =>
        HttpResponse.json({ processed: true }),
    ),
    http.post('*/functions/v1/reminders/dispatch', () =>
        HttpResponse.json({ sent_count: 42 }),
    ),
];

// Convenience re-export for tests that need to simulate latency.
export { delay };
