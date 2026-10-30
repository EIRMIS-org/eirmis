/**
 * scripts/generate-postman-collection.ts
 *
 * Generates the official EIRMIS Postman Collection (v2.1.0) and environment files,
 * strictly organized by EIRMIS role:
 *   1. Public
 *   2. Organizer
 *   3. Admin
 *   4. Guest
 *   5. Check-in Staff
 *
 * Usage:
 *   npx tsx scripts/generate-postman-collection.ts
 */

import * as fs from 'fs';
import * as path from 'path';

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
};

function parseUrl(rawUrl: string) {
  // rawUrl is like {{baseUrl}}/rest/v1/events?visibility_mode=eq.open_registration
  const [baseAndPath, queryString] = rawUrl.split('?');
  const pathParts = baseAndPath.replace('{{baseUrl}}/', '').split('/');
  
  const query = queryString
    ? queryString.split('&').map((param) => {
        const [k, ...vParts] = param.split('=');
        return {
          key: k,
          value: decodeURIComponent(vParts.join('=')),
        };
      })
    : [];

  return {
    raw: rawUrl,
    host: ['{{baseUrl}}'],
    path: pathParts,
    query: query.length > 0 ? query : undefined,
  };
}

interface RequestDefinition {
  name: string;
  description?: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  isFormData?: boolean;
  tests?: string[];
}

function buildItem(def: RequestDefinition) {
  const headerList: Array<{ key: string; value: string; type: string }> = [];

  if (def.headers) {
    for (const [k, v] of Object.entries(def.headers)) {
      headerList.push({
        key: k,
        value: v,
        type: 'text',
      });
    }
  }

  let requestBody: Record<string, unknown> | undefined = undefined;

  if (def.isFormData) {
    requestBody = {
      mode: 'formdata',
      formdata: [
        {
          key: 'event_id',
          value: '{{eventId}}',
          type: 'text',
        },
        {
          key: 'file',
          type: 'file',
          src: [],
          description: 'Single self-contained HTML invitation file (<5MB, valid DOCTYPE, no external resources)',
        },
      ],
    };
  } else if (def.body !== undefined) {
    if (!headerList.some((h) => h.key.toLowerCase() === 'content-type')) {
      headerList.push({
        key: 'Content-Type',
        value: 'application/json',
        type: 'text',
      });
    }
    requestBody = {
      mode: 'raw',
      raw: JSON.stringify(def.body, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  const defaultTests = def.tests ?? [
    'pm.test("Status code is 2xx", function () {',
    '    pm.response.to.be.success;',
    '});',
  ];

  return {
    name: def.name,
    request: {
      method: def.method,
      header: headerList,
      body: requestBody,
      url: parseUrl(def.url),
      description: def.description,
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: defaultTests,
        },
      },
    ],
    response: [],
  };
}

// ─── Folders Definition ──────────────────────────────────────────────────────

const publicRequests: RequestDefinition[] = [
  {
    name: 'Discover Published Open-Registration Events',
    description: 'Unauthenticated public query to find published events allowing open registration.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/events?visibility_mode=eq.open_registration&status=eq.published&select=*',
  },
  {
    name: 'View Public Event Gallery Images',
    description: 'Unauthenticated public lookup of gallery photos configured for an open-registration event.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/invitation_images?event_id=eq.{{eventId}}&order=sort_order.asc&select=*',
  },
  {
    name: 'Register for Open-Registration Event',
    description: 'Public self-registration handled by Supabase Edge Function.',
    method: 'POST',
    url: '{{baseUrl}}/functions/v1/register',
    body: {
      event_id: '{{eventId}}',
      email: 'newguest@example.com',
      full_name: 'Juan dela Cruz',
    },
    tests: [
      'pm.test("Registration successful (201 Created)", function () {',
      '    pm.response.to.have.status(201);',
      '});',
    ],
  },
];

const organizerSubfolders = [
  {
    name: '1. Events',
    items: [
      {
        name: 'List Own Events',
        description: 'Returns all events created by or accessible to the authenticated organizer.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/events?select=*&order=created_at.desc',
      },
      {
        name: 'Create Event',
        description: 'Creates a new event draft for the authenticated organizer.',
        method: 'POST' as const,
        url: '{{baseUrl}}/rest/v1/events',
        headers: { Prefer: 'return=representation' },
        body: {
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
          visibility_mode: 'invite_only',
          status: 'draft',
        },
        tests: [
          'pm.test("Event created (201 Created)", function () {',
          '    pm.response.to.have.status(201);',
          '    var json = pm.response.json();',
          '    if (Array.isArray(json) && json[0]?.id) {',
          '        pm.collectionVariables.set("eventId", json[0].id);',
          '    }',
          '});',
        ],
      },
      {
        name: 'Get Event by ID',
        description: 'Reads specific event details.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/events?id=eq.{{eventId}}&select=*',
      },
      {
        name: 'Update Event',
        description: 'Updates event attributes such as capacity or title.',
        method: 'PATCH' as const,
        url: '{{baseUrl}}/rest/v1/events/eq.{{eventId}}',
        headers: { Prefer: 'return=representation' },
        body: {
          title: 'Annual Gala 2026 — Updated',
          capacity: 600,
        },
      },
    ],
  },
  {
    name: '2. Reminder Schedules',
    items: [
      {
        name: 'List Reminder Schedules',
        description: 'Lists all scheduled reminder rules configured for the event.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/reminder_schedules?event_id=eq.{{eventId}}&select=*',
      },
      {
        name: 'Create or Upsert Reminder Schedule',
        description: 'Creates a reminder schedule (days_before_event, send_time_of_day).',
        method: 'POST' as const,
        url: '{{baseUrl}}/rest/v1/reminder_schedules',
        headers: { Prefer: 'return=representation' },
        body: {
          event_id: '{{eventId}}',
          days_before_event: 7,
          send_time_of_day: '09:00',
          enabled: true,
        },
        tests: [
          'pm.test("Reminder schedule created (201 Created)", function () {',
          '    pm.response.to.have.status(201);',
          '    var json = pm.response.json();',
          '    if (Array.isArray(json) && json[0]?.id) {',
          '        pm.collectionVariables.set("reminderId", json[0].id);',
          '    }',
          '});',
        ],
      },
      {
        name: 'Delete Reminder Schedule',
        description: 'Deletes an existing reminder schedule.',
        method: 'DELETE' as const,
        url: '{{baseUrl}}/rest/v1/reminder_schedules/eq.{{reminderId}}',
        tests: [
          'pm.test("Status code is 204 No Content", function () {',
          '    pm.response.to.have.status(204);',
          '});',
        ],
      },
    ],
  },
  {
    name: '3. Guests & Invitations',
    items: [
      {
        name: 'List Guests',
        description: 'Lists registered or imported guests.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/guests?select=*',
      },
      {
        name: 'List Invitations for Event',
        description: 'Lists all invitations issued for an event.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/invitations?event_id=eq.{{eventId}}&select=*',
      },
      {
        name: 'Create Invitation',
        description: 'Issues an invitation to a guest for the event with a maximum party size.',
        method: 'POST' as const,
        url: '{{baseUrl}}/rest/v1/invitations',
        headers: { Prefer: 'return=representation' },
        body: {
          event_id: '{{eventId}}',
          guest_id: '{{guestId}}',
          max_party_size: 4,
          status: 'pending',
        },
        tests: [
          'pm.test("Invitation created (201 Created)", function () {',
          '    pm.response.to.have.status(201);',
          '    var json = pm.response.json();',
          '    if (Array.isArray(json) && json[0]?.id) {',
          '        pm.collectionVariables.set("invitationId", json[0].id);',
          '    }',
          '});',
        ],
      },
      {
        name: 'Update Invitation Max Party Size',
        description: 'Updates maximum allowed party size on an existing invitation.',
        method: 'PATCH' as const,
        url: '{{baseUrl}}/rest/v1/invitations/eq.{{invitationId}}',
        headers: { Prefer: 'return=representation' },
        body: {
          max_party_size: 6,
        },
      },
    ],
  },
  {
    name: '4. Approvals (Attendees & Headcount)',
    items: [
      {
        name: 'List Attendees for Approval',
        description: 'Lists attendees submitted under an invitation for organizer review.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/attendees?invitation_id=eq.{{invitationId}}&select=*',
      },
      {
        name: 'Decide Attendee (Approve / Reject)',
        description: 'Edge Function to approve or reject an individual attendee.',
        method: 'POST' as const,
        url: '{{baseUrl}}/functions/v1/attendees/{{attendeeId}}/decision',
        body: {
          decision: 'approve',
          reason: null,
        },
      },
      {
        name: 'List Headcount Increase Requests',
        description: 'Lists requests submitted by guests requesting additional heads beyond their initial allowance.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/headcount_increase_requests?invitation_id=eq.{{invitationId}}&select=*',
      },
      {
        name: 'Decide Headcount Increase Request',
        description: 'Edge Function to approve or reject a headcount increase request.',
        method: 'POST' as const,
        url: '{{baseUrl}}/functions/v1/headcount-requests/{{hirId}}/decision',
        body: {
          decision: 'approve',
          reason: 'Additional table space arranged',
        },
      },
    ],
  },
  {
    name: '5. Invitation Design & Gallery',
    items: [
      {
        name: 'Get Invitation Design Settings',
        description: 'Reads the active design configuration for the event (images vs html mode).',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/invitation_designs?event_id=eq.{{eventId}}&select=*',
      },
      {
        name: 'Create Invitation Design (Images Mode)',
        description: 'Sets or initializes invitation design mode to image gallery.',
        method: 'POST' as const,
        url: '{{baseUrl}}/rest/v1/invitation_designs',
        headers: { Prefer: 'return=representation' },
        body: {
          event_id: '{{eventId}}',
          design_type: 'images',
        },
      },
      {
        name: 'Upload HTML Invitation File',
        description: 'Edge Function to upload and perform automated security & structural scan on self-contained HTML invitation.',
        method: 'POST' as const,
        url: '{{baseUrl}}/functions/v1/invitation-html',
        isFormData: true,
      },
      {
        name: 'List Gallery Images',
        description: 'Lists all images uploaded to the event design gallery ordered by sort_order.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/invitation_images?event_id=eq.{{eventId}}&order=sort_order.asc&select=*',
      },
      {
        name: 'Add Gallery Image',
        description: 'Adds an image reference with storage path, sort order, and caption.',
        method: 'POST' as const,
        url: '{{baseUrl}}/rest/v1/invitation_images',
        headers: { Prefer: 'return=representation' },
        body: {
          event_id: '{{eventId}}',
          storage_path: 'designs/{{eventId}}/gallery/001.jpg',
          sort_order: 1,
          caption: 'Welcome to the Annual Gala',
        },
        tests: [
          'pm.test("Gallery image created (201 Created)", function () {',
          '    pm.response.to.have.status(201);',
          '    var json = pm.response.json();',
          '    if (Array.isArray(json) && json[0]?.id) {',
          '        pm.collectionVariables.set("imageId", json[0].id);',
          '    }',
          '});',
        ],
      },
      {
        name: 'Update Gallery Image',
        description: 'Updates sort order or caption of a gallery image.',
        method: 'PATCH' as const,
        url: '{{baseUrl}}/rest/v1/invitation_images/eq.{{imageId}}',
        headers: { Prefer: 'return=representation' },
        body: {
          sort_order: 2,
          caption: 'The venue entrance',
        },
      },
      {
        name: 'Delete Gallery Image',
        description: 'Removes a gallery image reference.',
        method: 'DELETE' as const,
        url: '{{baseUrl}}/rest/v1/invitation_images/eq.{{imageId}}',
        tests: [
          'pm.test("Status code is 204 No Content", function () {',
          '    pm.response.to.have.status(204);',
          '});',
        ],
      },
    ],
  },
  {
    name: '6. Check-in Staff Assignments',
    items: [
      {
        name: 'List Check-in Staff Assignments',
        description: 'Lists all staff assigned to assist with check-in scanning for the event.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/checkin_assignments?event_id=eq.{{eventId}}&select=*',
      },
      {
        name: 'Assign Check-in Staff',
        description: 'Delegates day-of check-in scanner access to a helper by email.',
        method: 'POST' as const,
        url: '{{baseUrl}}/rest/v1/checkin_assignments',
        headers: { Prefer: 'return=representation' },
        body: {
          event_id: '{{eventId}}',
          staff_email: 'staff@example.com',
        },
        tests: [
          'pm.test("Staff assigned (201 Created)", function () {',
          '    pm.response.to.have.status(201);',
          '    var json = pm.response.json();',
          '    if (Array.isArray(json) && json[0]?.id) {',
          '        pm.collectionVariables.set("assignmentId", json[0].id);',
          '    }',
          '});',
        ],
      },
      {
        name: 'Revoke Check-in Assignment',
        description: 'Revokes check-in staff access.',
        method: 'PATCH' as const,
        url: '{{baseUrl}}/rest/v1/checkin_assignments/eq.{{assignmentId}}',
        headers: { Prefer: 'return=representation' },
        body: {
          status: 'revoked',
        },
      },
      {
        name: 'Delete Check-in Assignment',
        description: 'Deletes a check-in assignment record.',
        method: 'DELETE' as const,
        url: '{{baseUrl}}/rest/v1/checkin_assignments/eq.{{assignmentId}}',
        tests: [
          'pm.test("Status code is 204 No Content", function () {',
          '    pm.response.to.have.status(204);',
          '});',
        ],
      },
    ],
  },
  {
    name: '7. QR Codes & Waitlist',
    items: [
      {
        name: 'Dispatch QR Code PDF Bundle',
        description: 'Edge Function to generate and email a PDF with individual attendee QR tokens.',
        method: 'POST' as const,
        url: '{{baseUrl}}/functions/v1/qr-bundle',
        body: {
          invitation_id: '{{invitationId}}',
          event_id: null,
        },
      },
      {
        name: 'Promote Waitlisted Guest',
        description: 'Edge Function to promote next waitlisted guest(s) in FIFO order.',
        method: 'POST' as const,
        url: '{{baseUrl}}/functions/v1/waitlist/promote',
        body: {
          event_id: '{{eventId}}',
          max_promotions: 1,
        },
      },
    ],
  },
  {
    name: '8. Logs & Profile',
    items: [
      {
        name: 'List Email Logs',
        description: 'Lists all transactional emails dispatched for the event.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/email_logs?event_id=eq.{{eventId}}&select=*',
      },
      {
        name: 'List Audit Log Entries',
        description: 'Lists audit log entries recording critical mutations.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/audit_log_entries?select=*',
      },
      {
        name: 'Read Own Organizer Profile',
        description: 'Reads current organizer user profile record.',
        method: 'GET' as const,
        url: '{{baseUrl}}/rest/v1/organizer_profiles?select=*',
      },
      {
        name: 'Update Own Organizer Profile',
        description: 'Updates organizer display full name.',
        method: 'PATCH' as const,
        url: '{{baseUrl}}/rest/v1/organizer_profiles/{{organizerId}}',
        headers: { Prefer: 'return=representation' },
        body: {
          full_name: 'Jack Jonel Fiel',
        },
      },
    ],
  },
];

const adminRequests: RequestDefinition[] = [
  {
    name: 'Read Own Admin Profile',
    description: 'Reads the authenticated administrator profile record.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/admin_profiles?select=*',
  },
  {
    name: 'List Organizer Verification Queue',
    description: 'Lists pending organizer accounts awaiting verification by administrator.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/organizer_profiles?status=eq.pending&limit=20&offset=0&select=*',
  },
  {
    name: 'Verify & Activate Organizer Account',
    description: 'Moves a self-registered organizer account from pending to active status.',
    method: 'PATCH',
    url: '{{baseUrl}}/rest/v1/organizer_profiles/{{organizerId}}',
    headers: { Prefer: 'return=representation' },
    body: {
      status: 'active',
    },
  },
];

const guestRequests: RequestDefinition[] = [
  {
    name: 'Update Own Guest Profile',
    description: 'Updates authenticated guest profile name.',
    method: 'PATCH',
    url: '{{baseUrl}}/rest/v1/guests/eq.{{guestId}}',
    headers: { Prefer: 'return=representation' },
    body: {
      full_name: 'Maria Santos-Cruz',
    },
  },
  {
    name: 'List Own Invitations',
    description: 'Lists invitations issued to the authenticated guest.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/invitations?select=*',
  },
  {
    name: 'Respond to RSVP (Accept / Decline)',
    description: 'Submits or updates RSVP status, dietary preferences, and special requests.',
    method: 'PATCH',
    url: '{{baseUrl}}/rest/v1/invitations/eq.{{invitationId}}',
    headers: { Prefer: 'return=representation' },
    body: {
      status: 'accepted',
      dietary_preference: 'Vegetarian',
      special_requests: null,
    },
  },
  {
    name: 'List Own Attendees',
    description: 'Lists attendees submitted under guest invitation.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/attendees?invitation_id=eq.{{invitationId}}&select=*',
  },
  {
    name: 'Submit Additional Attendee',
    description: 'Submits a named attendee under the invitation allowance for organizer approval.',
    method: 'POST',
    url: '{{baseUrl}}/rest/v1/attendees',
    headers: { Prefer: 'return=representation' },
    body: {
      invitation_id: '{{invitationId}}',
      full_name: 'Jose Santos',
      email: null,
    },
    tests: [
      'pm.test("Attendee submitted (201 Created)", function () {',
      '    pm.response.to.have.status(201);',
      '    var json = pm.response.json();',
      '    if (Array.isArray(json) && json[0]?.id) {',
      '        pm.collectionVariables.set("attendeeId", json[0].id);',
      '    }',
      '});',
    ],
  },
  {
    name: 'Edit and Resubmit Attendee',
    description: 'Updates details of an attendee (e.g. if rejected with reason).',
    method: 'PATCH',
    url: '{{baseUrl}}/rest/v1/attendees/eq.{{attendeeId}}',
    headers: { Prefer: 'return=representation' },
    body: {
      full_name: 'Jose Antonio Santos',
      email: null,
    },
  },
  {
    name: 'List Own Headcount Increase Requests',
    description: 'Lists headcount increase requests submitted for this invitation.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/headcount_increase_requests?invitation_id=eq.{{invitationId}}&select=*',
  },
  {
    name: 'Submit Headcount Increase Request',
    description: 'Submits a headcount request and emails the organizer through Resend.',
    method: 'POST',
    url: '{{baseUrl}}/functions/v1/submit-headcount-request',
    body: {
      invitation_id: '{{invitationId}}',
      requested_additional_heads: 2,
      note: 'My two siblings confirmed they can come.',
    },
    tests: [
      'pm.test("Headcount request submitted (201 Created)", function () {',
      '    pm.response.to.have.status(201);',
      '    var json = pm.response.json();',
      '    if (json.id) {',
      '        pm.collectionVariables.set("hirId", json.id);',
      '    }',
      '});',
    ],
  },
];

const checkinStaffRequests: RequestDefinition[] = [
  {
    name: 'Read Assigned Event Details',
    description: 'Scoped read allowing check-in staff to view basic event details for their assigned event.',
    method: 'GET',
    url: '{{baseUrl}}/rest/v1/events?id=eq.{{eventId}}&select=*',
  },
  {
    name: 'Scan QR Token and Record Check-in',
    description: 'Edge Function to validate signed QR attendee token and record check-in timestamp.',
    method: 'POST',
    url: '{{baseUrl}}/functions/v1/checkin/scan',
    body: {
      qr_token: 'eyJhbGciOiJIUzI1NiJ9.attendee-token-payload.signature',
    },
  },
];

// ─── Postman Collection Assembly ─────────────────────────────────────────────

function createCollection() {
  const collection = {
    info: {
      name: 'EIRMIS API',
      description:
        '# Event Invitation and RSVP Management Information System (EIRMIS) API\n\n' +
        'This Postman Collection is organized by EIRMIS role as defined in the OpenAPI 3.1 specification:\n\n' +
        '- **Public**: Unauthenticated endpoints (open-registration event discovery, gallery inspection, and public registration).\n' +
        '- **Organizer**: Event creation, reminder schedules, guest & invitation management, attendee & headcount approvals, invitation design & gallery, staff delegation, QR bundles, and audit logs.\n' +
        '- **Admin**: Admin profile inspection and organizer verification queue.\n' +
        '- **Guest**: Profile editing, RSVP response, attendee submissions, and headcount increase requests.\n' +
        '- **Check-in Staff**: Event detail inspection and day-of QR code scan & attendance recording.\n\n' +
        '### Environments & Base URLs\n' +
        '- **Stoplight Prism Mock Server**: `http://127.0.0.1:4010` (run with `npm run contract:mock`)\n' +
        '- **Supabase Local Dev**: `http://127.0.0.1:54321`\n' +
        '- **Supabase Cloud**: `https://{{project}}.supabase.co`',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: '0.1.0',
    },
    variable: [
      { key: 'baseUrl', value: 'http://127.0.0.1:4010', type: 'string' },
      { key: 'anonKey', value: 'your-supabase-anon-key', type: 'string' },
      { key: 'organizerToken', value: 'fake-organizer-jwt', type: 'string' },
      { key: 'adminToken', value: 'fake-admin-jwt', type: 'string' },
      { key: 'guestToken', value: 'fake-guest-jwt', type: 'string' },
      { key: 'checkinToken', value: 'fake-checkin-staff-jwt', type: 'string' },
      { key: 'eventId', value: UUID.EVENT, type: 'string' },
      { key: 'invitationId', value: UUID.INVITATION, type: 'string' },
      { key: 'guestId', value: UUID.GUEST, type: 'string' },
      { key: 'attendeeId', value: UUID.ATTENDEE, type: 'string' },
      { key: 'organizerId', value: UUID.ORGANIZER, type: 'string' },
      { key: 'adminId', value: UUID.ADMIN, type: 'string' },
      { key: 'assignmentId', value: UUID.ASSIGNMENT, type: 'string' },
      { key: 'reminderId', value: UUID.REMINDER, type: 'string' },
      { key: 'hirId', value: UUID.HIR, type: 'string' },
      { key: 'imageId', value: UUID.IMAGE, type: 'string' },
    ],
    item: [
      {
        name: 'Public',
        description: 'Unauthenticated operations for open-registration discovery, gallery view, and guest self-registration.',
        auth: {
          type: 'noauth',
        },
        item: publicRequests.map(buildItem),
      },
      {
        name: 'Organizer',
        description: 'Operations permitted for authenticated Event Organizers.',
        auth: {
          type: 'bearer',
          bearer: [
            { key: 'token', value: '{{organizerToken}}', type: 'string' },
          ],
        },
        item: organizerSubfolders.map((sub) => ({
          name: sub.name,
          item: sub.items.map(buildItem),
        })),
      },
      {
        name: 'Admin',
        description: 'Operations permitted for authenticated System Administrators (organizer verification queue and org administration).',
        auth: {
          type: 'bearer',
          bearer: [
            { key: 'token', value: '{{adminToken}}', type: 'string' },
          ],
        },
        item: adminRequests.map(buildItem),
      },
      {
        name: 'Guest',
        description: 'Operations permitted for authenticated Guests (RSVP response, attendee management, headcount requests).',
        auth: {
          type: 'bearer',
          bearer: [
            { key: 'token', value: '{{guestToken}}', type: 'string' },
          ],
        },
        item: guestRequests.map(buildItem),
      },
      {
        name: 'Check-in Staff',
        description: 'Operations permitted for Check-in Staff (scoped event access and day-of QR code scanning).',
        auth: {
          type: 'bearer',
          bearer: [
            { key: 'token', value: '{{checkinToken}}', type: 'string' },
          ],
        },
        item: checkinStaffRequests.map(buildItem),
      },
    ],
  };

  return collection;
}

// ─── Postman Environment Generator ───────────────────────────────────────────

function createPrismEnvironment() {
  return {
    id: 'eirmis-local-prism-env',
    name: 'EIRMIS — Local Prism Mock (4010)',
    values: [
      { key: 'baseUrl', value: 'http://127.0.0.1:4010', enabled: true },
      { key: 'anonKey', value: 'mock-anon-key', enabled: true },
      { key: 'organizerToken', value: 'Bearer fake-organizer-jwt', enabled: true },
      { key: 'adminToken', value: 'Bearer fake-admin-jwt', enabled: true },
      { key: 'guestToken', value: 'Bearer fake-guest-jwt', enabled: true },
      { key: 'checkinToken', value: 'Bearer fake-checkin-staff-jwt', enabled: true },
      { key: 'eventId', value: UUID.EVENT, enabled: true },
      { key: 'invitationId', value: UUID.INVITATION, enabled: true },
      { key: 'guestId', value: UUID.GUEST, enabled: true },
      { key: 'attendeeId', value: UUID.ATTENDEE, enabled: true },
      { key: 'organizerId', value: UUID.ORGANIZER, enabled: true },
      { key: 'adminId', value: UUID.ADMIN, enabled: true },
      { key: 'assignmentId', value: UUID.ASSIGNMENT, enabled: true },
      { key: 'reminderId', value: UUID.REMINDER, enabled: true },
      { key: 'hirId', value: UUID.HIR, enabled: true },
      { key: 'imageId', value: UUID.IMAGE, enabled: true },
    ],
    _postman_variable_scope: 'environment',
  };
}

function createSupabaseEnvironment() {
  return {
    id: 'eirmis-local-supabase-env',
    name: 'EIRMIS — Local Supabase (54321)',
    values: [
      { key: 'baseUrl', value: 'http://127.0.0.1:54321', enabled: true },
      { key: 'anonKey', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.local-supabase-anon-key', enabled: true },
      { key: 'organizerToken', value: 'your-organizer-jwt', enabled: true },
      { key: 'adminToken', value: 'your-admin-jwt', enabled: true },
      { key: 'guestToken', value: 'your-guest-jwt', enabled: true },
      { key: 'checkinToken', value: 'your-checkin-staff-jwt', enabled: true },
      { key: 'eventId', value: UUID.EVENT, enabled: true },
      { key: 'invitationId', value: UUID.INVITATION, enabled: true },
      { key: 'guestId', value: UUID.GUEST, enabled: true },
      { key: 'attendeeId', value: UUID.ATTENDEE, enabled: true },
      { key: 'organizerId', value: UUID.ORGANIZER, enabled: true },
      { key: 'adminId', value: UUID.ADMIN, enabled: true },
      { key: 'assignmentId', value: UUID.ASSIGNMENT, enabled: true },
      { key: 'reminderId', value: UUID.REMINDER, enabled: true },
      { key: 'hirId', value: UUID.HIR, enabled: true },
      { key: 'imageId', value: UUID.IMAGE, enabled: true },
    ],
    _postman_variable_scope: 'environment',
  };
}

// ─── File Writing ─────────────────────────────────────────────────────────────

const OUT_DIR = path.resolve(process.cwd(), 'postman');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const collectionPath = path.join(OUT_DIR, 'eirmis.postman_collection.json');
const prismEnvPath = path.join(OUT_DIR, 'eirmis.local-mock.postman_environment.json');
const supabaseEnvPath = path.join(OUT_DIR, 'eirmis.supabase-local.postman_environment.json');

fs.writeFileSync(collectionPath, JSON.stringify(createCollection(), null, 2), 'utf-8');
fs.writeFileSync(prismEnvPath, JSON.stringify(createPrismEnvironment(), null, 2), 'utf-8');
fs.writeFileSync(supabaseEnvPath, JSON.stringify(createSupabaseEnvironment(), null, 2), 'utf-8');

console.log(`✅ Postman collection generated at: ${collectionPath}`);
console.log(`✅ Prism mock environment generated at: ${prismEnvPath}`);
console.log(`✅ Supabase local environment generated at: ${supabaseEnvPath}`);
