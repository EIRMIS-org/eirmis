-- =============================================================================
-- EIRMIS pgTAP: guest attendee & invitation PostgREST write hardening
--
-- Verifies that guests cannot bypass Event Capacity, Waitlist Promotion FIFO,
-- Party Size Limit, or check-in/review integrity through direct PostgREST
-- mutations on public.attendees and public.invitations.
-- =============================================================================

BEGIN;

SELECT plan(90);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
INSERT INTO public.events (
    id, organizer_id, title, slug, starts_at, ends_at, capacity,
    rsvp_deadline, visibility_mode, status, deleted_at
) VALUES
    (
      'ab100000-0000-4000-8000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      'pgTAP Guest Hardening Event',
      'pgtap-guest-hardening-event',
      now() + interval '2 days',
      now() + interval '3 days',
      10,
      now() + interval '1 day',
      'invite_only',
      'published',
      NULL
    ),
    (
      'ab100000-0000-4000-8000-000000000002',
      '11111111-1111-1111-1111-111111111111',
      'pgTAP Full Capacity Event',
      'pgtap-full-capacity-event',
      now() + interval '2 days',
      now() + interval '3 days',
      1,
      now() + interval '1 day',
      'invite_only',
      'published',
      NULL
    ),
    (
      'ab100000-0000-4000-8000-000000000003',
      '11111111-1111-1111-1111-111111111111',
      'pgTAP Invite-Only Open Seats Event',
      'pgtap-invite-only-open-seats-event',
      now() + interval '2 days',
      now() + interval '3 days',
      5,
      now() + interval '1 day',
      'invite_only',
      'published',
      NULL
    ),
    (
      'ab100000-0000-4000-8000-000000000004',
      '11111111-1111-1111-1111-111111111111',
      'pgTAP Closed Event',
      'pgtap-closed-event',
      now() + interval '2 days',
      now() + interval '3 days',
      5,
      now() + interval '1 day',
      'invite_only',
      'closed',
      NULL
    ),
    (
      'ab100000-0000-4000-8000-000000000005',
      '11111111-1111-1111-1111-111111111111',
      'pgTAP Soft-Deleted Published Event',
      'pgtap-soft-deleted-published-event',
      now() + interval '2 days',
      now() + interval '3 days',
      5,
      now() + interval '1 day',
      'invite_only',
      'published',
      now() - interval '1 hour'
    );

INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES
    (
      '88888888-8888-4888-8888-888888888011',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'pgtap-011-guest1@example.test',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      '88888888-8888-4888-8888-888888888013',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'pgtap-011-guest3@example.test',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      '88888888-8888-4888-8888-888888888014',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'pgtap-011-guest4@example.test',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

INSERT INTO public.guests (id, email, full_name, auth_user_id)
VALUES
    (
      'ab200000-0000-4000-8000-000000000001',
      'pgtap-011-guest1@example.test',
      'pgTAP Hardening Guest 1',
      '88888888-8888-4888-8888-888888888011'
    ),
    (
      'ab200000-0000-4000-8000-000000000002',
      'pgtap-011-guest2@example.test',
      'pgTAP Capacity Holder Guest 2',
      NULL
    ),
    (
      'ab200000-0000-4000-8000-000000000003',
      'pgtap-011-guest3@example.test',
      'pgTAP Full Event Pending Guest 3',
      '88888888-8888-4888-8888-888888888013'
    ),
    (
      'ab200000-0000-4000-8000-000000000004',
      'pgtap-011-guest4@example.test',
      'pgTAP Reaccept Primary Holder Guest 4',
      '88888888-8888-4888-8888-888888888014'
    )
ON CONFLICT (auth_user_id) DO UPDATE
SET
    id = EXCLUDED.id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size, waitlisted_at
) VALUES
    -- Event 1: accepted invitation for Guest 1
    (
      'ab300000-0000-4000-8000-000000000001',
      'ab100000-0000-4000-8000-000000000001',
      'ab200000-0000-4000-8000-000000000001',
      'accepted',
      6,
      NULL
    ),
    -- Event 2 (capacity = 1): Guest 2 occupies the single seat
    (
      'ab300000-0000-4000-8000-000000000002',
      'ab100000-0000-4000-8000-000000000002',
      'ab200000-0000-4000-8000-000000000002',
      'accepted',
      1,
      NULL
    ),
    -- Event 2: Guest 1 is waitlisted
    (
      'ab300000-0000-4000-8000-000000000003',
      'ab100000-0000-4000-8000-000000000002',
      'ab200000-0000-4000-8000-000000000001',
      'waitlisted',
      1,
      now() - interval '1 hour'
    ),
    -- Event 2: Guest 3 is pending while Event 2 is full (1/1)
    (
      'ab300000-0000-4000-8000-000000000004',
      'ab100000-0000-4000-8000-000000000002',
      'ab200000-0000-4000-8000-000000000003',
      'pending',
      1,
      NULL
    ),
    -- Event 2: Guest 4 starts accepted (creating primary attendee), then moved to declined by owner below
    (
      'ab300000-0000-4000-8000-000000000005',
      'ab100000-0000-4000-8000-000000000002',
      'ab200000-0000-4000-8000-000000000004',
      'accepted',
      1,
      NULL
    ),
    -- Event 3 (capacity = 5): Guest 1 is pending
    (
      'ab300000-0000-4000-8000-000000000006',
      'ab100000-0000-4000-8000-000000000003',
      'ab200000-0000-4000-8000-000000000001',
      'pending',
      2,
      NULL
    ),
    -- Event 4 (closed): Guest 1 is pending
    (
      'ab300000-0000-4000-8000-000000000007',
      'ab100000-0000-4000-8000-000000000004',
      'ab200000-0000-4000-8000-000000000001',
      'pending',
      2,
      NULL
    ),
    -- Event 5 (soft-deleted published): Guest 1 is pending
    (
      'ab300000-0000-4000-8000-000000000008',
      'ab100000-0000-4000-8000-000000000005',
      'ab200000-0000-4000-8000-000000000001',
      'pending',
      2,
      NULL
    );

-- Move Guest 4's invitation to declined as DB owner so it retains its approved Primary Attendee
UPDATE public.invitations
SET status = 'declined'
WHERE id = 'ab300000-0000-4000-8000-000000000005';

INSERT INTO public.attendees (
    id, invitation_id, full_name, email, status,
    submitted_at, reviewed_by, reviewed_at, review_reason
) VALUES
    (
      'ab400000-0000-4000-8000-000000000001',
      'ab300000-0000-4000-8000-000000000001',
      'Pending Additional Attendee',
      'pending@example.test',
      'pending',
      '2026-10-01T10:00:00+00'::timestamptz,
      NULL,
      NULL,
      NULL
    ),
    (
      'ab400000-0000-4000-8000-000000000002',
      'ab300000-0000-4000-8000-000000000001',
      'Rejected Additional Attendee',
      'rejected@example.test',
      'rejected',
      '2026-10-01T10:00:00+00'::timestamptz,
      '11111111-1111-1111-1111-111111111111',
      '2026-10-02T12:00:00+00'::timestamptz,
      'Typo in full name'
    );

-- Switch to authenticated Guest 1 session
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888011',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888011","role":"authenticated"}',
    true
);

-- ===========================================================================
-- Slice 1: public.attendees guest INSERT and UPDATE hardening (1-17)
-- ===========================================================================

-- 1. Guest cannot INSERT an Additional Attendee directly as approved.
SELECT throws_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'ab400000-0000-4000-8000-000000000010',
        'ab300000-0000-4000-8000-000000000001',
        'Forged Approved Attendee',
        'approved'
      )$$,
    '42501',
    NULL,
    'guest cannot insert an already-approved Additional Attendee'
);

-- 2. Guest cannot INSERT an Additional Attendee with checked_in = true.
SELECT throws_ok(
    $$INSERT INTO public.attendees (
        id, invitation_id, full_name, status, checked_in, checked_in_at
      ) VALUES (
        'ab400000-0000-4000-8000-000000000011',
        'ab300000-0000-4000-8000-000000000001',
        'Forged Checked-In Attendee',
        'pending',
        true,
        now()
      )$$,
    '42501',
    NULL,
    'guest cannot insert a checked-in Additional Attendee'
);

-- 3. Guest cannot INSERT an Additional Attendee with qr_token set.
SELECT throws_ok(
    $$INSERT INTO public.attendees (
        id, invitation_id, full_name, status, qr_token
      ) VALUES (
        'ab400000-0000-4000-8000-000000000012',
        'ab300000-0000-4000-8000-000000000001',
        'Forged QR Attendee',
        'pending',
        'forged-insert-qr'
      )$$,
    '42501',
    NULL,
    'guest cannot insert an Additional Attendee with qr_token'
);

-- 4. Guest cannot INSERT an Additional Attendee with reviewer metadata set.
SELECT throws_ok(
    $$INSERT INTO public.attendees (
        id, invitation_id, full_name, status, reviewed_by, reviewed_at, review_reason
      ) VALUES (
        'ab400000-0000-4000-8000-000000000013',
        'ab300000-0000-4000-8000-000000000001',
        'Forged Reviewed Attendee',
        'pending',
        '11111111-1111-1111-1111-111111111111',
        now(),
        'Forged review'
      )$$,
    '42501',
    NULL,
    'guest cannot insert an Additional Attendee with reviewed_* metadata'
);

-- 5. Guest can INSERT a clean pending Additional Attendee.
SELECT lives_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, email)
      VALUES (
        'ab400000-0000-4000-8000-000000000014',
        'ab300000-0000-4000-8000-000000000001',
        'Valid Additional Attendee',
        'valid@example.test'
      )$$,
    'guest can insert a valid pending Additional Attendee'
);

-- 6. Guest cannot UPDATE checked_in / checked_in_at / checked_in_by.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET checked_in = true,
          checked_in_at = now(),
          checked_in_by = '88888888-8888-4888-8888-888888888011'
      WHERE id = 'ab400000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot write checked_in, checked_in_at, or checked_in_by'
);

-- 7. Guest cannot UPDATE reviewed_by / reviewed_at / review_reason.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET reviewed_by = '11111111-1111-1111-1111-111111111111',
          reviewed_at = now(),
          review_reason = 'Self-reviewed'
      WHERE id = 'ab400000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot write reviewed_by, reviewed_at, or review_reason'
);

-- 8. Guest cannot UPDATE submitted_at.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET submitted_at = now()
      WHERE id = 'ab400000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot write submitted_at directly'
);

-- 9. Guest cannot explicitly UPDATE status even from rejected to pending.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET full_name = 'Explicit Status Attempt',
          status = 'pending'
      WHERE id = 'ab400000-0000-4000-8000-000000000002'$$,
    '42501',
    NULL,
    'guest cannot explicitly set status when updating a rejected Additional Attendee'
);

-- 10-15. Guest editing full_name/email on a rejected Additional Attendee succeeds
--        and automatically resets it to pending with review metadata cleared.
SELECT lives_ok(
    $$UPDATE public.attendees
      SET full_name = 'Corrected Additional Attendee',
          email = 'corrected@example.test'
      WHERE id = 'ab400000-0000-4000-8000-000000000002'$$,
    'guest can edit full_name and email on a rejected Additional Attendee'
);

SELECT is(
    (SELECT status::text FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000002'),
    'pending',
    'resubmitting a rejected Additional Attendee automatically resets status to pending'
);

SELECT is(
    (SELECT reviewed_by FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000002'),
    NULL::uuid,
    'resubmitting a rejected Additional Attendee clears reviewed_by'
);

SELECT is(
    (SELECT reviewed_at FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000002'),
    NULL::timestamptz,
    'resubmitting a rejected Additional Attendee clears reviewed_at'
);

SELECT is(
    (SELECT review_reason FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000002'),
    NULL::text,
    'resubmitting a rejected Additional Attendee clears review_reason'
);

SELECT ok(
    (SELECT submitted_at > '2026-10-01T10:00:00+00'::timestamptz
     FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000002'),
    'resubmitting a rejected Additional Attendee refreshes submitted_at'
);

-- 16-17. Editing a pending Additional Attendee preserves status and submitted_at.
SELECT lives_ok(
    $$UPDATE public.attendees
      SET full_name = 'Updated Pending Attendee'
      WHERE id = 'ab400000-0000-4000-8000-000000000001'$$,
    'guest can edit full_name on a pending Additional Attendee'
);

SELECT is(
    (SELECT submitted_at FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000001'),
    '2026-10-01T10:00:00+00'::timestamptz,
    'editing a pending Additional Attendee preserves submitted_at'
);

-- ===========================================================================
-- Slice 2: public.invitations guest UPDATE hardening (18-44)
-- ===========================================================================

-- 18. Guest cannot raise max_party_size directly (bypassing Headcount Increase Request).
SELECT throws_ok(
    $$UPDATE public.invitations
      SET max_party_size = 50
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot mutate max_party_size directly'
);

-- 19. Guest cannot mutate cached party_size.
SELECT throws_ok(
    $$UPDATE public.invitations
      SET party_size = 0
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot mutate cached party_size'
);

-- 20. Guest cannot mutate cached checked_in_count.
SELECT throws_ok(
    $$UPDATE public.invitations
      SET checked_in_count = 1
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot mutate cached checked_in_count'
);

-- 21. Guest cannot mutate provenance/timestamp fields (responded_at / waitlisted_at).
SELECT throws_ok(
    $$UPDATE public.invitations
      SET responded_at = now() - interval '5 days'
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot mutate responded_at directly'
);

-- 22. Guest cannot change an accepted invitation to tentative (only declined is allowed before deadline).
SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'tentative'
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot change an accepted invitation to tentative'
);

-- 24. Guest can update logistics fields on an accepted invitation.
SELECT lives_ok(
    $$UPDATE public.invitations
      SET dietary_preference = 'Vegan',
          special_requests = 'Aisle seat'
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    'guest can update dietary_preference and special_requests on an accepted invitation'
);

-- 25-26. Waitlisted guest cannot self-promote to accepted or switch to tentative.
SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'accepted'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    '42501',
    NULL,
    'guest cannot self-promote a waitlisted invitation to accepted'
);

SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'tentative'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    '42501',
    NULL,
    'guest cannot change a waitlisted invitation to tentative'
);

-- 27-28. Waitlisted guest can edit logistics and opt out (waitlisted -> declined).
SELECT lives_ok(
    $$UPDATE public.invitations
      SET special_requests = 'Waitlist note'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    'waitlisted guest can update logistics fields'
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'declined'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    'waitlisted guest can decline to opt out of the waitlist'
);

SELECT is(
    (SELECT waitlisted_at FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000003'),
    NULL::timestamptz,
    'declining from waitlisted clears waitlisted_at so queue position is forfeited'
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'accepted'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    'declined guest can re-accept at full Event Capacity and re-enter waitlist'
);

SELECT is(
    (SELECT status::text FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000003'),
    'waitlisted',
    're-accepting at full Event Capacity after declining re-enters waitlisted status'
);

SELECT ok(
    (SELECT waitlisted_at > now() - interval '1 hour'
     FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000003'),
    're-entering the waitlist stamps a fresh waitlisted_at at the back of the line'
);

-- 29-35. Invite-only pending -> tentative -> accepted (capacity available).
SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'waitlisted'
      WHERE id = 'ab300000-0000-4000-8000-000000000006'$$,
    '42501',
    NULL,
    'guest cannot set status = waitlisted directly'
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'tentative'
      WHERE id = 'ab300000-0000-4000-8000-000000000006'$$,
    'guest can transition pending invitation to tentative'
);

SELECT ok(
    (SELECT responded_at IS NOT NULL FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000006'),
    'transitioning out of pending automatically populates responded_at'
);

SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'pending'
      WHERE id = 'ab300000-0000-4000-8000-000000000006'$$,
    '42501',
    NULL,
    'guest cannot revert invitation status back to pending'
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'accepted'
      WHERE id = 'ab300000-0000-4000-8000-000000000006'$$,
    'guest can accept an invite-only invitation when Event Capacity permits'
);

SELECT is(
    (SELECT status::text FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000006'),
    'accepted',
    'invitation with available Event Capacity transitions to accepted'
);

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000006'),
    1,
    'accepted invitation auto-creates Primary Attendee and updates party_size'
);

-- 36-39. Invite-only pending -> accepted at full Event Capacity auto-routes to waitlisted.
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888013',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888013","role":"authenticated"}',
    true
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'accepted'
      WHERE id = 'ab300000-0000-4000-8000-000000000004'$$,
    'guest attempting to accept at full Event Capacity is handled cleanly'
);

SELECT is(
    (SELECT status::text FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000004'),
    'waitlisted',
    'accepting at full Event Capacity auto-routes invitation to waitlisted'
);

SELECT ok(
    (SELECT waitlisted_at IS NOT NULL AND responded_at IS NOT NULL
     FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000004'),
    'auto-waitlisted invitation populates waitlisted_at and responded_at'
);

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000004'),
    0,
    'auto-waitlisted invitation does not create a Primary Attendee'
);

-- 40-41. Re-accepting at full Event Capacity after declining auto-waitlists even when
--        an immutable Primary Attendee row already exists (declining released the seat).
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888014',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888014","role":"authenticated"}',
    true
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'accepted'
      WHERE id = 'ab300000-0000-4000-8000-000000000005'$$,
    'declined guest with an existing Primary Attendee can attempt re-acceptance at full capacity'
);

SELECT is(
    (SELECT status::text FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000005'),
    'waitlisted',
    're-acceptance at full capacity after declining auto-routes to waitlisted'
);

-- 42. Guest cannot update an invitation on a closed (non-published) event.
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888011',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888011","role":"authenticated"}',
    true
);

SELECT throws_ok(
    $$UPDATE public.invitations
      SET dietary_preference = 'Halal'
      WHERE id = 'ab300000-0000-4000-8000-000000000007'$$,
    '42501',
    NULL,
    'guest cannot update an invitation on a non-published event'
);

-- 43. Guest cannot update an invitation on a soft-deleted published event.
SELECT throws_ok(
    $$UPDATE public.invitations
      SET dietary_preference = 'Halal'
      WHERE id = 'ab300000-0000-4000-8000-000000000008'$$,
    '42501',
    NULL,
    'guest cannot update an invitation on a soft-deleted published event'
);

-- 44-45. Event organizer can still update max_party_size via PostgREST.
SELECT set_config(
    'request.jwt.claim.sub',
    '11111111-1111-1111-1111-111111111111',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
    true
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET max_party_size = 8
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    'event organizer can still update max_party_size via PostgREST'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000001'),
    8,
    'organizer max_party_size update is persisted'
);

-- ===========================================================================
-- Slice 3: Non-exposed private helper & privilege boundaries
-- ===========================================================================

RESET ROLE;

-- Legacy SECURITY DEFINER capacity helper is dropped from public (not exposed via /rpc).
SELECT is(
    to_regprocedure('public.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)'),
    NULL::regprocedure,
    'public.fn_check_guest_invitation_event_capacity is removed and not exposed via /rpc'
);

-- Internal capacity helper lives in non-exposed private schema.
SELECT isnt(
    to_regprocedure('private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)'),
    NULL::regprocedure,
    'fn_check_guest_invitation_event_capacity lives in non-exposed private schema'
);

SELECT is(
    has_schema_privilege('anon', 'private', 'USAGE'),
    false,
    'anon does not have USAGE privilege on private schema'
);

SELECT is(
    has_function_privilege('public', 'private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)', 'EXECUTE'),
    false,
    'PUBLIC does not have EXECUTE privilege on private.fn_check_guest_invitation_event_capacity'
);

SELECT is(
    has_function_privilege('anon', 'private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)', 'EXECUTE'),
    false,
    'anon does not have EXECUTE privilege on private.fn_check_guest_invitation_event_capacity'
);

SELECT is(
    has_function_privilege('authenticated', 'private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)', 'EXECUTE'),
    true,
    'authenticated has EXECUTE privilege on private.fn_check_guest_invitation_event_capacity'
);

-- Trigger function EXECUTE is revoked from PUBLIC and anon, granted to authenticated.
SELECT is(
    has_function_privilege('public', 'public.fn_guard_guest_invitation_update()', 'EXECUTE'),
    false,
    'PUBLIC does not have EXECUTE privilege on fn_guard_guest_invitation_update'
);

SELECT is(
    has_function_privilege('anon', 'public.fn_guard_guest_invitation_update()', 'EXECUTE'),
    false,
    'anon does not have EXECUTE privilege on fn_guard_guest_invitation_update'
);

SELECT is(
    has_function_privilege('authenticated', 'public.fn_guard_guest_invitation_update()', 'EXECUTE'),
    true,
    'authenticated has EXECUTE privilege on fn_guard_guest_invitation_update'
);

SELECT is(
    has_function_privilege('public', 'public.fn_sync_invitation_waitlisted_at()', 'EXECUTE'),
    false,
    'PUBLIC does not have EXECUTE privilege on fn_sync_invitation_waitlisted_at'
);

SELECT is(
    has_function_privilege('anon', 'public.fn_sync_invitation_waitlisted_at()', 'EXECUTE'),
    false,
    'anon does not have EXECUTE privilege on fn_sync_invitation_waitlisted_at'
);

SELECT is(
    has_function_privilege('authenticated', 'public.fn_sync_invitation_waitlisted_at()', 'EXECUTE'),
    true,
    'authenticated has EXECUTE privilege on fn_sync_invitation_waitlisted_at'
);

-- Organizer waitlist lifecycle transitions maintain waitlisted_at consistently.
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '11111111-1111-1111-1111-111111111111',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
    true
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'declined'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    'organizer can transition a waitlisted invitation to declined'
);

SELECT is(
    (SELECT waitlisted_at FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000003'),
    NULL::timestamptz,
    'organizer waitlisted -> declined clears waitlisted_at'
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'waitlisted'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    'organizer can transition a declined invitation into waitlisted'
);

SELECT ok(
    (SELECT waitlisted_at IS NOT NULL FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000003'),
    'organizer declined -> waitlisted stamps a fresh waitlisted_at'
);

UPDATE public.invitations
SET status = 'accepted'
WHERE id = 'ab300000-0000-4000-8000-000000000003';

SELECT ok(
    (SELECT waitlisted_at IS NOT NULL FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000003'),
    'waitlisted -> accepted preserves waitlisted_at as queue history'
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'declined'
      WHERE id = 'ab300000-0000-4000-8000-000000000003'$$,
    'organizer can transition an accepted invitation to declined'
);

SELECT is(
    (SELECT waitlisted_at FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000003'),
    NULL::timestamptz,
    'organizer accepted -> declined clears preserved waitlisted_at'
);

RESET ROLE;

-- 50-51. service_role updates still bypass the SECURITY DEFINER guest guard.
SET LOCAL ROLE service_role;

SELECT lives_ok(
    $$UPDATE public.invitations
      SET max_party_size = 9
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    'service_role can update max_party_size bypassing the guest guard'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000001'),
    9,
    'service_role max_party_size update is persisted'
);

-- 52-53. DB owner updates still bypass the SECURITY DEFINER guest guard.
RESET ROLE;

SELECT lives_ok(
    $$UPDATE public.invitations
      SET max_party_size = 10
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    'DB owner can update max_party_size bypassing the guest guard'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000001'),
    10,
    'DB owner max_party_size update is persisted'
);

-- ===========================================================================
-- Slice 4: Guest attendee UPDATE deadline & non-accepted invitation guards
-- ===========================================================================

-- Event 6: published event whose rsvp_deadline has already passed.
INSERT INTO public.events (
    id, organizer_id, title, slug, starts_at, ends_at, capacity,
    rsvp_deadline, visibility_mode, status, deleted_at
) VALUES (
    'ab100000-0000-4000-8000-000000000006',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP Past Deadline Event',
    'pgtap-past-deadline-event',
    now() + interval '2 days',
    now() + interval '3 days',
    5,
    now() + interval '1 hour',
    'invite_only',
    'published',
    NULL
);

INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
) VALUES (
    'ab300000-0000-4000-8000-000000000009',
    'ab100000-0000-4000-8000-000000000006',
    'ab200000-0000-4000-8000-000000000001',
    'accepted',
    4
);

INSERT INTO public.attendees (
    id, invitation_id, full_name, email, status,
    reviewed_by, reviewed_at, review_reason
) VALUES (
    'ab400000-0000-4000-8000-000000000020',
    'ab300000-0000-4000-8000-000000000009',
    'Rejected Attendee Before Deadline',
    'rejected-deadline@example.test',
    'rejected',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '2 hours',
    'Missing surname'
);

-- Move Event 6 past its RSVP deadline as DB owner.
UPDATE public.events
SET rsvp_deadline = now() - interval '1 hour'
WHERE id = 'ab100000-0000-4000-8000-000000000006';

-- Also add a pending Additional Attendee on Guest 4's declined invitation (ab300000-...-0005
-- was re-accepted above, so decline it again as DB owner for this test).
UPDATE public.invitations
SET status = 'declined',
    max_party_size = 2
WHERE id = 'ab300000-0000-4000-8000-000000000005';

INSERT INTO public.attendees (
    id, invitation_id, full_name, email, status
) VALUES (
    'ab400000-0000-4000-8000-000000000021',
    'ab300000-0000-4000-8000-000000000005',
    'Pending Attendee On Declined Invitation',
    'declined-pending@example.test',
    'pending'
);

-- Switch to authenticated Guest 1 session to test post-deadline rejected attendee edit.
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888011',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888011","role":"authenticated"}',
    true
);

SELECT throws_ok(
    $$UPDATE public.attendees
      SET full_name = 'Edited After Deadline'
      WHERE id = 'ab400000-0000-4000-8000-000000000020'$$,
    'P0001',
    NULL,
    'guest cannot edit a rejected Additional Attendee after the RSVP deadline'
);

SELECT is(
    (SELECT status::text FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000020'),
    'rejected',
    'post-deadline edit attempt leaves rejected Additional Attendee in rejected status'
);

SELECT is(
    (SELECT full_name FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000020'),
    'Rejected Attendee Before Deadline',
    'post-deadline edit attempt preserves rejected Additional Attendee full_name'
);

-- Switch to authenticated Guest 4 session to test editing an Additional Attendee on a declined invitation.
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888014',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888014","role":"authenticated"}',
    true
);

SELECT throws_ok(
    $$UPDATE public.attendees
      SET full_name = 'Edited While Declined'
      WHERE id = 'ab400000-0000-4000-8000-000000000021'$$,
    '42501',
    NULL,
    'guest cannot edit an Additional Attendee when the parent invitation is not accepted'
);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);

-- ===========================================================================
-- Slice 5: Accepted -> declined before/after deadline, seat release & waitlist
-- ===========================================================================

-- Event 7 (capacity = 2, before deadline): Guest 1 holds 2 seats (Primary + 1 approved
-- Additional Attendee), Guest 3 is waitlisted.
INSERT INTO public.events (
    id, organizer_id, title, slug, starts_at, ends_at, capacity,
    rsvp_deadline, visibility_mode, status, deleted_at
) VALUES (
    'ab100000-0000-4000-8000-000000000007',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP Decline Releases Seats Event',
    'pgtap-decline-releases-seats-event',
    now() + interval '2 days',
    now() + interval '3 days',
    2,
    now() + interval '1 day',
    'invite_only',
    'published',
    NULL
);

INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size, waitlisted_at
) VALUES
    (
      'ab300000-0000-4000-8000-000000000010',
      'ab100000-0000-4000-8000-000000000007',
      'ab200000-0000-4000-8000-000000000001',
      'accepted',
      3,
      NULL
    ),
    (
      'ab300000-0000-4000-8000-000000000011',
      'ab100000-0000-4000-8000-000000000007',
      'ab200000-0000-4000-8000-000000000003',
      'waitlisted',
      1,
      now() - interval '30 minutes'
    );

-- Issue QR token on Guest 1's Primary Attendee and add an approved Additional Attendee.
UPDATE public.attendees
SET qr_token = 'qr-event7-primary-g1'
WHERE invitation_id = 'ab300000-0000-4000-8000-000000000010'
  AND is_primary IS TRUE;

INSERT INTO public.attendees (
    id, invitation_id, full_name, email, status,
    reviewed_by, reviewed_at, review_reason, qr_token
) VALUES (
    'ab400000-0000-4000-8000-000000000030',
    'ab300000-0000-4000-8000-000000000010',
    'Approved Additional Attendee',
    'approved-add@example.test',
    'approved',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '1 hour',
    'Approved prior to decline',
    'qr-event7-additional-g1'
);

-- Switch to authenticated Guest 1 session: decline before RSVP deadline.
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888011',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888011","role":"authenticated"}',
    true
);

SELECT lives_ok(
    $$UPDATE public.invitations
      SET status = 'declined'
      WHERE id = 'ab300000-0000-4000-8000-000000000010'$$,
    'guest can decline an accepted invitation before the RSVP deadline'
);

SELECT is(
    (SELECT status::text FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000010'),
    'declined',
    'accepted invitation transitions to declined before the RSVP deadline'
);

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000010'),
    0,
    'declining an accepted invitation releases all occupied seats (party_size = 0)'
);

SELECT ok(
    (SELECT status = 'approved' AND qr_token IS NULL
     FROM public.attendees
     WHERE invitation_id = 'ab300000-0000-4000-8000-000000000010'
       AND is_primary IS TRUE),
    'declining keeps Primary Attendee immutable while clearing its qr_token'
);

SELECT is(
    (SELECT status::text FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000030'),
    'pending',
    'declining resets approved Additional Attendees back to pending'
);

SELECT ok(
    (SELECT reviewed_by IS NULL
        AND reviewed_at IS NULL
        AND review_reason IS NULL
        AND qr_token IS NULL
     FROM public.attendees
     WHERE id = 'ab400000-0000-4000-8000-000000000030'),
    'declining clears review metadata and qr_token on reset Additional Attendees'
);

-- Declining after the RSVP deadline (Event 6, invitation ab300000-...-0009) is rejected.
SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'declined'
      WHERE id = 'ab300000-0000-4000-8000-000000000009'$$,
    'P0001',
    NULL,
    'guest cannot decline an accepted invitation after the RSVP deadline'
);

SELECT ok(
    (SELECT status = 'accepted' AND party_size = 1
     FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000009'),
    'post-deadline decline rejection leaves accepted invitation and party_size intact'
);

-- Waitlist Promotion fills the freed seat on Event 7.
RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
    (SELECT array_agg(id) FROM public.promote_waitlist_fifo(
        'ab100000-0000-4000-8000-000000000007',
        1
    )),
    ARRAY['ab300000-0000-4000-8000-000000000011'::uuid],
    'Waitlist Promotion fills the seat freed by declining before the deadline'
);

SELECT ok(
    (SELECT status = 'accepted' AND party_size = 1
     FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000011'),
    'promoted invitation becomes accepted with party_size = 1'
);

-- Check in Guest 3's Primary Attendee as DB owner; declining after check-in must fail.
RESET ROLE;
UPDATE public.attendees
SET checked_in = true,
    checked_in_at = now(),
    checked_in_by = '11111111-1111-1111-1111-111111111111'
WHERE invitation_id = 'ab300000-0000-4000-8000-000000000011'
  AND is_primary IS TRUE;

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888013',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888013","role":"authenticated"}',
    true
);

SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'declined'
      WHERE id = 'ab300000-0000-4000-8000-000000000011'$$,
    '42501',
    NULL,
    'guest cannot decline an accepted invitation after an attendee has checked in'
);

SELECT is(
    (SELECT status::text FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000011'),
    'accepted',
    'checked-in invitation remains accepted after rejected decline attempt'
);

-- ===========================================================================
-- Slice 6: Check-in and organizer approval guards on declined invitations
-- ===========================================================================

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);

-- Insert a pending Headcount Increase Request on Guest 1's declined Event 7 invitation.
INSERT INTO public.headcount_increase_requests (
    id, invitation_id, requested_additional_heads, status, note
) VALUES (
    'ab500000-0000-4000-8000-000000000001',
    'ab300000-0000-4000-8000-000000000010',
    2,
    'pending',
    'Submitted before decline'
);

SET LOCAL ROLE service_role;

-- 88. record_attendee_check_in rejects an attendee on a declined invitation even though
--     the immutable Primary Attendee row retains status = approved.
SELECT throws_ok(
    format(
        $$SELECT public.record_attendee_check_in(
            %L::uuid,
            'ab100000-0000-4000-8000-000000000007'::uuid,
            '11111111-1111-1111-1111-111111111111'::uuid,
            'organizer'::public.audit_actor_type_enum,
            '11111111-1111-1111-1111-111111111111'::uuid
        )$$,
        (SELECT id FROM public.attendees
         WHERE invitation_id = 'ab300000-0000-4000-8000-000000000010'
           AND is_primary IS TRUE)
    ),
    'P0001',
    NULL,
    'record_attendee_check_in rejects an approved Primary Attendee on a declined invitation'
);

-- 89. decide_attendee rejects approving a pending Additional Attendee on a declined invitation.
SELECT throws_ok(
    $$SELECT public.decide_attendee(
        'ab400000-0000-4000-8000-000000000030'::uuid,
        'approve',
        '11111111-1111-1111-1111-111111111111'::uuid,
        false,
        'Should fail on declined invitation'
    )$$,
    'P0001',
    NULL,
    'decide_attendee rejects approving an Additional Attendee on a declined invitation'
);

-- 90. decide_headcount_request rejects approving a pending request on a declined invitation.
SELECT throws_ok(
    $$SELECT public.decide_headcount_request(
        'ab500000-0000-4000-8000-000000000001'::uuid,
        'approve',
        '11111111-1111-1111-1111-111111111111'::uuid,
        'Should fail on declined invitation'
    )$$,
    'P0001',
    NULL,
    'decide_headcount_request rejects approving a request on a declined invitation'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
