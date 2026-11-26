-- =============================================================================
-- EIRMIS pgTAP: guest attendee & invitation PostgREST write hardening
--
-- Verifies that guests cannot bypass Event Capacity, Waitlist Promotion FIFO,
-- Party Size Limit, or check-in/review integrity through direct PostgREST
-- mutations on public.attendees and public.invitations.
-- =============================================================================

BEGIN;

SELECT plan(45);

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

-- 22-23. Guest cannot leave accepted status (Primary Attendee is immutable).
SELECT throws_ok(
    $$UPDATE public.invitations
      SET status = 'declined'
      WHERE id = 'ab300000-0000-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'guest cannot change an accepted invitation to declined'
);

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

-- 40-41. Re-accepting at full Event Capacity when an approved Primary Attendee already exists.
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
    'guest with an existing approved Primary Attendee can re-accept at full capacity'
);

SELECT is(
    (SELECT status::text FROM public.invitations
     WHERE id = 'ab300000-0000-4000-8000-000000000005'),
    'accepted',
    're-acceptance with existing Primary Attendee stays accepted'
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

-- 43-44. Event organizer can still update max_party_size via PostgREST.
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

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
