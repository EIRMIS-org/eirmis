-- =============================================================================
-- EIRMIS pgTAP: RSVP deadline locking for invitations and guest submissions
--
-- Covers the README §6 RSVP Deadline & Locking rules:
--   - Guest invitation changes are permitted before the event RSVP deadline.
--   - New attendee rows and headcount requests are permitted before the deadline.
--   - Invitation changes, attendee inserts/updates, and headcount-request
--     inserts are rejected after the deadline.
--
-- IMPORTANT IMPLEMENTATION GAP:
--   The baseline schema has INSERT deadline triggers for attendees and
--   headcount_increase_requests, and an UPDATE deadline trigger for
--   invitations. It does not currently define an attendee UPDATE deadline
--   trigger. The assertion for attendee UPDATE is intentionally included as
--   a regression requirement and will fail until that enforcement is added.
--
-- Schema note:
--   The authoritative README schema does not define invitations.is_locked.
--   This test therefore verifies the documented event.rsvp_deadline lock. Do
--   not add an is_locked test unless the schema is formally amended.
-- =============================================================================

BEGIN;

SELECT plan(12);

-- Create a dedicated auth.users identity for this synthetic guest.
-- The event remains owned by the seeded organizer, but guests.auth_user_id is
-- unique, so the guest must not reuse the organizer's authentication UUID.
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '88888888-8888-4888-8888-888888888008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pgtap-008-auth@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
);

INSERT INTO public.events (
    id,
    organizer_id,
    title,
    slug,
    starts_at,
    ends_at,
    capacity,
    rsvp_deadline,
    visibility_mode,
    status
) VALUES (
    'a8100000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP RSVP Deadline Test',
    'pgtap-rsvp-deadline-test',
    now() + interval '2 days',
    now() + interval '3 days',
    100,
    now() + interval '1 day',
    'invite_only',
    'published'
);

INSERT INTO public.guests (id, email, full_name, auth_user_id)
VALUES (
    'a8200000-0000-4000-8000-000000000001',
    'pgtap-rsvp-deadline@example.test',
    'pgTAP RSVP Deadline Guest',
    '88888888-8888-4888-8888-888888888008'
)
ON CONFLICT (auth_user_id) DO UPDATE
SET
    id = EXCLUDED.id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
) VALUES (
    'a8300000-0000-4000-8000-000000000001',
    'a8100000-0000-4000-8000-000000000001',
    'a8200000-0000-4000-8000-000000000001',
    'accepted',
    5
);

-- The accepted invitation automatically receives its primary attendee.
INSERT INTO public.attendees (id, invitation_id, full_name, status)
VALUES (
    'a8400000-0000-4000-8000-000000000001',
    'a8300000-0000-4000-8000-000000000001',
    'Deadline Test Pending Attendee',
    'pending'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888008',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888008","role":"authenticated"}',
    true
);

-- 1. A guest may update their own invitation before the deadline.
SELECT lives_ok(
    $$UPDATE public.invitations
      SET special_requests = 'Please provide wheelchair access.'
      WHERE id = 'a8300000-0000-4000-8000-000000000001'$$,
    'guest invitation updates are allowed before the RSVP deadline'
);

-- 2. A guest may add an attendee before the deadline.
SELECT lives_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'a8400000-0000-4000-8000-000000000002',
        'a8300000-0000-4000-8000-000000000001',
        'Added Before Deadline',
        'pending'
      )$$,
    'guest attendee submissions are allowed before the RSVP deadline'
);

-- 3. A guest may edit their own pending attendee before the deadline.
SELECT lives_ok(
    $$UPDATE public.attendees
      SET full_name = 'Edited Before Deadline'
      WHERE id = 'a8400000-0000-4000-8000-000000000001'$$,
    'guest edits to their own pending attendee are allowed before the deadline'
);

-- 4. A guest may submit a headcount request before the deadline.
SELECT lives_ok(
    $$INSERT INTO public.headcount_increase_requests (
        id, invitation_id, requested_additional_heads, status, note
      ) VALUES (
        'a8500000-0000-4000-8000-000000000001',
        'a8300000-0000-4000-8000-000000000001',
        2,
        'pending',
        'Requesting two additional places before the deadline.'
      )$$,
    'guest headcount requests are allowed before the RSVP deadline'
);

-- Change the fixture to an expired deadline as the database owner. Mark the
-- earlier request rejected so the post-deadline INSERT assertion is not
-- intercepted by the one-pending-request partial unique index.
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"postgres"}', true);
UPDATE public.headcount_increase_requests
SET status = 'rejected'
WHERE id = 'a8500000-0000-4000-8000-000000000001';

UPDATE public.events
SET rsvp_deadline = now() - interval '1 hour'
WHERE id = 'a8100000-0000-4000-8000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888008',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888008","role":"authenticated"}',
    true
);

-- 5. Invitation edits must be rejected after the deadline.
SELECT throws_ok(
    $$UPDATE public.invitations
      SET special_requests = 'Attempted after deadline.'
      WHERE id = 'a8300000-0000-4000-8000-000000000001'$$,
    'P0001',
    NULL,
    'guest invitation updates are rejected after the RSVP deadline'
);

-- 6. New attendee submissions must be rejected after the deadline.
SELECT throws_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'a8400000-0000-4000-8000-000000000003',
        'a8300000-0000-4000-8000-000000000001',
        'Attempted After Deadline',
        'pending'
      )$$,
    'P0001',
    NULL,
    'attendee INSERT is rejected after the RSVP deadline'
);

-- 7. Editing an existing attendee must also be rejected after the deadline.
-- This exposes the missing attendee UPDATE deadline trigger in the baseline.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET full_name = 'Attempted Edit After Deadline'
      WHERE id = 'a8400000-0000-4000-8000-000000000001'$$,
    'P0001',
    NULL,
    'attendee UPDATE is rejected after the RSVP deadline'
);

-- 8. New headcount requests must be rejected after the deadline.
SELECT throws_ok(
    $$INSERT INTO public.headcount_increase_requests (
        id, invitation_id, requested_additional_heads, status
      ) VALUES (
        'a8500000-0000-4000-8000-000000000002',
        'a8300000-0000-4000-8000-000000000001',
        1,
        'pending'
      )$$,
    'P0001',
    NULL,
    'headcount request INSERT is rejected after the RSVP deadline'
);

-- 9-12. State assertions ensure rejected operations leave no unintended data.
SELECT is(
    (SELECT special_requests FROM public.invitations
     WHERE id = 'a8300000-0000-4000-8000-000000000001'),
    'Please provide wheelchair access.',
    'the invitation retains its last pre-deadline value'
);

SELECT is(
    (SELECT full_name FROM public.attendees
     WHERE id = 'a8400000-0000-4000-8000-000000000001'),
    'Edited Before Deadline',
    'the attendee retains its last pre-deadline name'
);

SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'a8300000-0000-4000-8000-000000000001'),
    3,
    'post-deadline attendee INSERT does not add a roster row'
);

SELECT is(
    (SELECT count(*)::integer FROM public.headcount_increase_requests
     WHERE invitation_id = 'a8300000-0000-4000-8000-000000000001'),
    1,
    'post-deadline headcount INSERT does not create another request'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
