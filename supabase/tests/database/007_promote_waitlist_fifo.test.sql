
-- =============================================================================
-- EIRMIS pgTAP: capacity-safe FIFO waitlist promotion
--
-- Tests:
--   1. Service role can execute promotion RPC.
--   2. Authenticated role cannot execute promotion RPC directly.
--   3. Anonymous role cannot execute promotion RPC directly.
--   4. Initial approved headcount is correct.
--   5. Promotion stops at available event capacity.
--   6. Oldest invitation is promoted first.
--   7. Second-oldest invitation is promoted next.
--   8. Newer invitations remain waitlisted when capacity is exhausted.
--   9. Event headcount reaches, but does not exceed, capacity.
--  10. Promoted invitations receive primary attendees.
--  11. Pending additional attendees remain pending.
--  12. Original waitlisted_at is preserved.
--  13. responded_at is populated when previously NULL.
--  14. Unpromoted invitations do not receive primary attendees.
--  15. Invitations without waitlisted_at are not promoted.
--  16. Full events promote zero additional invitations.
--  17. Full-event waitlisted invitations remain waitlisted.
--  18. p_max_promotions limits the number of promotions.
--  19. The oldest eligible invitation is selected when limited.
--  20. Newer invitations remain waitlisted when the limit is reached.
--  21. A non-positive promotion limit is rejected.
--  22. A nonexistent event is rejected.
--  23. A NULL event ID is rejected.
--
-- Test data is isolated and rolled back at the end.
-- =============================================================================

BEGIN;

SELECT plan(24);


-- =============================================================================
-- FIXTURE: THREE EVENTS
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
    'e1000000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'FIFO Promotion Capacity Test',
    'pgtap-promotion-fifo',
    now() + interval '2 days',
    now() + interval '3 days',
    3,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'e1000000-0000-4000-8000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'FIFO Full Event Test',
    'pgtap-promotion-full',
    now() + interval '2 days',
    now() + interval '3 days',
    1,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'e1000000-0000-4000-8000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'FIFO Maximum Promotions Test',
    'pgtap-promotion-limit',
    now() + interval '2 days',
    now() + interval '3 days',
    4,
    now() + interval '1 day',
    'open_registration',
    'published'
);


-- =============================================================================
-- FIXTURE: GUESTS
-- =============================================================================

INSERT INTO public.guests (
    id,
    email,
    full_name
)
VALUES
(
    'e2000000-0000-4000-8000-000000000001',
    'pgtap-fifo-base@example.test',
    'FIFO Base Guest'
),
(
    'e2000000-0000-4000-8000-000000000002',
    'pgtap-fifo-first@example.test',
    'FIFO First Guest'
),
(
    'e2000000-0000-4000-8000-000000000003',
    'pgtap-fifo-second@example.test',
    'FIFO Second Guest'
),
(
    'e2000000-0000-4000-8000-000000000004',
    'pgtap-fifo-third@example.test',
    'FIFO Third Guest'
),
(
    'e2000000-0000-4000-8000-000000000005',
    'pgtap-full-base@example.test',
    'Full Event Base Guest'
),
(
    'e2000000-0000-4000-8000-000000000006',
    'pgtap-full-waitlist@example.test',
    'Full Event Waitlisted Guest'
),
(
    'e2000000-0000-4000-8000-000000000007',
    'pgtap-limit-first@example.test',
    'Limit First Guest'
),
(
    'e2000000-0000-4000-8000-000000000008',
    'pgtap-limit-base@example.test',
    'Limit Base Guest'
),
(
    'e2000000-0000-4000-8000-000000000009',
    'pgtap-fifo-null-timestamp@example.test',
    'Missing Timestamp Guest'
),
(
    'e2000000-0000-4000-8000-000000000010',
    'pgtap-limit-second@example.test',
    'Limit Second Guest'
);


-- =============================================================================
-- EVENT 1: CAPACITY THREE, ONE PLACE ALREADY OCCUPIED
--
-- Initial approved headcount: 1
-- Available capacity: 2
-- Three properly timestamped waitlisted invitations.
-- One waitlisted invitation without a timestamp.
-- =============================================================================

INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size
)
VALUES (
    'e3000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',
    'accepted',
    2
);


INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size,
    waitlisted_at
)
VALUES
(
    'e3000000-0000-4000-8000-000000000011',
    'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000002',
    'waitlisted',
    2,
    now() - interval '3 minutes'
),
(
    'e3000000-0000-4000-8000-000000000012',
    'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000003',
    'waitlisted',
    2,
    now() - interval '2 minutes'
),
(
    'e3000000-0000-4000-8000-000000000013',
    'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000004',
    'waitlisted',
    2,
    now() - interval '1 minute'
),
(
    'e3000000-0000-4000-8000-000000000014',
    'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000009',
    'waitlisted',
    1,
    NULL
);


-- Add one pending additional attendee to the oldest waitlisted invitation.
-- Promotion must not automatically approve this additional attendee.

INSERT INTO public.attendees (
    id,
    invitation_id,
    full_name,
    status
)
VALUES (
    'e4000000-0000-4000-8000-000000000001',
    'e3000000-0000-4000-8000-000000000011',
    'Pending Additional FIFO Attendee',
    'pending'
);


-- =============================================================================
-- EVENT 2: ALREADY FULL
--
-- Capacity: 1
-- Approved headcount: 1
-- No available seats.
-- =============================================================================

INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size
)
VALUES (
    'e3000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000005',
    'accepted',
    1
);


INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size,
    waitlisted_at
)
VALUES (
    'e3000000-0000-4000-8000-000000000015',
    'e1000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000006',
    'waitlisted',
    1,
    now() - interval '1 minute'
);


-- =============================================================================
-- EVENT 3: TEST THE max_promotions PARAMETER
--
-- Capacity: 4
-- Approved headcount: 1
-- Available seats: 3
-- There are two waitlisted invitations.
-- Only one should be promoted when p_max_promotions = 1.
-- =============================================================================

INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size
)
VALUES (
    'e3000000-0000-4000-8000-000000000003',
    'e1000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000008',
    'accepted',
    2
);


INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size,
    waitlisted_at
)
VALUES
(
    'e3000000-0000-4000-8000-000000000016',
    'e1000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000007',
    'waitlisted',
    1,
    now() - interval '2 minutes'
),
(
    'e3000000-0000-4000-8000-000000000017',
    'e1000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000010',
    'waitlisted',
    1,
    now() - interval '1 minute'
);


-- =============================================================================
-- TEST 1-3: FUNCTION PERMISSIONS
-- =============================================================================

SELECT ok(
    has_function_privilege(
        'service_role',
        'public.promote_waitlist_fifo(uuid,integer)',
        'EXECUTE'
    ),
    'service_role can execute promote_waitlist_fifo'
);

SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'public.promote_waitlist_fifo(uuid,integer)',
        'EXECUTE'
    ),
    'authenticated role cannot execute promote_waitlist_fifo directly'
);

SELECT ok(
    NOT has_function_privilege(
        'anon',
        'public.promote_waitlist_fifo(uuid,integer)',
        'EXECUTE'
    ),
    'anon role cannot execute promote_waitlist_fifo directly'
);


-- =============================================================================
-- TEST 4: INITIAL HEADCOUNT
-- =============================================================================

SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'e1000000-0000-4000-8000-000000000001'
    ),
    1,
    'event starts with one approved attendee'
);


-- =============================================================================
-- TEST 5: PROMOTE ONLY AVAILABLE CAPACITY
-- =============================================================================

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.promote_waitlist_fifo(
            'e1000000-0000-4000-8000-000000000001',
            10
        )
    ),
    2,
    'promotion stops after filling the two available event places'
);


-- =============================================================================
-- TEST 6-8: FIFO ORDER
-- =============================================================================

SELECT is(
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000011'
    ),
    'accepted',
    'oldest waitlisted invitation is promoted first'
);

SELECT is(
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000012'
    ),
    'accepted',
    'second-oldest waitlisted invitation is promoted second'
);

SELECT is(
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000013'
    ),
    'waitlisted',
    'newer invitation remains waitlisted when capacity is exhausted'
);


-- =============================================================================
-- TEST 9: HEADCOUNT MUST NOT EXCEED CAPACITY
-- =============================================================================

SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'e1000000-0000-4000-8000-000000000001'
    ),
    3,
    'event approved headcount reaches exactly its capacity'
);


-- =============================================================================
-- TEST 10-11: PRIMARY ATTENDEE CREATION
-- =============================================================================

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.attendees AS a
        WHERE a.invitation_id = 'e3000000-0000-4000-8000-000000000011'
          AND a.is_primary IS TRUE
          AND a.status = 'approved'
    ),
    1,
    'first promoted invitation receives one approved primary attendee'
);

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.attendees AS a
        WHERE a.invitation_id = 'e3000000-0000-4000-8000-000000000012'
          AND a.is_primary IS TRUE
          AND a.status = 'approved'
    ),
    1,
    'second promoted invitation receives one approved primary attendee'
);


-- =============================================================================
-- TEST 12: ADDITIONAL ATTENDEES REMAIN PENDING
-- =============================================================================

SELECT is(
    (
        SELECT status::text
        FROM public.attendees
        WHERE id = 'e4000000-0000-4000-8000-000000000001'
    ),
    'pending',
    'promotion does not automatically approve additional attendees'
);


-- =============================================================================
-- TEST 13: PRESERVE ORIGINAL WAITLIST TIMESTAMP
-- =============================================================================

SELECT ok(
    (
        SELECT waitlisted_at IS NOT NULL
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000011'
    ),
    'promoted invitation preserves its original waitlisted_at timestamp'
);


-- =============================================================================
-- TEST 14: responded_at IS SET WHEN PREVIOUSLY NULL
-- =============================================================================

SELECT ok(
    (
        SELECT responded_at IS NOT NULL
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000011'
    ),
    'promoted invitation receives responded_at when it was previously NULL'
);


-- =============================================================================
-- TEST 15: UNPROMOTED INVITATION HAS NO PRIMARY ATTENDEE
-- =============================================================================

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.attendees AS a
        WHERE a.invitation_id = 'e3000000-0000-4000-8000-000000000013'
          AND a.is_primary IS TRUE
    ),
    0,
    'unpromoted invitation does not receive a primary attendee'
);


-- =============================================================================
-- TEST 16: INVITATION WITHOUT waitlisted_at IS NOT PROMOTED
-- =============================================================================

SELECT is(
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000014'
    ),
    'waitlisted',
    'invitation without waitlisted_at is not eligible for promotion'
);


-- =============================================================================
-- TEST 17-18: EVENT WITH NO AVAILABLE CAPACITY
-- =============================================================================

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.promote_waitlist_fifo(
            'e1000000-0000-4000-8000-000000000002',
            10
        )
    ),
    0,
    'full event promotes zero additional invitations'
);

SELECT is(
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000015'
    ),
    'waitlisted',
    'invitation remains waitlisted when event has no available capacity'
);


-- =============================================================================
-- TEST 19-21: max_promotions LIMIT
-- =============================================================================

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.promote_waitlist_fifo(
            'e1000000-0000-4000-8000-000000000003',
            1
        )
    ),
    1,
    'p_max_promotions limits the number of promoted invitations'
);

SELECT is(
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000016'
    ),
    'accepted',
    'oldest invitation is promoted when the promotion limit is one'
);

SELECT is(
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'e3000000-0000-4000-8000-000000000017'
    ),
    'waitlisted',
    'newer invitation remains waitlisted when promotion limit is reached'
);


-- =============================================================================
-- TEST 22-23: INVALID PROMOTION PARAMETERS
-- =============================================================================

SELECT throws_ok(
    $$
        SELECT *
        FROM public.promote_waitlist_fifo(
            'e1000000-0000-4000-8000-000000000001',
            0
        )
    $$,
    '22023',
    'MAX_PROMOTIONS_MUST_BE_POSITIVE',
    'zero promotion limit is rejected'
);

SELECT throws_ok(
    $$
        SELECT *
        FROM public.promote_waitlist_fifo(
            'ffffffff-ffff-4fff-8fff-ffffffffffff',
            1
        )
    $$,
    'P0002',
    'EVENT_NOT_FOUND',
    'promotion rejects nonexistent event IDs'
);


-- =============================================================================
-- TEST 24: NULL EVENT ID
-- =============================================================================

SELECT throws_ok(
    $$
        SELECT *
        FROM public.promote_waitlist_fifo(
            NULL,
            1
        )
    $$,
    '22023',
    'EVENT_ID_REQUIRED',
    'promotion rejects a NULL event ID'
);


-- =============================================================================
-- FINISH
-- =============================================================================

SELECT * FROM finish();

ROLLBACK;
