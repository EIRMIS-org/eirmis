
-- =============================================================================
-- EIRMIS pgTAP: event capacity invariants
--
-- Tests:
--   1. Event capacity must remain positive.
--   2. Event capacity is measured across all invitations.
--   3. Pending additional attendees do not reserve capacity.
--   4. Tentative invitations do not reserve capacity.
--   5. Tentative invitations do not increase event headcount.
--   6. Normal attendee approval increases event headcount.
--   7. Rejection releases an approved place.
--   8. Re-approval consumes the place again.
--   9. Pending attendees do not consume event capacity.
--  10. Capacity enforcement through decide_attendee().
--  11. Automatic waitlisting through admit_public_rsvp().
--  12. Automatically waitlisted invitations receive waitlisted_at.
--  13. Waitlisted invitations do not create primary attendees.
--
-- Architecture:
--   - decide_attendee() handles transactional attendee decisions.
--   - admit_public_rsvp() handles transactional public RSVP admission.
--   - Both operations use the event-row locking strategy.
--
-- Existing test fixtures use the seeded active organizer:
--   11111111-1111-1111-1111-111111111111
--
-- All test data is rolled back at the end.
-- =============================================================================

BEGIN;

SELECT plan(13);


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
VALUES (
    'b1000000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP Event Capacity Test',
    'pgtap-event-capacity-test',
    now() + interval '2 days',
    now() + interval '3 days',
    3,
    now() + interval '1 day',
    'open_registration',
    'published'
);


-- Guests used by the capacity tests.

INSERT INTO public.guests (
    id,
    email,
    full_name
)
VALUES
(
    'b2000000-0000-4000-8000-000000000001',
    'pgtap-capacity-one@example.test',
    'Capacity Guest One'
),
(
    'b2000000-0000-4000-8000-000000000002',
    'pgtap-capacity-two@example.test',
    'Capacity Guest Two'
),
(
    'b2000000-0000-4000-8000-000000000003',
    'pgtap-capacity-tentative@example.test',
    'Tentative Capacity Guest'
),
(
    'b2000000-0000-4000-8000-000000000004',
    'pgtap-capacity-new-rsvp@example.test',
    'New RSVP Capacity Guest'
);


-- Two accepted invitations each create one approved primary attendee.
-- Initial event headcount = 2.

INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size
)
VALUES
(
    'b3000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000001',
    'accepted',
    2
),
(
    'b3000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000002',
    'accepted',
    2
);


-- Tentative invitation does not create an approved primary attendee.

INSERT INTO public.invitations (
    id,
    event_id,
    guest_id,
    status,
    max_party_size
)
VALUES (
    'b3000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000003',
    'tentative',
    1
);


-- Two pending additional attendees.
-- Neither initially consumes event capacity.

INSERT INTO public.attendees (
    id,
    invitation_id,
    full_name,
    status
)
VALUES
(
    'b4000000-0000-4000-8000-000000000001',
    'b3000000-0000-4000-8000-000000000001',
    'Pending Capacity Attendee One',
    'pending'
),
(
    'b4000000-0000-4000-8000-000000000002',
    'b3000000-0000-4000-8000-000000000002',
    'Pending Capacity Attendee Two',
    'pending'
);


-- =============================================================================
-- TEST 1: EVENT CAPACITY MUST REMAIN POSITIVE
-- =============================================================================

SELECT throws_ok(
    $$
        UPDATE public.events
        SET capacity = 0
        WHERE id = 'b1000000-0000-4000-8000-000000000001'
    $$,
    '23514',
    NULL,
    'event capacity cannot be zero'
);


-- =============================================================================
-- TEST 2: APPROVED HEADCOUNT ACROSS ALL INVITATIONS
-- =============================================================================

SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
    ),
    2,
    'event accepted headcount includes approved attendees across invitations'
);


-- =============================================================================
-- TEST 3: PENDING ADDITIONAL ATTENDEES DO NOT RESERVE CAPACITY
-- =============================================================================

SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
    ),
    2,
    'pending additional attendees do not increase event accepted headcount'
);


-- =============================================================================
-- TEST 4: TENTATIVE INVITATION DOES NOT RESERVE CAPACITY
-- =============================================================================

SELECT is(
    (
        SELECT party_size
        FROM public.invitations
        WHERE id = 'b3000000-0000-4000-8000-000000000003'
    ),
    0,
    'a tentative invitation has no approved attendees and reserves no capacity'
);


-- =============================================================================
-- TEST 5: TENTATIVE INVITATION DOES NOT CHANGE EVENT HEADCOUNT
-- =============================================================================

SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
    ),
    2,
    'tentative invitations do not contribute to event accepted headcount'
);


-- =============================================================================
-- TEST 6: NORMAL APPROVAL INCREASES EVENT HEADCOUNT
--
-- This test checks the existing invitation count-maintenance trigger.
-- Capacity validation itself is tested through decide_attendee() below.
-- =============================================================================

UPDATE public.attendees
SET status = 'approved'
WHERE id = 'b4000000-0000-4000-8000-000000000001';


SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
    ),
    3,
    'approving an attendee increases event accepted headcount'
);


-- =============================================================================
-- TEST 7: REJECTION RELEASES APPROVED CAPACITY
-- =============================================================================

UPDATE public.attendees
SET status = 'rejected'
WHERE id = 'b4000000-0000-4000-8000-000000000001';


SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
    ),
    2,
    'rejecting an approved attendee decreases event accepted headcount'
);


-- =============================================================================
-- TEST 8: RE-APPROVAL CONSUMES CAPACITY AGAIN
-- =============================================================================

UPDATE public.attendees
SET status = 'approved'
WHERE id = 'b4000000-0000-4000-8000-000000000001';


SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
    ),
    3,
    're-approving an attendee restores event accepted headcount'
);


-- =============================================================================
-- TEST 9: PENDING ATTENDEES ON OTHER INVITATIONS DO NOT CONSUME CAPACITY
-- =============================================================================

SELECT is(
    (
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        FROM public.invitations AS i
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
    ),
    3,
    'a pending attendee on another invitation does not consume event capacity'
);


-- =============================================================================
-- TEST 10: APPROVAL BEYOND CAPACITY MUST BE REJECTED WITHOUT OVERRIDE
--
-- IMPORTANT:
-- This test uses decide_attendee(), not a direct UPDATE.
--
-- The RPC checks event capacity, serializes the operation, and rejects
-- an over-capacity approval without an explicit organizer override.
-- =============================================================================

SELECT throws_ok(
    $$
        SELECT public.decide_attendee(
            'b4000000-0000-4000-8000-000000000002',
            'approve',
            '11111111-1111-1111-1111-111111111111',
            false,
            NULL
        )
    $$,
    'P0001',
    'EVENT_CAPACITY_EXCEEDED',
    'approval beyond event capacity requires an explicit override'
);


-- =============================================================================
-- TEST 11: NEW RSVP AT FULL CAPACITY MUST BE AUTOMATICALLY WAITLISTED
--
-- IMPORTANT:
-- This test uses admit_public_rsvp(), not a direct invitation INSERT.
-- The event already has three approved attendees and capacity is three.
-- =============================================================================

SELECT is(
    (
        public.admit_public_rsvp(
            'pgtap-event-capacity-test',
            'pgtap-capacity-new-rsvp@example.test',
            'New RSVP Capacity Guest'
        )
    ).status::text,
    'waitlisted',
    'a new RSVP at full capacity is automatically waitlisted'
);


-- =============================================================================
-- TEST 12: AUTOMATICALLY WAITLISTED RSVP RECEIVES A TIMESTAMP
-- =============================================================================

SELECT ok(
    (
        SELECT waitlisted_at IS NOT NULL
        FROM public.invitations
        WHERE id IN (
            SELECT i.id
            FROM public.invitations AS i
            JOIN public.guests AS g
                ON g.id = i.guest_id
            WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
              AND g.email = 'pgtap-capacity-new-rsvp@example.test'
        )
    ),
    'an automatically waitlisted RSVP receives waitlisted_at'
);


-- =============================================================================
-- TEST 13: WAITLISTED INVITATION MUST NOT CREATE A PRIMARY ATTENDEE
-- =============================================================================

SELECT is(
    (
        SELECT COUNT(*)::integer
        FROM public.attendees AS a
        JOIN public.invitations AS i
            ON i.id = a.invitation_id
        JOIN public.guests AS g
            ON g.id = i.guest_id
        WHERE i.event_id = 'b1000000-0000-4000-8000-000000000001'
          AND g.email = 'pgtap-capacity-new-rsvp@example.test'
          AND a.is_primary IS TRUE
    ),
    0,
    'a waitlisted invitation does not create its primary attendee before promotion'
);


-- =============================================================================
-- FINISH
-- =============================================================================

SELECT * FROM finish();

ROLLBACK;
