
-- =============================================================================
-- EIRMIS pgTAP: party-size and approved-attendee count invariants
--
-- Source rules:
--   - max_party_size is the total roster ceiling, including the primary guest.
--   - party_size is a cached count of APPROVED attendees only.
--   - Additional attendees start as pending and do not consume approved
--     headcount until they are approved.
--   - An approved headcount-increase request raises max_party_size.
--
-- The existing migrations implement the approved-attendee cache and the
-- party_size <= max_party_size CHECK. The additive roster-limit migration
-- enforces max_party_size against total attendee rows on INSERT/UPDATE and
-- prevents reducing the ceiling below the current roster.
--
-- This suite verifies both the existing count behavior and the new database
-- protections. The pending-request uniqueness rule is also checked below.
-- =============================================================================

BEGIN;

SELECT plan(15);

-- Use the synthetic organizer created by supabase/seed.sql.
-- All test-created records are rolled back at the end.
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
    'a1000000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP Party Size Test',
    'pgtap-party-size-test',
    now() + interval '2 days',
    now() + interval '3 days',
    100,
    now() + interval '1 day',
    'invite_only',
    'published'
);

INSERT INTO public.guests (id, email, full_name)
VALUES
    (
        'a2000000-0000-4000-8000-000000000001',
        'pgtap-party-size@example.test',
        'pgTAP Party Guest'
    ),
    (
        'a2000000-0000-4000-8000-000000000002',
        'pgtap-party-size-full@example.test',
        'pgTAP Full Party Guest'
    );

-- Accepting the invitations automatically creates their primary attendees.
INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
) VALUES
    (
        'a3000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001',
        'a2000000-0000-4000-8000-000000000001',
        'accepted',
        3
    ),
    (
        'a3000000-0000-4000-8000-000000000002',
        'a1000000-0000-4000-8000-000000000001',
        'a2000000-0000-4000-8000-000000000002',
        'accepted',
        1
    );

-- Two additional roster members fit the first invitation's total ceiling of 3.
INSERT INTO public.attendees (id, invitation_id, full_name, status)
VALUES
    (
        'a4000000-0000-4000-8000-000000000001',
        'a3000000-0000-4000-8000-000000000001',
        'Additional Attendee One',
        'pending'
    ),
    (
        'a4000000-0000-4000-8000-000000000002',
        'a3000000-0000-4000-8000-000000000001',
        'Additional Attendee Two',
        'pending'
    );

-- 1. The auto-approved primary attendee is reflected in the cache.
SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    1,
    'party_size starts at 1 for the approved primary attendee'
);

-- 2. max_party_size counts everyone in the roster, including pending rows.
SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'a3000000-0000-4000-8000-000000000001'),
    3,
    'the roster contains the primary guest and two additional attendees'
);

-- 3. Pending attendees do not contribute to the approved-headcount cache.
SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    1,
    'pending additional attendees do not increase party_size'
);

-- 4. Approving an additional attendee increments party_size.
UPDATE public.attendees
SET status = 'approved'
WHERE id = 'a4000000-0000-4000-8000-000000000001';

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    2,
    'approving an additional attendee increments party_size'
);

-- 5. Rejecting a pending attendee does not change the approved count.
UPDATE public.attendees
SET status = 'rejected'
WHERE id = 'a4000000-0000-4000-8000-000000000002';

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    2,
    'rejecting a pending attendee leaves party_size unchanged'
);

-- 6. Rejection of an approved attendee removes them from the approved count.
UPDATE public.attendees
SET status = 'rejected'
WHERE id = 'a4000000-0000-4000-8000-000000000001';

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    1,
    'changing an approved attendee to rejected decrements party_size'
);

-- 7. Inserting an already-approved attendee increments the cache.
--
-- The invitation currently has three roster rows. Temporarily raise its
-- ceiling to four to make room for this separate count-maintenance assertion.
UPDATE public.invitations
SET max_party_size = 4
WHERE id = 'a3000000-0000-4000-8000-000000000001';

INSERT INTO public.attendees (id, invitation_id, full_name, status)
VALUES (
    'a4000000-0000-4000-8000-000000000003',
    'a3000000-0000-4000-8000-000000000001',
    'Approved Additional Attendee',
    'approved'
);

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    2,
    'inserting an approved attendee increments party_size'
);

-- 8. Deleting an approved attendee decrements the cache.
DELETE FROM public.attendees
WHERE id = 'a4000000-0000-4000-8000-000000000003';

-- Restore the original ceiling. The roster is back to three rows.
UPDATE public.invitations
SET max_party_size = 3
WHERE id = 'a3000000-0000-4000-8000-000000000001';

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    1,
    'deleting an approved attendee decrements party_size'
);

-- 9. max_party_size must be at least 1.
SAVEPOINT party_size_minimum_check;

SELECT throws_ok(
    $$UPDATE public.invitations
      SET max_party_size = 0
      WHERE id = 'a3000000-0000-4000-8000-000000000001'$$,
    '23514',
    NULL,
    'max_party_size cannot be less than 1'
);

ROLLBACK TO SAVEPOINT party_size_minimum_check;

-- 10. The cached approved count cannot be greater than max_party_size.
SAVEPOINT party_size_cache_ceiling_check;

SELECT throws_ok(
    $$UPDATE public.invitations
      SET party_size = max_party_size + 1
      WHERE id = 'a3000000-0000-4000-8000-000000000001'$$,
    '23514',
    NULL,
    'party_size cannot exceed max_party_size'
);

ROLLBACK TO SAVEPOINT party_size_cache_ceiling_check;

-- 11. A new row beyond the total roster ceiling must be rejected,
-- regardless of attendee status.
SAVEPOINT party_size_roster_insert_check;

SELECT throws_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'a4000000-0000-4000-8000-000000000004',
        'a3000000-0000-4000-8000-000000000001',
        'Over-Capacity Pending Attendee',
        'pending'
      )$$,
    '23514',
    NULL,
    'inserting an attendee beyond max_party_size is rejected'
);

ROLLBACK TO SAVEPOINT party_size_roster_insert_check;

-- 12. Moving an existing attendee into an invitation whose roster is already
-- full must also be rejected.
SAVEPOINT party_size_roster_update_check;

SELECT throws_ok(
    $$UPDATE public.attendees
      SET invitation_id = 'a3000000-0000-4000-8000-000000000002'
      WHERE id = 'a4000000-0000-4000-8000-000000000002'$$,
    '23514',
    NULL,
    'moving an attendee into a full invitation is rejected'
);

ROLLBACK TO SAVEPOINT party_size_roster_update_check;

-- 13. A pending headcount request does not itself grant additional roster
-- places.
INSERT INTO public.headcount_increase_requests (
    id,
    invitation_id,
    requested_additional_heads,
    status,
    note
) VALUES (
    'a5000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    2,
    'pending',
    'Requesting two additional places'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'a3000000-0000-4000-8000-000000000001'),
    3,
    'a pending headcount request does not increase max_party_size'
);

-- 14. The existing partial unique index allows only one pending request per
-- invitation. throws_ok() captures the expected constraint violation itself.
SELECT throws_ok(
    $$INSERT INTO public.headcount_increase_requests (
        id,
        invitation_id,
        requested_additional_heads,
        status
      ) VALUES (
        'a5000000-0000-4000-8000-000000000002',
        'a3000000-0000-4000-8000-000000000001',
        1,
        'pending'
      )$$,
    '23505',
    NULL,
    'an invitation cannot have two pending headcount requests'
);

-- 15. The organizer cannot lower the allocated ceiling below the current
-- total roster size. Pending and rejected roster members still occupy slots.
SELECT throws_ok(
    $$UPDATE public.invitations
      SET max_party_size = 2
      WHERE id = 'a3000000-0000-4000-8000-000000000001'$$,
    '23514',
    NULL,
    'max_party_size cannot be reduced below the existing total roster'
);

SELECT * FROM finish();

ROLLBACK;
