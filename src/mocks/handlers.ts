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
 * Error paths: requests WITHOUT an Authorization header receive the documented
 * `401` response carrying the unified Error schema `{ code, message, details, hint }`.
 */

import { http, HttpResponse, delay } from 'msw';
import type { components } from '../../contract/generated/schema';

type ErrorSchema = components['schemas']['Error'];
type Event = components['schemas']['Event'];
type Guest = components['schemas']['Guest'];
type Invitation = components['schemas']['Invitation'];
type Attendee = components['schemas']['Attendee'];
type HeadcountIncreaseRequest =
    components['schemas']['HeadcountIncreaseRequest'];
type OrganizerProfile = components['schemas']['OrganizerProfile'];
type AdminProfile = components['schemas']['AdminProfile'];
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

/** True when the request carries any Authorization header. */
function hasAuth(request: Request): boolean {
    return request.headers.has('Authorization');
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
        const suffix = String(index).padStart(2, '0');
        return {
            ...exampleOrganizerProfile,
            id: `11111111-1111-1111-1111-1111111111${suffix}`,
            email: `organizer${suffix}@example.com`,
            full_name: `Organizer ${suffix}`,
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

const exampleAuditEntries: AuditLogEntry[] = [exampleAuditEntry];

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
            return jsonList([
                {
                    ...exampleEvent,
                    visibility_mode: 'open_registration' as const,
                    status: 'published' as const,
                },
            ]);
        }
        return jsonList([exampleEvent]);
    }),

    http.post('*/rest/v1/events', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Event>;
        return HttpResponse.json(
            { ...exampleEvent, ...body, id: exampleEvent.id, organizer_id: UUID.ORGANIZER },
            { status: 201 },
        );
    }),

    http.patch('*/rest/v1/events', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Event>;
        return HttpResponse.json({ ...exampleEvent, ...body });
    }),

    // ═══ PostgREST: reminder_schedules ═══
    http.get('*/rest/v1/reminder_schedules', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, [exampleReminder], 'event_id'));
    }),

    http.post('*/rest/v1/reminder_schedules', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<ReminderSchedule>;
        return HttpResponse.json(
            { ...exampleReminder, ...body, id: UUID.REMINDER },
            { status: 201 },
        );
    }),

    http.delete('*/rest/v1/reminder_schedules', () => new HttpResponse(null, { status: 204 })),

    // ═══ PostgREST: guests ═══
    http.get('*/rest/v1/guests', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList([exampleGuest]);
    }),

    http.patch('*/rest/v1/guests', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Guest>;
        return HttpResponse.json({ ...exampleGuest, ...body });
    }),

    // ═══ PostgREST: invitations ═══
    http.get('*/rest/v1/invitations', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, [exampleInvitation], 'event_id'));
    }),

    http.post('*/rest/v1/invitations', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Invitation>;
        return HttpResponse.json(
            { ...exampleInvitation, ...body, status: 'pending' as const, party_size: 0 },
            { status: 201 },
        );
    }),

    http.patch('*/rest/v1/invitations', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Invitation>;
        return HttpResponse.json({ ...exampleInvitation, ...body });
    }),

    // ═══ PostgREST: attendees ═══
    http.get('*/rest/v1/attendees', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, [exampleAttendee], 'invitation_id'));
    }),

    http.post('*/rest/v1/attendees', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Attendee>;
        return HttpResponse.json(
            {
                ...exampleAttendee,
                ...body,
                id: crypto.randomUUID(),
                is_primary: false,
                status: 'pending' as const,
                submitted_at: new Date().toISOString(),
                checked_in: false,
                is_walk_in: false,
            },
            { status: 201 },
        );
    }),

    http.patch('*/rest/v1/attendees', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<Attendee>;
        return HttpResponse.json({ ...exampleAttendee, ...body });
    }),

    // ═══ PostgREST: headcount_increase_requests ═══
    http.get('*/rest/v1/headcount_increase_requests', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, [exampleHir], 'invitation_id'));
    }),

    http.post('*/rest/v1/headcount_increase_requests', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<HeadcountIncreaseRequest>;
        return HttpResponse.json(
            { ...exampleHir, ...body, id: crypto.randomUUID(), status: 'pending' as const },
            { status: 201 },
        );
    }),

    // ═══ PostgREST: invitation_designs ═══
    http.get('*/rest/v1/invitation_designs', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, [exampleDesign], 'event_id'));
    }),

    http.post('*/rest/v1/invitation_designs', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<InvitationDesign>;
        return HttpResponse.json(
            { ...exampleDesign, ...body, id: crypto.randomUUID() },
            { status: 201 },
        );
    }),

    // ═══ PostgREST: invitation_images ═══
    http.get('*/rest/v1/invitation_images', ({ request }) => {
        // Public gallery read is allowed unauthenticated for open-registration events.
        return jsonList(filterByEq(request, [exampleImage], 'event_id'));
    }),

    http.post('*/rest/v1/invitation_images', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<InvitationImage>;
        return HttpResponse.json(
            { ...exampleImage, ...body, id: crypto.randomUUID() },
            { status: 201 },
        );
    }),

    http.patch('*/rest/v1/invitation_images', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        await request.json();
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/rest/v1/invitation_images', () => new HttpResponse(null, { status: 204 })),

    // ═══ PostgREST: checkin_assignments ═══
    http.get('*/rest/v1/checkin_assignments', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, [exampleAssignment], 'event_id'));
    }),

    http.post('*/rest/v1/checkin_assignments', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as Partial<CheckInAssignment>;
        return HttpResponse.json(
            {
                ...exampleAssignment,
                ...body,
                id: crypto.randomUUID(),
                invited_by: UUID.ORGANIZER,
                status: 'active' as const,
            },
            { status: 201 },
        );
    }),

    http.patch('*/rest/v1/checkin_assignments', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        await request.json();
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/rest/v1/checkin_assignments', () => new HttpResponse(null, { status: 204 })),

    // ═══ PostgREST: email_logs & audit_log_entries ═══
    http.get('*/rest/v1/email_logs', ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        return jsonList(filterByEq(request, [exampleEmailLog], 'event_id'));
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

    http.patch('*/rest/v1/organizer_profiles/:id', async ({ request, params }) => {
        if (!hasAuth(request)) return unauthorized();
        const id = String(params.id);
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
        return HttpResponse.json({ design: exampleDesign, errors: [] });
    }),

    http.post('*/functions/v1/attendees/:id/decision', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as { decision?: string };
        if (!body.decision) {
            return HttpResponse.json(errorBody('P0001', 'decision is required'), { status: 400 });
        }
        return HttpResponse.json({
            attendee: {
                ...exampleAttendee,
                status: body.decision === 'approve' ? ('approved' as const) : ('rejected' as const),
            },
            capacity_warning: null,
        });
    }),

    http.post('*/functions/v1/headcount-requests/:id/decision', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        const body = (await request.json()) as { decision?: string };
        return HttpResponse.json({
            ...exampleHir,
            status: body.decision === 'approve' ? ('approved' as const) : ('rejected' as const),
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
        if (body.qr_token === 'invalid.token') {
            return HttpResponse.json(errorBody('SCAN_403', 'QR token signature invalid'), { status: 403 });
        }
        const scanResponse: ScanCheckInResponse = {
            result: 'accepted',
            attendee: { ...exampleAttendee, checked_in: true },
            checked_in_at: '2026-12-15T18:07:00+08:00',
            message: null,
        };
        return HttpResponse.json(scanResponse);
    }),

    http.post('*/functions/v1/waitlist/promote', async ({ request }) => {
        if (!hasAuth(request)) return unauthorized();
        await request.json();
        return HttpResponse.json({
            promoted_count: 1,
            promoted_invitation_ids: [UUID.INVITATION],
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
