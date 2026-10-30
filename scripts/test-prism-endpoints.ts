/**
 * scripts/test-prism-endpoints.ts
 *
 * Automated Prism Endpoint Test Suite — EIRMIS Task 02 / Issue #83
 *
 * Runs every operation in the OpenAPI contract against the Stoplight Prism
 * mock server, organised by role. Verifies:
 *   • Happy paths  — each role gets the expected 2xx for their allowed endpoints.
 *   • Error paths  — 401 for missing auth; 403, 404, 422, 400, 409 for documented errors.
 *   • Internal ops — x-internal endpoints are SKIPPED (documented reason below).
 *
 * Usage:
 *   npm run contract:mock            # terminal 1 — keep Prism running
 *   npm run contract:test            # terminal 2 — run this suite
 *
 * Or set PRISM_URL to override the default base URL:
 *   PRISM_URL=http://127.0.0.1:4010 npm run contract:test
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type Role =
  | 'Public'
  | 'Organizer'
  | 'Admin'
  | 'Guest'
  | 'Check-in Staff'
  | 'No Auth (401)'
  | 'Error (403)'
  | 'Error (404)'
  | 'Error (422)'
  | 'Error (400)'
  | 'Error (409)';

interface TestCase {
  /** Human-readable description printed in the results table. */
  description: string;
  /** HTTP method. */
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /**
   * Path relative to PRISM_URL. Include any required query parameters.
   * Path parameters follow the OpenAPI path templates (e.g. /rest/v1/events/eq.<uuid>).
   */
  path: string;
  /** Role label shown in the results table. */
  role: Role;
  /**
   * Request headers. Omit `Authorization` for public / no-auth cases.
   */
  headers?: Record<string, string>;
  /** JSON request body for POST / PATCH operations. */
  body?: unknown;
  /** Expected HTTP status code from Prism. */
  expectedStatus: number;
  /**
   * When true the test is registered but NOT executed.
   * Used for x-internal operations that are service-role only and
   * unreachable from the SPA — they are documented here for completeness.
   */
  skip?: boolean;
  /** Reason shown in the SKIP row when skip === true. */
  skipReason?: string;
}

// ─── Well-known example values (from contract/components/schemas) ─────────────

const UUID = {
  ORGANIZER:    '11111111-1111-1111-1111-111111111111',
  ADMIN:        '22222222-2222-2222-2222-222222222222',
  GUEST:        '33333333-3333-3333-3333-333333333333',
  CHECKIN_STAFF:'44444444-4444-4444-4444-444444444444',
  EVENT:        '55555555-5555-5555-5555-555555555555',
  INVITATION:   '66666666-6666-6666-6666-666666666666',
  ATTENDEE:     '77777777-7777-7777-7777-777777777777',
  ASSIGNMENT:   '88888888-8888-8888-8888-888888888888',
  REMINDER:     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  HIR:          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  DESIGN:       'cccccccc-cccc-cccc-cccc-cccccccccccc',
  IMAGE:        'dddddddd-dddd-dddd-dddd-dddddddddddd',
  SETTINGS:     '00000000-0000-0000-0000-000000000001',
} as const;

// ─── Fake role tokens ─────────────────────────────────────────────────────────

const TOKEN = {
  ORGANIZER:    'Bearer fake-organizer-jwt',
  ADMIN:        'Bearer fake-admin-jwt',
  GUEST:        'Bearer fake-guest-jwt',
  CHECKIN:      'Bearer fake-checkin-staff-jwt',
} as const;

// ─── Shared header presets ────────────────────────────────────────────────────

const H = {
  organizer:   { Authorization: TOKEN.ORGANIZER, 'Content-Type': 'application/json' },
  admin:       { Authorization: TOKEN.ADMIN,     'Content-Type': 'application/json' },
  guest:       { Authorization: TOKEN.GUEST,     'Content-Type': 'application/json' },
  checkin:     { Authorization: TOKEN.CHECKIN,   'Content-Type': 'application/json' },
  /** No Authorization — used for 401 error-path tests. */
  noAuth:      { 'Content-Type': 'application/json' },
  /** No Authorization and no Content-Type — used for public GET endpoints. */
  public:      {} as Record<string, string>,
  /** `Prefer: return=representation` on mutating requests. */
  orgRepr:     { Authorization: TOKEN.ORGANIZER, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  guestRepr:   { Authorization: TOKEN.GUEST,     'Content-Type': 'application/json', Prefer: 'return=representation' },
};

// ─── Test cases ───────────────────────────────────────────────────────────────

// Helper for multipart/form-data upload
function createHtmlUploadFormData(): FormData {
  const fd = new FormData();
  fd.append('event_id', UUID.EVENT);
  fd.append(
    'file',
    new Blob(['<!DOCTYPE html><html><body><h1>Invitation</h1></body></html>'], { type: 'text/html' }),
    'invitation.html'
  );
  return fd;
}

const testCases: TestCase[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // 01 — PUBLIC (no auth required)
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Public: discover open-registration published events (slug lookup)',
    role:           'Public',
    method:         'GET',
    path:           '/rest/v1/events?visibility_mode=eq.open_registration&status=eq.published',
    headers:        H.public,
    expectedStatus: 200,
  },
  {
    description:    'Public: list gallery images for an open-registration event (no auth)',
    role:           'Public',
    method:         'GET',
    path:           `/rest/v1/invitation_images?event_id=eq.${UUID.EVENT}&order=sort_order.asc`,
    headers:        H.public,
    expectedStatus: 200,
  },
  {
    description:    'Public: register for an open-registration event',
    role:           'Public',
    method:         'POST',
    path:           '/functions/v1/register',
    headers:        { 'Content-Type': 'application/json' },
    body:           {
      event_id:  UUID.EVENT,
      email:     'newguest@example.com',
      full_name: 'Juan dela Cruz',
    },
    expectedStatus: 201,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 02 — ORGANIZER: Events
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list own events',
    role:           'Organizer',
    method:         'GET',
    path:           '/rest/v1/events',
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: create a new event',
    role:           'Organizer',
    method:         'POST',
    path:           '/rest/v1/events',
    headers:        H.orgRepr,
    body:           {
      title:           'Annual Gala 2026',
      slug:            'annual-gala-2026',
      description:     'A celebration of achievements and milestones.',
      starts_at:       '2026-12-15T18:00:00+08:00',
      ends_at:         '2026-12-15T22:00:00+08:00',
      event_timezone:  'Asia/Manila',
      venue_name:      'Grand Ballroom',
      address:         '123 Rizal Avenue',
      city:            'Cebu City',
      capacity:        500,
      rsvp_deadline:   '2026-12-01T23:59:59+08:00',
      visibility_mode: 'invite_only',
      status:          'draft',
    },
    expectedStatus: 201,
  },
  {
    description:    'Organizer: update an event (PATCH)',
    role:           'Organizer',
    method:         'PATCH',
    path:           `/rest/v1/events/eq.${UUID.EVENT}`,
    headers:        H.orgRepr,
    body:           { title: 'Annual Gala 2026 — Updated', capacity: 600 },
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 03 — ORGANIZER: Reminder Schedules
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list reminder schedules for an event',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/reminder_schedules?event_id=eq.${UUID.EVENT}`,
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: upsert a reminder schedule (POST)',
    role:           'Organizer',
    method:         'POST',
    path:           '/rest/v1/reminder_schedules',
    headers:        H.orgRepr,
    body:           {
      event_id:         UUID.EVENT,
      days_before_event: 7,
      send_time_of_day:  '09:00',
      enabled:           true,
    },
    expectedStatus: 201,
  },
  {
    description:    'Organizer: delete a reminder schedule',
    role:           'Organizer',
    method:         'DELETE',
    path:           `/rest/v1/reminder_schedules/eq.${UUID.REMINDER}`,
    headers:        H.organizer,
    expectedStatus: 204,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 04 — ORGANIZER: Guests
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list guests for an event',
    role:           'Organizer',
    method:         'GET',
    path:           '/rest/v1/guests',
    headers:        H.organizer,
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 05 — ORGANIZER: Invitations
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list invitations for an event',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/invitations?event_id=eq.${UUID.EVENT}`,
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: create an invitation',
    role:           'Organizer',
    method:         'POST',
    path:           '/rest/v1/invitations',
    headers:        H.orgRepr,
    body:           {
      event_id:      UUID.EVENT,
      guest_id:      UUID.GUEST,
      max_party_size: 4,
      status:        'pending',
    },
    expectedStatus: 201,
  },
  {
    description:    'Organizer: update invitation (raise max_party_size)',
    role:           'Organizer',
    method:         'PATCH',
    path:           `/rest/v1/invitations/eq.${UUID.INVITATION}`,
    headers:        H.orgRepr,
    body:           { max_party_size: 6 },
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 06 — ORGANIZER: Attendees (approval queue)
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list attendees for an event',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/attendees?invitation_id=eq.${UUID.INVITATION}`,
    headers:        H.organizer,
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 07 — ORGANIZER: Headcount Increase Requests
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list headcount increase requests',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/headcount_increase_requests?invitation_id=eq.${UUID.INVITATION}`,
    headers:        H.organizer,
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 08 — ORGANIZER: Invitation Design
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: get invitation design for an event',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/invitation_designs?event_id=eq.${UUID.EVENT}`,
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: create invitation design record (images mode)',
    role:           'Organizer',
    method:         'POST',
    path:           '/rest/v1/invitation_designs',
    headers:        H.orgRepr,
    body:           { event_id: UUID.EVENT, design_type: 'images' },
    expectedStatus: 201,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 09 — ORGANIZER: Gallery Images
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list gallery images for an event',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/invitation_images?event_id=eq.${UUID.EVENT}&order=sort_order.asc`,
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: add a gallery image',
    role:           'Organizer',
    method:         'POST',
    path:           '/rest/v1/invitation_images',
    headers:        H.orgRepr,
    body:           {
      event_id:     UUID.EVENT,
      storage_path: `designs/${UUID.EVENT}/gallery/001.jpg`,
      sort_order:    1,
      caption:      'Welcome to the Annual Gala',
    },
    expectedStatus: 201,
  },
  {
    description:    'Organizer: update gallery image (reorder/caption)',
    role:           'Organizer',
    method:         'PATCH',
    path:           `/rest/v1/invitation_images/eq.${UUID.IMAGE}`,
    headers:        H.orgRepr,
    body:           { sort_order: 2, caption: 'The venue entrance' },
    expectedStatus: 204,
  },
  {
    description:    'Organizer: delete a gallery image',
    role:           'Organizer',
    method:         'DELETE',
    path:           `/rest/v1/invitation_images/eq.${UUID.IMAGE}`,
    headers:        H.organizer,
    expectedStatus: 204,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 10 — ORGANIZER: Check-in Staff Assignments
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list check-in assignments for an event',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/checkin_assignments?event_id=eq.${UUID.EVENT}`,
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: create a check-in assignment',
    role:           'Organizer',
    method:         'POST',
    path:           '/rest/v1/checkin_assignments',
    headers:        H.orgRepr,
    body:           { event_id: UUID.EVENT, staff_email: 'staff@example.com' },
    expectedStatus: 201,
  },
  {
    description:    'Organizer: revoke a check-in assignment (PATCH)',
    role:           'Organizer',
    method:         'PATCH',
    path:           `/rest/v1/checkin_assignments/eq.${UUID.ASSIGNMENT}`,
    headers:        H.orgRepr,
    body:           { status: 'revoked' },
    expectedStatus: 204,
  },
  {
    description:    'Organizer: delete a check-in assignment',
    role:           'Organizer',
    method:         'DELETE',
    path:           `/rest/v1/checkin_assignments/eq.${UUID.ASSIGNMENT}`,
    headers:        H.organizer,
    expectedStatus: 204,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 11 — ORGANIZER: Email Logs & Audit
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: list email logs for an event',
    role:           'Organizer',
    method:         'GET',
    path:           `/rest/v1/email_logs?event_id=eq.${UUID.EVENT}`,
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: list audit log entries for an event',
    role:           'Organizer',
    method:         'GET',
    path:           '/rest/v1/audit_log_entries',
    headers:        H.organizer,
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 12 — ORGANIZER: Profile
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: read own organizer profile',
    role:           'Organizer',
    method:         'GET',
    path:           '/rest/v1/organizer_profiles',
    headers:        H.organizer,
    expectedStatus: 200,
  },
  {
    description:    'Organizer: update own profile (full_name)',
    role:           'Organizer',
    method:         'PATCH',
    path:           `/rest/v1/organizer_profiles/${UUID.ORGANIZER}`,
    headers:        H.orgRepr,
    body:           { full_name: 'Jack Jonel Fiel' },
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 13 — ORGANIZER: Edge Functions
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Organizer: upload HTML invitation (Edge Function)',
    role:           'Organizer',
    method:         'POST',
    path:           '/functions/v1/invitation-html',
    headers:        { Authorization: TOKEN.ORGANIZER },
    body:           createHtmlUploadFormData(),
    expectedStatus: 200,
  },
  {
    description:    'Organizer: approve/reject an attendee (Edge Function)',
    role:           'Organizer',
    method:         'POST',
    path:           `/functions/v1/attendees/${UUID.ATTENDEE}/decision`,
    headers:        H.organizer,
    body:           { decision: 'approve', reason: null },
    expectedStatus: 200,
  },
  {
    description:    'Organizer: approve/reject a headcount request (Edge Function)',
    role:           'Organizer',
    method:         'POST',
    path:           `/functions/v1/headcount-requests/${UUID.HIR}/decision`,
    headers:        H.organizer,
    body:           { decision: 'approve', reason: 'Additional table space arranged' },
    expectedStatus: 200,
  },
  {
    description:    'Organizer: dispatch QR code PDF bundle (Edge Function)',
    role:           'Organizer',
    method:         'POST',
    path:           '/functions/v1/qr-bundle',
    headers:        H.organizer,
    body:           { invitation_id: UUID.INVITATION },
    expectedStatus: 200,
  },
  {
    description:    'Organizer: promote next waitlisted invitation (Edge Function)',
    role:           'Organizer',
    method:         'POST',
    path:           '/functions/v1/waitlist/promote',
    headers:        H.organizer,
    body:           { event_id: UUID.EVENT, max_promotions: 1 },
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 14 — ADMIN
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Admin: read own admin profile',
    role:           'Admin',
    method:         'GET',
    path:           '/rest/v1/admin_profiles',
    headers:        H.admin,
    expectedStatus: 200,
  },
  {
    description:    'Admin: list organizer profiles (verification queue, 20-item page)',
    role:           'Admin',
    method:         'GET',
    path:           '/rest/v1/organizer_profiles?status=eq.pending&limit=20&offset=0',
    headers:        H.admin,
    expectedStatus: 200,
  },
  {
    description:    'Admin: activate an organizer account (status → active)',
    role:           'Admin',
    method:         'PATCH',
    path:           `/rest/v1/organizer_profiles/${UUID.ORGANIZER}`,
    headers:        { ...H.admin, Prefer: 'return=representation' },
    body:           { status: 'active' },
    expectedStatus: 200,
  },
  {
    description:    'Admin: read organization settings singleton',
    role:           'Admin',
    method:         'GET',
    path:           '/rest/v1/org_settings',
    headers:        H.admin,
    expectedStatus: 200,
  },
  {
    description:    'Admin: update organization settings (PATCH)',
    role:           'Admin',
    method:         'PATCH',
    path:           `/rest/v1/org_settings/${UUID.SETTINGS}`,
    headers:        { ...H.admin, Prefer: 'return=representation' },
    body:           {
      org_name: 'EIRMIS Enterprise Cloud Platform',
      default_timezone: 'Asia/Manila',
      default_capacity_ceiling: 150,
      malware_sandbox_enabled: true,
      self_registration_gate_enabled: true,
    },
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 15 — GUEST
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Guest: update own profile (full_name)',
    role:           'Guest',
    method:         'PATCH',
    path:           `/rest/v1/guests/eq.${UUID.GUEST}`,
    headers:        H.guestRepr,
    body:           { full_name: 'Maria Santos-Cruz' },
    expectedStatus: 200,
  },
  {
    description:    'Guest: list own invitations',
    role:           'Guest',
    method:         'GET',
    path:           '/rest/v1/invitations',
    headers:        H.guest,
    expectedStatus: 200,
  },
  {
    description:    'Guest: accept invitation (RSVP PATCH)',
    role:           'Guest',
    method:         'PATCH',
    path:           `/rest/v1/invitations/eq.${UUID.INVITATION}`,
    headers:        H.guestRepr,
    body:           { status: 'accepted', dietary_preference: 'Vegetarian', special_requests: null },
    expectedStatus: 200,
  },
  {
    description:    'Guest: list own attendees for an invitation',
    role:           'Guest',
    method:         'GET',
    path:           `/rest/v1/attendees?invitation_id=eq.${UUID.INVITATION}`,
    headers:        H.guest,
    expectedStatus: 200,
  },
  {
    description:    'Guest: submit an additional attendee (POST)',
    role:           'Guest',
    method:         'POST',
    path:           '/rest/v1/attendees',
    headers:        H.guestRepr,
    body:           {
      invitation_id: UUID.INVITATION,
      full_name:     'Jose Santos',
      email:         null,
    },
    expectedStatus: 201,
  },
  {
    description:    'Guest: edit and resubmit a rejected attendee (PATCH)',
    role:           'Guest',
    method:         'PATCH',
    path:           `/rest/v1/attendees/eq.${UUID.ATTENDEE}`,
    headers:        H.guestRepr,
    body:           { full_name: 'Jose Antonio Santos', email: null },
    expectedStatus: 200,
  },
  {
    description:    'Guest: list own headcount increase requests',
    role:           'Guest',
    method:         'GET',
    path:           `/rest/v1/headcount_increase_requests?invitation_id=eq.${UUID.INVITATION}`,
    headers:        H.guest,
    expectedStatus: 200,
  },
  {
    description:    'Guest: submit a headcount increase request',
    role:           'Guest',
    method:         'POST',
    path:           '/rest/v1/headcount_increase_requests',
    headers:        H.guestRepr,
    body:           {
      invitation_id:              UUID.INVITATION,
      requested_additional_heads: 2,
      note:                       'My two siblings confirmed they can come.',
    },
    expectedStatus: 201,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 16 — CHECK-IN STAFF
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    'Check-in Staff: read assigned event',
    role:           'Check-in Staff',
    method:         'GET',
    path:           `/rest/v1/events?id=eq.${UUID.EVENT}`,
    headers:        H.checkin,
    expectedStatus: 200,
  },
  {
    description:    'Check-in Staff: scan a QR token and record check-in',
    role:           'Check-in Staff',
    method:         'POST',
    path:           '/functions/v1/checkin/scan',
    headers:        H.checkin,
    body:           { qr_token: 'eyJhbGciOiJIUzI1NiJ9.attendee-token-payload.signature' },
    expectedStatus: 200,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 17 — ERROR PATHS
  // ══════════════════════════════════════════════════════════════════════════

  // 17a — 401 Unauthorized (missing Authorization header)
  {
    description:    'Error 401: no auth header → create event (POST /rest/v1/events)',
    role:           'No Auth (401)',
    method:         'POST',
    path:           '/rest/v1/events',
    headers:        H.noAuth,
    body:           { title: 'Unauthorized Event' },
    expectedStatus: 401,
  },
  {
    description:    'Error 401: no auth header → list organizer profiles',
    role:           'No Auth (401)',
    method:         'GET',
    path:           '/rest/v1/organizer_profiles',
    headers:        H.noAuth,
    expectedStatus: 401,
  },
  {
    description:    'Error 401: no auth header → list invitations',
    role:           'No Auth (401)',
    method:         'GET',
    path:           '/rest/v1/invitations',
    headers:        H.noAuth,
    expectedStatus: 401,
  },
  {
    description:    'Error 401: no auth header → list attendees',
    role:           'No Auth (401)',
    method:         'GET',
    path:           '/rest/v1/attendees',
    headers:        H.noAuth,
    expectedStatus: 401,
  },
  {
    description:    'Error 401: no auth header → read admin profile',
    role:           'No Auth (401)',
    method:         'GET',
    path:           '/rest/v1/admin_profiles',
    headers:        H.noAuth,
    expectedStatus: 401,
  },
  {
    description:    'Error 401: no auth header → read organization settings',
    role:           'No Auth (401)',
    method:         'GET',
    path:           '/rest/v1/org_settings',
    headers:        H.noAuth,
    expectedStatus: 401,
  },

  // 17b — 403 Forbidden (documented contract responses)
  {
    description:    'Error 403: Forbidden on scan check-in',
    role:           'Error (403)',
    method:         'POST',
    path:           '/functions/v1/checkin/scan',
    headers:        { ...H.checkin, Prefer: 'code=403' },
    body:           { qr_token: 'invalid.token' },
    expectedStatus: 403,
  },
  {
    description:    'Error 403: Forbidden on attendee approval decision',
    role:           'Error (403)',
    method:         'POST',
    path:           `/functions/v1/attendees/${UUID.ATTENDEE}/decision`,
    headers:        { ...H.organizer, Prefer: 'code=403' },
    body:           { decision: 'approve' },
    expectedStatus: 403,
  },

  // 17c — 404 Not Found
  {
    description:    'Error 404: Attendee not found on decision',
    role:           'Error (404)',
    method:         'POST',
    path:           `/functions/v1/attendees/${UUID.ATTENDEE}/decision`,
    headers:        { ...H.organizer, Prefer: 'code=404' },
    body:           { decision: 'approve' },
    expectedStatus: 404,
  },

  // 17d — 422 Unprocessable Entity
  {
    description:    'Error 422: Structural scan rejected HTML upload',
    role:           'Error (422)',
    method:         'POST',
    path:           '/functions/v1/invitation-html',
    headers:        { ...H.organizer, Prefer: 'code=422' },
    body:           null,
    expectedStatus: 422,
  },

  // 17e — 400 Bad Request & 409 Conflict
  {
    description:    'Error 400: Malformed registration request',
    role:           'Error (400)',
    method:         'POST',
    path:           '/functions/v1/register',
    headers:        { 'Content-Type': 'application/json', Prefer: 'code=400' },
    body:           { event_id: UUID.EVENT, email: 'bad-request', full_name: '' },
    expectedStatus: 400,
  },
  {
    description:    'Error 409: Duplicate guest registration for event',
    role:           'Error (409)',
    method:         'POST',
    path:           '/functions/v1/register',
    headers:        { 'Content-Type': 'application/json', Prefer: 'code=409' },
    body:           { event_id: UUID.EVENT, email: 'duplicate@example.com', full_name: 'Existing Guest' },
    expectedStatus: 409,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 18 — INTERNAL (x-internal: true — skipped, service-role only)
  // ══════════════════════════════════════════════════════════════════════════

  {
    description:    '[INTERNAL] html-scan-callback — third-party scanner webhook',
    role:           'Organizer',
    method:         'POST',
    path:           '/functions/v1/html-scan-callback',
    headers:        H.organizer,
    body:           { scan_id: 'abc123', result: 'clean', file_hash: 'sha256:deadbeef' },
    expectedStatus: 200,
    skip:           true,
    skipReason:     'x-internal: service-role webhook — unreachable from the SPA',
  },
  {
    description:    '[INTERNAL] reminders/dispatch — pg_cron scheduled job',
    role:           'Organizer',
    method:         'POST',
    path:           '/functions/v1/reminders/dispatch',
    headers:        H.organizer,
    body:           {},
    expectedStatus: 200,
    skip:           true,
    skipReason:     'x-internal: triggered by pg_cron — unreachable from the SPA',
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

const PRISM_URL = process.env.PRISM_URL ?? 'http://127.0.0.1:4010';

const COL = {
  ROLE:   20,
  METHOD:  7,
  PATH:   60,
  EXP:     4,
  GOT:     4,
  RESULT: 12,
} as const;

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function divider(char = '─'): string {
  const total = COL.ROLE + COL.METHOD + COL.PATH + COL.EXP + COL.GOT + COL.RESULT + 5 * 2;
  return char.repeat(total);
}

async function runPrismTests(): Promise<void> {
  console.log(`\nPrism Endpoint Test Suite  →  ${PRISM_URL}`);
  console.log(divider('═'));
  console.log(
    ' ' +
    pad('ROLE',   COL.ROLE)   + '  ' +
    pad('METHOD', COL.METHOD) + '  ' +
    pad('PATH',   COL.PATH)   + '  ' +
    pad('EXP',    COL.EXP)    + '  ' +
    pad('GOT',    COL.GOT)    + '  ' +
    'RESULT'
  );
  console.log(' ' + divider());

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const tc of testCases) {
    if (tc.skip) {
      skipped++;
      console.log(
        ' ' +
        pad('[SKIP]',       COL.ROLE)   + '  ' +
        pad(tc.method,      COL.METHOD) + '  ' +
        pad(tc.path,        COL.PATH)   + '  ' +
        pad('---',          COL.EXP)    + '  ' +
        pad('---',          COL.GOT)    + '  ' +
        `⏭  SKIP  (${tc.skipReason})`
      );
      continue;
    }

    let gotStatus: number | string;
    let resultSymbol: string;

    try {
      const isFormData = typeof FormData !== 'undefined' && tc.body instanceof FormData;
      const hasBody = tc.body !== null && tc.body !== undefined;

      const response = await fetch(`${PRISM_URL}${tc.path}`, {
        method:  tc.method,
        headers: tc.headers ?? {},
        body:    isFormData ? (tc.body as FormData) : (hasBody ? JSON.stringify(tc.body) : undefined),
      });

      gotStatus = response.status;

      if (response.status === tc.expectedStatus) {
        passed++;
        resultSymbol = '✅ PASS';
      } else {
        failed++;
        resultSymbol = '❌ FAIL';
      }
    } catch (err: unknown) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      gotStatus = message.length > COL.GOT ? message.slice(0, COL.GOT - 1) + '…' : message;
      resultSymbol = '❌ ERR ';
    }

    const roleLabel  = tc.role.length > COL.ROLE   ? tc.role.slice(0, COL.ROLE - 1)   + '…' : tc.role;
    const pathLabel  = tc.path.length > COL.PATH   ? tc.path.slice(0, COL.PATH - 1)   + '…' : tc.path;
    const expLabel   = String(tc.expectedStatus);
    const gotLabel   = String(gotStatus);
    const descLabel  = `  # ${tc.description}`;

    console.log(
      ' ' +
      pad(roleLabel,   COL.ROLE)   + '  ' +
      pad(tc.method,   COL.METHOD) + '  ' +
      pad(pathLabel,   COL.PATH)   + '  ' +
      pad(expLabel,    COL.EXP)    + '  ' +
      pad(gotLabel,    COL.GOT)    + '  ' +
      resultSymbol +
      descLabel
    );
  }

  console.log('\n' + divider('═'));
  console.log(
    ` Results: ${passed} passed  ${failed} failed  ${skipped} skipped` +
    `  |  Total: ${testCases.length} test cases`
  );

  if (failed > 0) {
    console.error('\n⚠️  Some tests FAILED. Check Prism is running and the contract is up to date.');
    console.error(`   Start Prism with: npm run contract:mock`);
    process.exit(1);
  } else {
    console.log('\n🚀 All active tests passed!');
  }
}

runPrismTests();
