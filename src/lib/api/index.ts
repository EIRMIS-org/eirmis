/**
 * src/lib/api/index.ts
 *
 * EIRMIS typed API client — Task 05 (Issue #84)
 *
 * A single typed entry point for the React SPA to call PostgREST and Edge
 * Function operations defined in `contract/openapi.yaml`, bound to the
 * generated types in `contract/generated/schema.d.ts`.
 *
 * Base URL resolution:
 *   - M2/M4 (mock):  VITE_API_URL → http://127.0.0.1:4010 (Stoplight Prism)
 *   - M5  (real):    VITE_API_URL → VITE_SUPABASE_URL (base-URL change only)
 *
 * Error handling:
 *   Every non-2xx response is parsed through ONE error path and thrown as
 *   `ApiError`, carrying the unified `Error` schema from
 *   `contract/components/schemas/Error.yaml` — `{ code, message, details, hint }`.
 *   If the body is not the Error schema (e.g. an HTML error page or network
 *   failure), a synthesized Error payload is created so callers always catch
 *   the same shape.
 */

// ─── Generated contract types ─────────────────────────────────────────────────

import type {
    components,
    operations,
} from '../../../contract/generated/schema';

export type ErrorSchema = components['schemas']['Error'];
export type Event = components['schemas']['Event'];
export type EventCreate = components['schemas']['EventCreate'];
export type EventUpdate = components['schemas']['EventUpdate'];
export type Guest = components['schemas']['Guest'];
export type GuestUpdate = components['schemas']['GuestUpdate'];
export type Invitation = components['schemas']['Invitation'];
export type InvitationCreate = components['schemas']['InvitationCreate'];
export type InvitationOrganizerUpdate =
    components['schemas']['InvitationOrganizerUpdate'];
export type InvitationRsvpUpdate =
    components['schemas']['InvitationRsvpUpdate'];
export type Attendee = components['schemas']['Attendee'];
export type AttendeeCreate = components['schemas']['AttendeeCreate'];
export type AttendeeUpdate = components['schemas']['AttendeeUpdate'];
export type HeadcountIncreaseRequest =
    components['schemas']['HeadcountIncreaseRequest'];
export type OrganizerProfile = components['schemas']['OrganizerProfile'];
export type OrganizerStatus = components['schemas']['OrganizerStatus'];
export type OrganizerStatusUpdate =
    components['schemas']['OrganizerStatusUpdate'];
export type AdminProfile = components['schemas']['AdminProfile'];
export type ScanCheckInResponse = components['schemas']['ScanCheckInResponse'];
export type ReminderScheduleUpsert =
    components['schemas']['ReminderScheduleUpsert'];

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Resolves the API base URL.
 * Priority: VITE_API_URL → VITE_SUPABASE_URL → Prism default (port 4010).
 */
export function resolveBaseUrl(): string {
    const env = import.meta.env as Record<string, string | undefined>;
    return env.VITE_API_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:4010';
}

export const API_BASE = resolveBaseUrl();

/**
 * Role tokens used against the Prism mock. In M5 these are replaced by real
 * Supabase Auth JWTs — the header plumbing below does not change.
 */
export type Role = 'organizer' | 'admin' | 'guest' | 'checkin' | 'public';

const ROLE_TOKENS: Record<Exclude<Role, 'public'>, string> = {
    organizer: 'fake-organizer-jwt',
    admin: 'fake-admin-jwt',
    guest: 'fake-guest-jwt',
    checkin: 'fake-checkin-staff-jwt',
};

let activeRole: Role = 'organizer';

/** Set the role whose bearer token is attached to outgoing requests. */
export function setRole(role: Role): void {
    activeRole = role;
}

export function getRole(): Role {
    return activeRole;
}

// ─── Unified error path ───────────────────────────────────────────────────────

/** Unified error matching `contract/components/schemas/Error.yaml`. */
export class ApiError extends Error {
    readonly code: string;
    readonly details: string | null;
    readonly hint: string | null;
    readonly status: number;

    constructor(payload: ErrorSchema, status: number) {
        super(payload.message);
        this.name = 'ApiError';
        this.code = payload.code;
        this.details = payload.details ?? null;
        this.hint = payload.hint ?? null;
        this.status = status;
    }
}

/**
 * Parse any non-2xx response body into the unified Error schema.
 * Falls back to a synthesized payload when the body is not JSON / Error-shaped.
 */
async function toApiError(response: Response): Promise<ApiError> {
    let payload: Partial<ErrorSchema> | null = null;

    try {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            const body = (await response.json()) as unknown;
            // PostgREST may return an array of errors; Edge Functions return the object.
            const candidate = Array.isArray(body) ? body[0] : body;
            if (
                candidate &&
                typeof candidate === 'object' &&
                'message' in candidate
            ) {
                payload = candidate as Partial<ErrorSchema>;
            }
        }
    } catch {
        // body unreadable — fall through to synthesized payload
    }

    return new ApiError(
        {
            code: payload?.code ?? String(response.status),
            message:
                payload?.message ?? `Request failed with status ${response.status}`,
            details: payload?.details ?? null,
            hint: payload?.hint ?? null,
        },
        response.status,
    );
}

// ─── Request core ─────────────────────────────────────────────────────────────

export interface RequestOptions {
    /** Query parameters — values are URL-encoded; pass PostgREST filters pre-built (e.g. `eq.<uuid>`). */
    query?: Record<string, string | number | undefined>;
    /** Extra headers (e.g. `Prefer`). */
    headers?: Record<string, string>;
    /** JSON-serializable request body. */
    body?: unknown;
    /** Override the active role for this request only. */
    role?: Role;
    /** Skip attaching the Authorization header (public / no-auth requests). */
    noAuth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(`${API_BASE}${path}`);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}

async function request<TResponse>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options: RequestOptions = {},
): Promise<TResponse> {
    const { query, headers = {}, body, role, noAuth } = options;

    const requestHeaders: Record<string, string> = { ...headers };

    if (!noAuth) {
        const token = ROLE_TOKENS[role ?? activeRole];
        requestHeaders['Authorization'] = `Bearer ${token}`;
        // PostgREST requires apikey alongside Authorization when talking to Supabase.
        requestHeaders['apikey'] = token;
    }

    let requestBody: string | undefined;
    if (body !== undefined) {
        requestHeaders['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
    }

    const response = await fetch(buildUrl(path, query), {
        method,
        headers: requestHeaders,
        body: requestBody,
    });

    if (!response.ok) {
        throw await toApiError(response);
    }

    // 204 No Content — nothing to parse.
    if (response.status === 204) {
        return undefined as TResponse;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
        return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
}

// ─── Typed helpers (bound to generated operations) ────────────────────────────

/** Extract the 2xx JSON response type of a contract operation. */
type Ok<TOp extends { responses: Record<string, unknown> }> =
    TOp['responses'] extends { 200: infer R200 }
    ? ExtractJson<R200>
    : TOp['responses'] extends { 201: infer R201 }
    ? ExtractJson<R201>
    : TOp['responses'] extends { 204: infer R204 }
    ? ExtractJson<R204>
    : never;

type ExtractJson<R> = R extends {
    content: { 'application/json': infer T };
}
    ? T
    : undefined;

type ListOk<TOp extends { responses: Record<string, unknown> }> =
    TOp['responses'] extends { 200: infer R200 } ? ExtractJson<R200> : never;

// ─── Public / no-auth operations ──────────────────────────────────────────────

/** GET /rest/v1/events — public discovery of open-registration published events. */
export function discoverPublicEvents(): Promise<
    ListOk<operations['listEvents']>
> {
    return request('GET', '/rest/v1/events', {
        noAuth: true,
        query: {
            visibility_mode: 'eq.open_registration',
            status: 'eq.published',
        },
    });
}

/** GET /rest/v1/invitation_images — public gallery for an event. */
export function listPublicGalleryImages(
    eventId: string,
): Promise<ListOk<operations['listInvitationImages']>> {
    return request('GET', '/rest/v1/invitation_images', {
        noAuth: true,
        query: { event_id: `eq.${eventId}`, order: 'sort_order.asc' },
    });
}

/** POST /functions/v1/register — public self-registration. */
export function registerPublicGuest(
    body: components['schemas']['RegisterPublicRequest'],
): Promise<Ok<operations['registerPublicGuest']>> {
    return request('POST', '/functions/v1/register', { noAuth: true, body });
}

// ─── Organizer operations ─────────────────────────────────────────────────────

/** GET /rest/v1/events — list the authenticated organizer's events. */
export function listEvents(
    query?: operations['listEvents']['parameters']['query'],
): Promise<ListOk<operations['listEvents']>> {
    return request('GET', '/rest/v1/events', { query });
}

/** POST /rest/v1/events — create a new event. */
export function createEvent(
    body: components['schemas']['EventCreate'],
): Promise<Ok<operations['createEvent']>> {
    return request('POST', '/rest/v1/events', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** PATCH /rest/v1/events?id=eq.{id} — update an event. */
export function updateEvent(
    id: string,
    body: components['schemas']['EventUpdate'],
): Promise<Ok<operations['updateEvent']>> {
    return request('PATCH', `/rest/v1/events`, {
        query: { id: `eq.${id}` },
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** GET /rest/v1/reminder_schedules — list reminder schedules for an event. */
export function listReminderSchedules(
    eventId: string,
): Promise<ListOk<operations['listReminderSchedules']>> {
    return request('GET', '/rest/v1/reminder_schedules', {
        query: { event_id: `eq.${eventId}` },
    });
}

/** POST /rest/v1/reminder_schedules — create/upsert a reminder schedule. */
export function upsertReminderSchedule(
    body: ReminderScheduleUpsert,
): Promise<Ok<operations['upsertReminderSchedule']>> {
    return request('POST', '/rest/v1/reminder_schedules', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** DELETE /rest/v1/reminder_schedules?id=eq.{id} — delete a reminder schedule. */
export function deleteReminderSchedule(id: string): Promise<void> {
    return request('DELETE', '/rest/v1/reminder_schedules', {
        query: { id: `eq.${id}` },
    });
}

/** GET /rest/v1/guests — list guests. */
export function listGuests(
    query?: operations['listGuests']['parameters']['query'],
): Promise<ListOk<operations['listGuests']>> {
    return request('GET', '/rest/v1/guests', { query });
}

/** GET /rest/v1/invitations — list invitations (organizer or guest view). */
export function listInvitations(
    query?: operations['listInvitations']['parameters']['query'],
): Promise<ListOk<operations['listInvitations']>> {
    return request('GET', '/rest/v1/invitations', { query });
}

/** POST /rest/v1/invitations — create an invitation. */
export function createInvitation(
    body: components['schemas']['InvitationCreate'],
): Promise<Ok<operations['createInvitation']>> {
    return request('POST', '/rest/v1/invitations', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** PATCH /rest/v1/invitations?id=eq.{id} — update invitation (RSVP / party size). */
export function updateInvitation(
    id: string,
    body: InvitationOrganizerUpdate | InvitationRsvpUpdate,
): Promise<Ok<operations['updateInvitation']>> {
    return request('PATCH', '/rest/v1/invitations', {
        query: { id: `eq.${id}` },
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** GET /rest/v1/attendees — list attendees for an invitation. */
export function listAttendees(
    query?: operations['listAttendees']['parameters']['query'],
): Promise<ListOk<operations['listAttendees']>> {
    return request('GET', '/rest/v1/attendees', { query });
}

/** POST /rest/v1/attendees — submit an additional attendee (guest). */
export function submitAttendee(
    body: components['schemas']['AttendeeCreate'],
): Promise<Ok<operations['submitAttendee']>> {
    return request('POST', '/rest/v1/attendees', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** PATCH /rest/v1/attendees?id=eq.{id} — edit/resubmit an attendee (guest). */
export function updateAttendee(
    id: string,
    body: components['schemas']['AttendeeUpdate'],
): Promise<Ok<operations['updateAttendee']>> {
    return request('PATCH', '/rest/v1/attendees', {
        query: { id: `eq.${id}` },
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** GET /rest/v1/headcount_increase_requests — list headcount requests. */
export function listHeadcountRequests(
    query?: operations['listHeadcountRequests']['parameters']['query'],
): Promise<ListOk<operations['listHeadcountRequests']>> {
    return request('GET', '/rest/v1/headcount_increase_requests', { query });
}

/** POST /rest/v1/headcount_increase_requests — submit a headcount request (guest). */
export function submitHeadcountRequest(
    body: components['schemas']['HeadcountIncreaseRequestCreate'],
): Promise<Ok<operations['submitHeadcountRequest']>> {
    return request('POST', '/rest/v1/headcount_increase_requests', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** GET /rest/v1/invitation_designs — get invitation design for an event. */
export function listInvitationDesigns(
    eventId: string,
): Promise<ListOk<operations['getInvitationDesign']>> {
    return request('GET', '/rest/v1/invitation_designs', {
        query: { event_id: `eq.${eventId}` },
    });
}

/** POST /rest/v1/invitation_designs — create a design record. */
export function createInvitationDesign(
    body: components['schemas']['InvitationDesignCreate'],
): Promise<Ok<operations['createInvitationDesign']>> {
    return request('POST', '/rest/v1/invitation_designs', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** GET /rest/v1/invitation_images — list gallery images for an event. */
export function listInvitationImages(
    eventId: string,
): Promise<ListOk<operations['listInvitationImages']>> {
    return request('GET', '/rest/v1/invitation_images', {
        query: { event_id: `eq.${eventId}`, order: 'sort_order.asc' },
    });
}

/** POST /rest/v1/invitation_images — add a gallery image. */
export function addInvitationImage(
    body: components['schemas']['InvitationImageCreate'],
): Promise<Ok<operations['addInvitationImage']>> {
    return request('POST', '/rest/v1/invitation_images', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** PATCH /rest/v1/invitation_images?id=eq.{id} — reorder/caption a gallery image. */
export function updateInvitationImage(
    id: string,
    body: components['schemas']['InvitationImageUpdate'],
): Promise<void> {
    return request('PATCH', '/rest/v1/invitation_images', {
        query: { id: `eq.${id}` },
        body,
    });
}

/** DELETE /rest/v1/invitation_images?id=eq.{id} — delete a gallery image. */
export function deleteInvitationImage(id: string): Promise<void> {
    return request('DELETE', '/rest/v1/invitation_images', {
        query: { id: `eq.${id}` },
    });
}

/** GET /rest/v1/checkin_assignments — list check-in staff assignments. */
export function listCheckInAssignments(
    eventId: string,
): Promise<ListOk<operations['listCheckInAssignments']>> {
    return request('GET', '/rest/v1/checkin_assignments', {
        query: { event_id: `eq.${eventId}` },
    });
}

/** POST /rest/v1/checkin_assignments — create a check-in assignment. */
export function createCheckInAssignment(
    body: components['schemas']['CheckInAssignmentCreate'],
): Promise<Ok<operations['createCheckInAssignment']>> {
    return request('POST', '/rest/v1/checkin_assignments', {
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** PATCH /rest/v1/checkin_assignments?id=eq.{id} — revoke/update an assignment. */
export function updateCheckInAssignment(
    id: string,
    body: components['schemas']['CheckInAssignmentUpdate'],
): Promise<void> {
    return request('PATCH', '/rest/v1/checkin_assignments', {
        query: { id: `eq.${id}` },
        body,
    });
}

/** DELETE /rest/v1/checkin_assignments?id=eq.{id} — delete an assignment. */
export function deleteCheckInAssignment(id: string): Promise<void> {
    return request('DELETE', '/rest/v1/checkin_assignments', {
        query: { id: `eq.${id}` },
    });
}

/** GET /rest/v1/email_logs — list transactional email logs for an event. */
export function listEmailLogs(
    eventId: string,
): Promise<ListOk<operations['listEmailLogs']>> {
    return request('GET', '/rest/v1/email_logs', {
        query: { event_id: `eq.${eventId}` },
    });
}

/** GET /rest/v1/audit_log_entries — list audit log entries. */
export function listAuditLogEntries(): Promise<
    ListOk<operations['listAuditLogEntries']>
> {
    return request('GET', '/rest/v1/audit_log_entries');
}

/** GET /rest/v1/organizer_profiles — read own organizer profile. */
export function getOrganizerProfile(): Promise<
    ListOk<operations['getOrganizerProfile']>
> {
    return request('GET', '/rest/v1/organizer_profiles');
}

/** PATCH /rest/v1/organizer_profiles?id=eq.{id} — update own profile (organizer). */
export function updateOrganizerProfile(
    id: string,
    body: components['schemas']['OrganizerProfileUpdate'],
): Promise<Ok<operations['updateOrganizerProfile']>> {
    return request('PATCH', '/rest/v1/organizer_profiles', {
        query: { id: `eq.${id}` },
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** POST /functions/v1/invitation-html — upload HTML invitation (multipart). */
export async function uploadInvitationHtml(
    eventId: string,
    file: File,
): Promise<Ok<operations['uploadInvitationHtml']>> {
    const form = new FormData();
    form.append('event_id', eventId);
    form.append('file', file);

    const response = await fetch(`${API_BASE}/functions/v1/invitation-html`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ROLE_TOKENS[activeRole]}` },
        body: form,
    });

    if (!response.ok) throw await toApiError(response);
    return (await response.json()) as Ok<operations['uploadInvitationHtml']>;
}

/** POST /functions/v1/attendees/{id}/decision — approve/reject an attendee. */
export function decideAttendee(
    id: string,
    body: components['schemas']['AttendeeDecisionRequest'],
): Promise<Ok<operations['decideAttendee']>> {
    return request('POST', `/functions/v1/attendees/${id}/decision`, { body });
}

/** POST /functions/v1/headcount-requests/{id}/decision — approve/reject headcount. */
export function decideHeadcountRequest(
    id: string,
    body: components['schemas']['HeadcountDecisionRequest'],
): Promise<Ok<operations['decideHeadcountRequest']>> {
    return request('POST', `/functions/v1/headcount-requests/${id}/decision`, {
        body,
    });
}

/** POST /functions/v1/qr-bundle — dispatch QR code PDF bundle. */
export function dispatchQrBundle(
    body: components['schemas']['QrBundleRequest'],
): Promise<Ok<operations['dispatchQrBundle']>> {
    return request('POST', '/functions/v1/qr-bundle', { body });
}

/** POST /functions/v1/waitlist/promote — promote next waitlisted invitation(s). */
export function promoteWaitlist(
    body: components['schemas']['WaitlistPromoteRequest'],
): Promise<Ok<operations['promoteWaitlist']>> {
    return request('POST', '/functions/v1/waitlist/promote', { body });
}

// ─── Admin operations ─────────────────────────────────────────────────────────

/** GET /rest/v1/admin_profiles — read own admin profile. */
export function getAdminProfile(): Promise<
    ListOk<operations['getAdminProfile']>
> {
    return request('GET', '/rest/v1/admin_profiles', { role: 'admin' });
}

/**
 * GET /rest/v1/organizer_profiles?status=eq.pending — admin verification queue.
 * @param page zero-based page number (20 items per page)
 */
export function getAdminOrganizers(
    page = 0,
    status = 'eq.pending',
): Promise<ListOk<operations['getOrganizerProfile']>> {
    return request('GET', '/rest/v1/organizer_profiles', {
        role: 'admin',
        query: { status, limit: 20, offset: page * 20 },
    });
}

/**
 * PATCH /rest/v1/organizer_profiles?id=eq.{id} — admin activates/suspends an
 * organizer account (status → active | suspended).
 */
export function updateOrganizerStatus(
    id: string,
    status: components['schemas']['OrganizerStatus'],
): Promise<Ok<operations['updateOrganizerProfile']>> {
    return request('PATCH', '/rest/v1/organizer_profiles', {
        role: 'admin',
        query: { id: `eq.${id}` },
        body: { status } satisfies OrganizerStatusUpdate,
        headers: { Prefer: 'return=representation' },
    });
}

// ─── Guest operations ─────────────────────────────────────────────────────────

/** PATCH /rest/v1/guests?id=eq.{id} — update own guest profile. */
export function updateGuestProfile(
    id: string,
    body: components['schemas']['GuestUpdate'],
): Promise<Ok<operations['updateGuestProfile']>> {
    return request('PATCH', '/rest/v1/guests', {
        role: 'guest',
        query: { id: `eq.${id}` },
        body,
        headers: { Prefer: 'return=representation' },
    });
}

// ─── Check-in Staff operations ────────────────────────────────────────────────

/** GET /rest/v1/events?id=eq.{id} — read the assigned event (staff-scoped). */
export function getAssignedEvent(
    eventId: string,
): Promise<ListOk<operations['listEvents']>> {
    return request('GET', '/rest/v1/events', {
        role: 'checkin',
        query: { id: `eq.${eventId}` },
    });
}

/** POST /functions/v1/checkin/scan — scan a QR token and record check-in. */
export function scanCheckIn(
    qrToken: string,
): Promise<Ok<operations['scanCheckIn']>> {
    return request('POST', '/functions/v1/checkin/scan', {
        role: 'checkin',
        body: { qr_token: qrToken } satisfies components['schemas']['ScanCheckInRequest'],
    });
}

// ─── Default export: namespaced client ────────────────────────────────────────

const api = {
    // config
    API_BASE,
    setRole,
    getRole,
    // public
    discoverPublicEvents,
    listPublicGalleryImages,
    registerPublicGuest,
    // organizer
    listEvents,
    createEvent,
    updateEvent,
    listReminderSchedules,
    upsertReminderSchedule,
    deleteReminderSchedule,
    listGuests,
    listInvitations,
    createInvitation,
    updateInvitation,
    listAttendees,
    submitAttendee,
    updateAttendee,
    listHeadcountRequests,
    submitHeadcountRequest,
    listInvitationDesigns,
    createInvitationDesign,
    listInvitationImages,
    addInvitationImage,
    updateInvitationImage,
    deleteInvitationImage,
    listCheckInAssignments,
    createCheckInAssignment,
    updateCheckInAssignment,
    deleteCheckInAssignment,
    listEmailLogs,
    listAuditLogEntries,
    getOrganizerProfile,
    updateOrganizerProfile,
    uploadInvitationHtml,
    decideAttendee,
    decideHeadcountRequest,
    dispatchQrBundle,
    promoteWaitlist,
    // admin
    getAdminProfile,
    getAdminOrganizers,
    updateOrganizerStatus,
    // guest
    updateGuestProfile,
    // check-in staff
    getAssignedEvent,
    scanCheckIn,
};

export default api;
