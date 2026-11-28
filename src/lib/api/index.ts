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
export type HeadcountIncreaseRequestCreate =
    components['schemas']['HeadcountIncreaseRequestCreate'];
export type OrgSettings = components['schemas']['OrgSettings'];
export type OrgSettingsUpdate = components['schemas']['OrgSettingsUpdate'];
export type RegisterPublicRequest =
    components['schemas']['RegisterPublicRequest'];
export type OrganizerProfile = components['schemas']['OrganizerProfile'];
export type OrganizerStatus = components['schemas']['OrganizerStatus'];
export type OrganizerStatusUpdate =
    components['schemas']['OrganizerStatusUpdate'];
export type AdminProfile = components['schemas']['AdminProfile'];
export type ScanCheckInResponse = components['schemas']['ScanCheckInResponse'];
export type ReminderScheduleUpsert =
    components['schemas']['ReminderScheduleUpsert'];
export type ReminderScheduleUpdate = components['schemas']['ReminderScheduleUpdate'];

// ─── Configuration ────────────────────────────────────────────────────────────

function getEnv(): Record<string, string | undefined> {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    const procEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })?.process?.env;
    return metaEnv ?? procEnv ?? {};
}

/**
 * Resolves the API base URL.
 * Priority: VITE_API_URL → VITE_SUPABASE_URL → Prism default (port 4010).
 */
export function resolveBaseUrl(): string {
    const env = getEnv();
    return env.VITE_API_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:4010';
}

export const API_BASE = resolveBaseUrl();

/**
 * Role tokens used against the Prism mock. In M5 these are replaced by real
 * Supabase Auth JWTs — the header plumbing below does not change.
 */
export type Role = 'organizer' | 'admin' | 'guest' | 'checkin' | 'public';

/** Mock-only stand-in for the project's public key when none is configured. */
export const MOCK_PUBLIC_KEY = 'fake-anon-key';

/**
 * The project's public client key: the new-style publishable key
 * (`sb_publishable_…`) or the legacy anon JWT. Supabase's gateway requires it
 * in the `apikey` header on every request, and it doubles as the Bearer token
 * for anonymous (`public`) requests, which resolve to the `anon` Postgres role.
 * Falls back to {@link MOCK_PUBLIC_KEY} so mock traffic is shaped like real traffic.
 */
export function resolvePublicKey(): string {
    const env = getEnv();
    return (
        env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        env.VITE_SUPABASE_ANON_KEY ||
        MOCK_PUBLIC_KEY
    );
}

const PUBLIC_KEY = resolvePublicKey();

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

/** Unified API error with the original response body retained when available. */
export class ApiError extends Error {
    readonly code: string;
    readonly details: string | null;
    readonly hint: string | null;
    readonly status: number;
    /** Original JSON response body for endpoints with structured error data. */
    readonly responseBody: unknown;

    constructor(
        payload: ErrorSchema,
        status: number,
        responseBody: unknown = null,
    ) {
        super(payload.message);
        this.name = 'ApiError';
        this.code = payload.code;
        this.details = payload.details ?? null;
        this.hint = payload.hint ?? null;
        this.status = status;
        this.responseBody = responseBody;
    }
}

/**
 * Parse non-2xx responses from both the shared Error schema and Edge Functions
 * that use an `{ error: string }` message field. Preserve the original body for
 * callers that need structured partial-success data, such as public registration.
 */
async function toApiError(response: Response): Promise<ApiError> {
    let payload: Partial<ErrorSchema> | null = null;
    let responseBody: unknown = null;

    try {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            responseBody = (await response.json()) as unknown;
            // PostgREST may return an array of errors; Edge Functions return the object.
            const candidate = Array.isArray(responseBody)
                ? responseBody[0]
                : responseBody;
            if (candidate && typeof candidate === 'object') {
                const body = candidate as Record<string, unknown>;
                // The register-public Edge Function uses `error`, while standard
                // PostgREST responses use the shared Error schema's `message`.
                const message =
                    typeof body.message === 'string'
                        ? body.message
                        : typeof body.error === 'string'
                            ? body.error
                            : undefined;

                if (message) {
                    payload = {
                        code: typeof body.code === 'string' ? body.code : undefined,
                        message,
                        details: typeof body.details === 'string' ? body.details : null,
                        hint: typeof body.hint === 'string' ? body.hint : null,
                    };
                }
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
        responseBody,
    );
}

// ─── Request core ─────────────────────────────────────────────────────────────

export interface RequestOptions {
    /** Query parameters — values are URL-encoded; pass PostgREST filters pre-built (e.g. `eq.<uuid>`). */
    query?: Record<string, string | number | undefined>;
    /** Extra headers (e.g. `Prefer`). */
    headers?: Record<string, string>;
    /**
     * Request body. `FormData` is sent as multipart as-is (the browser sets the
     * boundary); anything else is JSON-serialized.
     */
    body?: unknown;
    /** Override the active role for this request only. */
    role?: Role;
    /**
     * Send the request anonymously (as the `public` role) regardless of the
     * active role. The public key is still attached; it's required by the gateway.
     */
    noAuth?: boolean;
}

/**
 * Supabase auth headers: `apikey` is always the project public key; `Authorization`
 * carries the role's JWT, or the public key for anonymous requests. Never emits
 * an `undefined` token.
 */
function buildAuthHeaders(role: Role): Record<string, string> {
    const token = role === 'public' ? PUBLIC_KEY : ROLE_TOKENS[role];
    return { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` };
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

    const requestHeaders: Record<string, string> = {
        ...headers,
        ...buildAuthHeaders(noAuth ? 'public' : (role ?? activeRole)),
    };

    let requestBody: BodyInit | undefined;
    if (body instanceof FormData) {
        // No Content-Type: fetch sets multipart/form-data with the boundary.
        requestBody = body;
    } else if (body !== undefined) {
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

/** GET /rest/v1/invitation_images — public gallery for an event (delegates to {@link listInvitationImages} with `auth: false`). */
export function listPublicGalleryImages(
    eventId: string,
): Promise<ListOk<operations['listInvitationImages']>> {
    return listInvitationImages(eventId, { auth: false });
}

/** POST /functions/v1/register-public — public self-registration. */
export function registerPublicGuest(
    body: components['schemas']['RegisterPublicRequest'],
): Promise<Ok<operations['registerPublicGuest']>> {
    return request('POST', '/functions/v1/register-public', { noAuth: true, body });
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
        query: { on_conflict: 'event_id,days_before_event' },
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    });
}

/** PATCH /rest/v1/reminder_schedules?id=eq.{id} — update an existing schedule. */
export function updateReminderSchedule(
    id: string,
    body: ReminderScheduleUpdate,
): Promise<Ok<operations['updateReminderSchedule']>> {
    return request('PATCH', '/rest/v1/reminder_schedules', {
        query: { id: `eq.${id}` },
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

/** PostgREST equality filter helper: `eq(value)` -> `"eq.<value>"`. */
export function eq(value: string): string {
    return `eq.${value}`;
}

/** PostgREST list inclusion filter helper: `inList(['a', 'b'])` -> `"in.(a,b)"`. */
export function inList(values: readonly string[]): string {
    return `in.(${values.join(',')})`;
}

/** Maximum invitation UUIDs per `invitation_id=in.(...)` request (~2.8KB query string). */
export const ATTENDEE_IN_LIST_CHUNK_SIZE = 75;

/** Maximum invitation UUIDs per headcount request `invitation_id=in.(...)` (~2.8KB query string). */
export const HEADCOUNT_IN_LIST_CHUNK_SIZE = 75;

/** GET /rest/v1/attendees — list attendees for an invitation. */
export function listAttendees(
    query?: operations['listAttendees']['parameters']['query'],
): Promise<ListOk<operations['listAttendees']>> {
    return request('GET', '/rest/v1/attendees', { query });
}

/**
 * Helper to paginate through all pages of a request until fewer than limit rows return.
 */
export async function allPages<T>(
    load: (page: { limit: number; offset: number }) => Promise<T[]>,
    limit = 500,
): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += limit) {
        const page = await load({ limit, offset });
        rows.push(...page);
        if (page.length < limit) return rows;
    }
}

/**
 * GET /rest/v1/attendees — fetch attendees across arbitrarily many invitations
 * by chunking `invitation_id=in.(...)` requests in parallel and deduplicating
 * the merged result by attendee ID.
 */
export async function listAttendeesByInvitationIds(
    invitationIds: readonly string[],
    chunkSize = ATTENDEE_IN_LIST_CHUNK_SIZE,
): Promise<ListOk<operations['listAttendees']>> {
    const uniqueIds = Array.from(new Set(invitationIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
        return [];
    }

    const safeChunkSize = Math.max(1, Math.floor(chunkSize));
    const chunks: string[][] = [];
    for (let index = 0; index < uniqueIds.length; index += safeChunkSize) {
        chunks.push(uniqueIds.slice(index, index + safeChunkSize));
    }

    const batches = await Promise.all(
        chunks.map((chunk) =>
            allPages((page) =>
                listAttendees({ ...page, invitation_id: inList(chunk) }),
            ),
        ),
    );

    const seen = new Set<string>();
    const merged: Attendee[] = [];
    for (const batch of batches) {
        for (const attendee of batch) {
            if (!seen.has(attendee.id)) {
                seen.add(attendee.id);
                merged.push(attendee);
            }
        }
    }
    return merged;
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

/**
 * GET /rest/v1/headcount_increase_requests — fetch headcount requests across arbitrarily many invitations
 * by chunking `invitation_id=in.(...)` requests in parallel and deduplicating
 * the merged result by request ID.
 */
export async function listHeadcountRequestsByInvitationIds(
    invitationIds: readonly string[],
    chunkSize = HEADCOUNT_IN_LIST_CHUNK_SIZE,
): Promise<ListOk<operations['listHeadcountRequests']>> {
    const uniqueIds = Array.from(new Set(invitationIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
        return [];
    }

    const safeChunkSize = Math.max(1, Math.floor(chunkSize));
    const chunks: string[][] = [];
    for (let index = 0; index < uniqueIds.length; index += safeChunkSize) {
        chunks.push(uniqueIds.slice(index, index + safeChunkSize));
    }

    const batches = await Promise.all(
        chunks.map((chunk) =>
            allPages((page) =>
                listHeadcountRequests({ ...page, invitation_id: inList(chunk) }),
            ),
        ),
    );

    const seen = new Set<string>();
    const merged: HeadcountIncreaseRequest[] = [];
    for (const batch of batches) {
        for (const req of batch) {
            if (!seen.has(req.id)) {
                seen.add(req.id);
                merged.push(req);
            }
        }
    }
    return merged;
}

/** POST /functions/v1/submit-headcount-request — submit a headcount request (guest). */
export function submitHeadcountRequest(
    body: components['schemas']['HeadcountIncreaseRequestCreate'],
): Promise<Ok<operations['submitHeadcountRequest']>> {
    return request('POST', '/functions/v1/submit-headcount-request', {
        body,
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

export interface ListInvitationImagesOptions {
    /**
     * Whether to attach authenticated headers (defaults to `true`).
     * Set to `false` for public gallery browsing without credentials.
     */
    auth?: boolean;
}

/** GET /rest/v1/invitation_images — list gallery images for an event. */
export function listInvitationImages(
    eventId: string,
    options?: ListInvitationImagesOptions,
): Promise<ListOk<operations['listInvitationImages']>> {
    return request('GET', '/rest/v1/invitation_images', {
        noAuth: options?.auth === false,
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
    eventId?: string,
): Promise<ListOk<operations['listCheckInAssignments']>> {
    return request('GET', '/rest/v1/checkin_assignments', {
        // Staff callers omit eventId: RLS scopes rows to the caller's auth_user_id.
        query: eventId ? { event_id: `eq.${eventId}` } : undefined,
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
export function listAuditLogEntries(
    query?: operations['listAuditLogEntries']['parameters']['query'],
): Promise<
    ListOk<operations['listAuditLogEntries']>
> {
    return request('GET', '/rest/v1/audit_log_entries', { query });
}

/** GET /rest/v1/organizer_profiles — read own organizer profile. */
export function getOrganizerProfile(): Promise<
    ListOk<operations['adminListOrganizers']>
> {
    return request('GET', '/rest/v1/organizer_profiles');
}

/** PATCH /rest/v1/organizer_profiles?id=eq.{id} — update own profile (organizer). */
export function updateOrganizerProfile(
    id: string,
    body: components['schemas']['OrganizerProfileUpdate'],
): Promise<Ok<operations['adminUpdateOrganizerStatus']>> {
    return request('PATCH', '/rest/v1/organizer_profiles', {
        query: { id: `eq.${id}` },
        body,
        headers: { Prefer: 'return=representation' },
    });
}

/** POST /functions/v1/invitation-html — upload HTML invitation (multipart). */
export function uploadInvitationHtml(
    eventId: string,
    file: File,
): Promise<Ok<operations['uploadInvitationHtml']>> {
    const form = new FormData();
    form.append('event_id', eventId);
    form.append('file', file);

    return request('POST', '/functions/v1/invitation-html', { body: form });
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
): Promise<ListOk<operations['adminListOrganizers']>> {
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
): Promise<Ok<operations['adminUpdateOrganizerStatus']>> {
    return request('PATCH', '/rest/v1/organizer_profiles', {
        role: 'admin',
        query: { id: `eq.${id}` },
        body: { status } satisfies OrganizerStatusUpdate,
        headers: { Prefer: 'return=representation' },
    });
}

/** GET /rest/v1/org_settings — read organization settings singleton. */
export function getOrgSettings(): Promise<
    ListOk<operations['getOrgSettings']>
> {
    return request('GET', '/rest/v1/org_settings', { role: 'admin' });
}

/** PATCH /rest/v1/org_settings?id=eq.{id} — update org settings singleton. */
export function updateOrgSettings(
    body: components['schemas']['OrgSettingsUpdate'],
): Promise<Ok<operations['updateOrgSettings']>> {
    return request('PATCH', '/rest/v1/org_settings', {
        role: 'admin',
        query: { id: 'eq.00000000-0000-0000-0000-000000000001' },
        body,
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

export interface ScanCheckInParams {
    qrToken: string;
    eventId?: string;
}

/** POST /functions/v1/checkin/scan — scan a QR token and record check-in. */
export function scanCheckIn(
    params: ScanCheckInParams | string,
    legacyEventId?: string,
): Promise<Ok<operations['scanCheckIn']>> {
    const qrToken = typeof params === 'string' ? params : params.qrToken;
    const eventId = typeof params === 'string' ? legacyEventId : params.eventId;
    return request('POST', '/functions/v1/checkin/scan', {
        role: 'checkin',
        body: {
            qr_token: qrToken,
            event_id: eventId,
        } satisfies components['schemas']['ScanCheckInRequest'],
    });
}

// ─── Default export: namespaced client ────────────────────────────────────────

const api = {
    allPages,
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
    updateReminderSchedule,
    deleteReminderSchedule,
    listGuests,
    listInvitations,
    createInvitation,
    updateInvitation,
    listAttendees,
    listAttendeesByInvitationIds,
    submitAttendee,
    updateAttendee,
    listHeadcountRequests,
    listHeadcountRequestsByInvitationIds,
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
    getOrgSettings,
    updateOrgSettings,
    // guest
    updateGuestProfile,
    // check-in staff
    getAssignedEvent,
    scanCheckIn,
};

export default api;
