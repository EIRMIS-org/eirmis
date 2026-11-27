
-- =============================================================================
-- EIRMIS pgTAP: Public RSVP admission RPC
--
-- Tests:
--   1. Function definition and permissions.
--   2. Accepted RSVP when capacity is available.
--   3. Guest email normalization.
--   4. Matching an existing guest by email.
--   5. Duplicate registration prevention.
--   6. Automatic waitlisting when capacity is full.
--   7. No primary attendee for waitlisted invitations.
--   8. Tentative invitations do not reserve capacity.
--   9. Event registration eligibility.
--  10. Transactional guest/invitation behavior.
--
-- Uses the existing seeded active organizer:
--   11111111-1111-1111-1111-111111111111
--
-- All test data is isolated and rolled back.
-- =============================================================================

BEGIN;

SELECT plan(25);


-- =============================================================================
-- FIXTURE DATA
-- =============================================================================

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
)
VALUES
(
    'd1000000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Public RSVP Available Capacity Test',
    'pgtap-admit-available',
    now() + interval '2 days',
    now() + interval '3 days',
    3,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'd1000000-0000-4000-8000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Public RSVP Full Capacity Test',
    'pgtap-admit-full',
    now() + interval '2 days',
    now() + interval '3 days',
    1,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'd1000000-0000-4000-8000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'Public RSVP Tentative Capacity Test',
    'pgtap-admit-tentative',
    now() + interval '2 days',
    now() + interval '3 days',
    1,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'd1000000-0000-4000-8000-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'Invite Only Registration Test',
    'pgtap-admit-invite-only',
    now() + interval '2 days',
    now() + interval '3 days',
    5,
    now() + interval '1 day',
    'invite_only',
    'published'
),
(
    'd1000000-0000-4000-8000-000000000005',
    '11111111-1111-1111-1111-111111111111',
    'Draft Registration Test',
    'pgtap-admit-draft',
    now() + interval '2 days',
    now() + interval '3 days',
    5,
    now() + interval '1 day',
    'open_registration',
    'draft'
),
(
    'd1000000-0000-4000-8000-000000000006',
    '11111111-1111-1111-1111-111111111111',
    'Expired RSVP Test',
    'pgtap-admit-expired',
    now() + interval '2 days',
    now() + interval '3 days',
    5,
    now() - interval '1 day',
    'open_registration',
    'published'
);


-- ---------------------------------------------------------------------------
-- Existing guests used by the full-capacity and tentative fixtures.
-- ---------------------------------------------------------------------------

INSERT INTO public.guests (
    id,
    email,
    full_name
)
VALUES
(
    'd2000000-0000-4000-8000-000000000001',
    'pgtap-full-existing@example.test',
    'Existing Full Capacity Guest'
),
(
    'd2000000-0000-4000-8000-000000000002',
    'pgtap-tentative-existing@example.test',
    'Existing Tentative Guest'
),
(
    'd2000000-0000-4000-8000-000000000003',
    'existing.match@example.test',
    'Original Directory Name'
);


-- ---------------------------------------------------------------------------
-- Make the second event full.
--
-- The accepted invitation automatically creates one approved primary
-- attendee, consuming its only available capacity.
-- ---------------------------------------------------------------------------

INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size
)
VALUES (
    'd3000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000001',
    'accepted',
    1
);


-- ---------------------------------------------------------------------------
-- Create a tentative invitation for the third event.
--
-- Tentative invitations do not consume capacity.
-- ---------------------------------------------------------------------------

INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size
)
VALUES (
    'd3000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000003',
    'd2000000-0000-4000-8000-000000000002',
    'tentative',
    1
);


-- =============================================================================
-- 1-4. FUNCTION DEFINITION AND PERMISSIONS
-- =============================================================================

SELECT is(
    (
        SELECT pg_get_function_result(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'admit_public_rsvp'
    ),
    'invitations',
    'admit_public_rsvp returns the invitations composite type'
);

SELECT ok(
    has_function_privilege(
        'service_role',
        'public.admit_public_rsvp(text,text,text)',
        'EXECUTE'
    ),
    'service_role can execute admit_public_rsvp'
);

SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'public.admit_public_rsvp(text,text,text)',
        'EXECUTE'
    ),
    'authenticated role cannot execute admit_public_rsvp directly'
);

SELECT ok(
    NOT has_function_privilege(
        'anon',
        'public.admit_public_rsvp(text,text,text)',
        'EXECUTE'
    ),
    'anon role cannot execute admit_public_rsvp directly'
);


-- =============================================================================
-- 5-10. ACCEPTED RSVP AND PRIMARY ATTENDEE CREATION
-- =============================================================================

-- 5. An RSVP with available capacity is accepted.

SELECT is(
    (
        (
            public.admit_public_rsvp(
                'pgtap-admit-available',
                ' New.User@Example.Test ',
                'New RSVP Guest'
            )
        ).status
    )::text,
    'accepted',
    'new public RSVP is accepted when event capacity is available'
);


-- 6. Accepted invitations must not have a waitlist timestamp.

SELECT ok(
    (
        SELECT waitlisted_at IS NULL
        FROM public.invitations
        WHERE event_id = 'd1000000-0000-4000-8000-000000000001'
          AND guest_id = (
              SELECT id
              FROM public.guests
              WHERE email = 'new.user@example.test'
          )
    ),
    'accepted RSVP has no waitlisted_at timestamp'
);


-- 7. Public registration initially reserves one place.

SELECT is(
    (
        SELECT max_party_size
        FROM public.invitations
        WHERE event_id = 'd1000000-0000-4000-8000-000000000001'
          AND guest_id = (
              SELECT id
              FROM public.guests
              WHERE email = 'new.user@example.test'
          )
    ),
    1,
    'new public RSVP starts with max_party_size equal to one'
);


-- 8. The primary-attendee trigger updates party_size to one.

SELECT is(
    (
        SELECT party_size
        FROM public.invitations
        WHERE event_id = 'd1000000-0000-4000-8000-000000000001'
          AND guest_id = (
              SELECT id
              FROM public.guests
              WHERE email = 'new.user@example.test'
          )
    ),
    1,
    'accepted invitation has one approved primary attendee'
);


-- 9. Exactly one primary attendee should be created.

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.attendees a
        JOIN public.invitations i ON i.id = a.invitation_id
        WHERE i.event_id = 'd1000000-0000-4000-8000-000000000001'
          AND i.guest_id = (
              SELECT id
              FROM public.guests
              WHERE email = 'new.user@example.test'
          )
          AND a.is_primary IS TRUE
    ),
    1,
    'accepted public RSVP automatically creates one primary attendee'
);


-- 10. Email is normalized to lowercase and stripped of surrounding spaces.

SELECT is(
    (
        SELECT email
        FROM public.guests
        WHERE email = 'new.user@example.test'
    ),
    'new.user@example.test',
    'public RSVP normalizes guest email'
);


-- =============================================================================
-- 11-12. MATCHING AN EXISTING GUEST
-- =============================================================================

-- 11. Different email casing must match the existing guest record.

SELECT is(
    (
        public.admit_public_rsvp(
            'pgtap-admit-available',
            ' EXISTING.MATCH@EXAMPLE.TEST ',
            'Updated Directory Name'
        )
    ).guest_id,
    'd2000000-0000-4000-8000-000000000003'::uuid,
    'existing guest is matched by normalized email instead of duplicated'
);


-- 12. The matched guest's directory name is updated by this implementation.

SELECT is(
    (
        SELECT full_name
        FROM public.guests
        WHERE id = 'd2000000-0000-4000-8000-000000000003'
    ),
    'Updated Directory Name',
    'matched guest directory name reflects the submitted name'
);


-- =============================================================================
-- 13-15. DUPLICATE REGISTRATION AND TRANSACTION ROLLBACK
-- =============================================================================

-- 13. A guest cannot register twice for the same event.

SELECT throws_ok(
    $$
        SELECT public.admit_public_rsvp(
            'pgtap-admit-available',
            'new.user@example.test',
            'Duplicate Registration Name'
        )
    $$,
    'P0001',
    'RSVP_ALREADY_EXISTS',
    'duplicate RSVP for the same event is rejected'
);


-- 14. The failed registration must not create another invitation.

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.invitations i
        JOIN public.guests g ON g.id = i.guest_id
        WHERE i.event_id = 'd1000000-0000-4000-8000-000000000001'
          AND g.email = 'new.user@example.test'
    ),
    1,
    'duplicate registration does not create a second invitation'
);


-- 15. The failed transaction must roll back the guest name update.

SELECT is(
    (
        SELECT full_name
        FROM public.guests
        WHERE email = 'new.user@example.test'
    ),
    'New RSVP Guest',
    'failed duplicate registration rolls back the guest profile update'
);


-- =============================================================================
-- 16-19. AUTOMATIC WAITLISTING
-- =============================================================================

-- 16. The second event already has an approved headcount of one.
-- A new RSVP must therefore be waitlisted.

SELECT is(
    (
        (
            public.admit_public_rsvp(
                'pgtap-admit-full',
                'waitlisted.guest@example.test',
                'Waitlisted Guest'
            )
        ).status
    )::text,
    'waitlisted',
    'new RSVP is automatically waitlisted when event capacity is full'
);


-- 17. Waitlisted invitations must receive a timestamp.

SELECT ok(
    (
        SELECT waitlisted_at IS NOT NULL
        FROM public.invitations
        WHERE event_id = 'd1000000-0000-4000-8000-000000000002'
          AND guest_id = (
              SELECT id
              FROM public.guests
              WHERE email = 'waitlisted.guest@example.test'
          )
    ),
    'automatically waitlisted RSVP receives waitlisted_at'
);


-- 18. A waitlisted invitation does not reserve approved party capacity.

SELECT is(
    (
        SELECT party_size
        FROM public.invitations
        WHERE event_id = 'd1000000-0000-4000-8000-000000000002'
          AND guest_id = (
              SELECT id
              FROM public.guests
              WHERE email = 'waitlisted.guest@example.test'
          )
    ),
    0,
    'waitlisted invitation has zero approved attendees'
);


-- 19. A waitlisted invitation must not have a primary attendee.

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.attendees a
        JOIN public.invitations i ON i.id = a.invitation_id
        WHERE i.event_id = 'd1000000-0000-4000-8000-000000000002'
          AND i.guest_id = (
              SELECT id
              FROM public.guests
              WHERE email = 'waitlisted.guest@example.test'
          )
          AND a.is_primary IS TRUE
    ),
    0,
    'waitlisted RSVP does not create a primary attendee before promotion'
);


-- =============================================================================
-- 20-21. TENTATIVE INVITATIONS DO NOT RESERVE CAPACITY
-- =============================================================================

-- 20. Despite an existing tentative invitation, the new RSVP is accepted.

SELECT is(
    (
        (
            public.admit_public_rsvp(
                'pgtap-admit-tentative',
                'tentative.capacity.guest@example.test',
                'Tentative Capacity Guest'
            )
        ).status
    )::text,
    'accepted',
    'tentative invitation does not prevent a new RSVP from being accepted'
);


-- 21. The new RSVP becomes the first approved attendee for this event.

SELECT is(
    (
        SELECT COALESCE(SUM(party_size), 0)::integer
        FROM public.invitations
        WHERE event_id = 'd1000000-0000-4000-8000-000000000003'
    ),
    1,
    'tentative invitation does not contribute to approved event headcount'
);


-- =============================================================================
-- 22-25. EVENT REGISTRATION ELIGIBILITY
-- =============================================================================

-- 22. Invite-only events cannot use public registration.

SELECT throws_ok(
    $$
        SELECT public.admit_public_rsvp(
            'pgtap-admit-invite-only',
            'invite.only@example.test',
            'Invite Only Guest'
        )
    $$,
    'P0001',
    'EVENT_NOT_OPEN_FOR_REGISTRATION',
    'public registration rejects invite-only events'
);


-- 23. Draft events cannot accept public registrations.

SELECT throws_ok(
    $$
        SELECT public.admit_public_rsvp(
            'pgtap-admit-draft',
            'draft.event@example.test',
            'Draft Event Guest'
        )
    $$,
    'P0001',
    'EVENT_NOT_ACCEPTING_RSVPS',
    'public registration rejects unpublished events'
);


-- 24. Expired RSVP deadlines must be enforced.

SELECT throws_ok(
    $$
        SELECT public.admit_public_rsvp(
            'pgtap-admit-expired',
            'expired.rsvp@example.test',
            'Expired RSVP Guest'
        )
    $$,
    'P0001',
    'RSVP_DEADLINE_PASSED',
    'public registration rejects events past their RSVP deadline'
);


-- 25. Nonexistent event slugs must be rejected.

SELECT throws_ok(
    $$
        SELECT public.admit_public_rsvp(
            'pgtap-event-does-not-exist',
            'missing.event@example.test',
            'Missing Event Guest'
        )
    $$,
    'P0002',
    'EVENT_NOT_FOUND',
    'public registration rejects unknown event slugs'
);


-- =============================================================================
-- FINISH
-- =============================================================================

SELECT * FROM finish();

ROLLBACK;
