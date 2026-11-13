-- =============================================================================
-- EIRMIS pgTAP: primary attendee creation, uniqueness, and immutability
--
-- Source rules:
--   - Accepting an invitation creates the invited guest as an approved,
--     is_primary = true attendee.
--   - An accepted invitation inserted directly (open registration) also gets
--     its primary attendee.
--   - The primary attendee represents the inviting guest, not an editable
--     additional roster member.
--
-- The existing migrations create the primary attendee on invitation UPDATE
-- and INSERT and avoid re-creating it on ordinary updates to an accepted
-- invitation. The inspected baseline has no partial UNIQUE index (or equivalent
-- guard) for one primary per invitation and no trigger protecting the primary
-- attendee's identity fields from mutation/deletion. Assertions 9-14 expose
-- those missing protections until a corrective migration adds them.
--
-- Check-in fields remain operationally mutable; this test deliberately does
-- not treat check-in state as part of the primary attendee's immutable identity.
-- =============================================================================

BEGIN;

SELECT plan(15);

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
    'b1000000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP Primary Attendee Test',
    'pgtap-primary-attendee-test',
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
        'b2000000-0000-4000-8000-000000000001',
        'pgtap-primary-one@example.test',
        'Primary Guest One'
    ),
    (
        'b2000000-0000-4000-8000-000000000002',
        'pgtap-primary-two@example.test',
        'Primary Guest Two'
    );

-- Invitation A follows the invite-only path: pending first, then accepted.
INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
) VALUES (
    'b3000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000001',
    'pending',
    3
);

-- Invitation B follows open-registration behavior: inserted as accepted.
INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
) VALUES (
    'b3000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000002',
    'accepted',
    3
);

-- 1. A pending invitation must not have a primary attendee yet.
SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
       AND is_primary = true),
    0,
    'a pending invitation does not yet have a primary attendee'
);

-- Accept the invite-only invitation; the migration trigger should create the
-- primary attendee using the Guest.full_name value.
UPDATE public.invitations
SET status = 'accepted'
WHERE id = 'b3000000-0000-4000-8000-000000000001';

-- 2. Exactly one primary attendee is created after acceptance.
SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
       AND is_primary = true),
    1,
    'accepting an invitation creates exactly one primary attendee'
);

-- 3. The accepted invitation has only that one attendee at this point.
SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'),
    1,
    'acceptance does not create extra non-primary attendee rows'
);

-- 4. The primary attendee takes the name from the Guest record.
SELECT is(
    (SELECT full_name FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
       AND is_primary = true),
    'Primary Guest One',
    'the primary attendee uses the inviting guest full_name'
);

-- 5. The primary attendee is automatically approved.
SELECT is(
    (SELECT status::text FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
       AND is_primary = true),
    'approved',
    'the primary attendee is created with approved status'
);

-- 6. An invitation inserted directly as accepted also gets one primary row.
SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000002'
       AND is_primary = true),
    1,
    'an invitation inserted as accepted creates its primary attendee'
);

-- 7. The open-registration primary row also uses the Guest.full_name value.
SELECT is(
    (SELECT full_name FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000002'
       AND is_primary = true),
    'Primary Guest Two',
    'the directly accepted invitation uses its guest full_name'
);

-- 8. Updating an already-accepted invitation must not create another primary.
UPDATE public.invitations
SET dietary_preference = 'vegetarian'
WHERE id = 'b3000000-0000-4000-8000-000000000001';

SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
       AND is_primary = true),
    1,
    'ordinary updates to an accepted invitation do not duplicate the primary attendee'
);

-- 9. A second primary attendee for the same invitation must violate the
-- one-primary-per-invitation invariant (expected SQLSTATE 23505).
SAVEPOINT primary_duplicate_check;
SELECT throws_ok(
    $$INSERT INTO public.attendees (
        id, invitation_id, full_name, is_primary, status
      ) VALUES (
        'b4000000-0000-4000-8000-000000000001',
        'b3000000-0000-4000-8000-000000000001',
        'Duplicate Primary Guest',
        true,
        'approved'
      )$$,
    '23505',
    NULL,
    'a second primary attendee for one invitation is rejected'
);
ROLLBACK TO SAVEPOINT primary_duplicate_check;

-- 10. The primary attendee's name cannot be edited after RSVP.
SAVEPOINT primary_name_immutable_check;
SELECT throws_ok(
    $$UPDATE public.attendees
      SET full_name = 'Changed Primary Name'
      WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
        AND is_primary = true$$,
    '23514',
    NULL,
    'the primary attendee full_name is immutable after acceptance'
);
ROLLBACK TO SAVEPOINT primary_name_immutable_check;

-- 11. The primary flag cannot be removed from the primary attendee.
SAVEPOINT primary_flag_immutable_check;
SELECT throws_ok(
    $$UPDATE public.attendees
      SET is_primary = false
      WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
        AND is_primary = true$$,
    '23514',
    NULL,
    'the primary attendee cannot be changed into a non-primary row'
);
ROLLBACK TO SAVEPOINT primary_flag_immutable_check;

-- 12. The primary attendee cannot be rejected or otherwise removed from the
-- approved primary position by changing its status.
SAVEPOINT primary_status_immutable_check;
SELECT throws_ok(
    $$UPDATE public.attendees
      SET status = 'rejected'
      WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
        AND is_primary = true$$,
    '23514',
    NULL,
    'the primary attendee status cannot be changed from approved'
);
ROLLBACK TO SAVEPOINT primary_status_immutable_check;

-- 13. The primary attendee cannot be reassigned to another invitation.
SAVEPOINT primary_invitation_immutable_check;
SELECT throws_ok(
    $$UPDATE public.attendees
      SET invitation_id = 'b3000000-0000-4000-8000-000000000002'
      WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
        AND is_primary = true$$,
    '23514',
    NULL,
    'the primary attendee cannot be moved to another invitation'
);
ROLLBACK TO SAVEPOINT primary_invitation_immutable_check;

-- 14. The primary attendee cannot be deleted after invitation acceptance.
SAVEPOINT primary_delete_immutable_check;
SELECT throws_ok(
    $$DELETE FROM public.attendees
      WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
        AND is_primary = true$$,
    '23514',
    NULL,
    'the primary attendee cannot be deleted after acceptance'
);
ROLLBACK TO SAVEPOINT primary_delete_immutable_check;

-- 15. Operational check-in state is not part of the primary attendee's
-- immutable identity and must remain writable by the trusted check-in path.
SELECT lives_ok(
    $$UPDATE public.attendees
      SET checked_in = true,
          checked_in_at = now(),
          checked_in_by = '44444444-4444-4444-4444-444444444444'
      WHERE invitation_id = 'b3000000-0000-4000-8000-000000000001'
        AND is_primary = true$$,
    'check-in fields remain mutable for a primary attendee'
);

SELECT * FROM finish();
ROLLBACK;
