-- =============================================================================
-- EIRMIS pgTAP: guest attendee-roster ownership and write restrictions
--
-- Covers the README §6 / §7 rules that:
--   - Guests can submit additional attendees only for their own accepted
--     invitations.
--   - Guests cannot create or mutate the primary attendee.
--   - Guests can edit their own pending/rejected additional attendees.
--   - Guests cannot edit another guest's roster or move a row into another
--     guest's invitation.
--   - Approval state and QR issuance are server-controlled operations.
--
-- IMPORTANT IMPLEMENTATION GAP:
--   The baseline guest UPDATE policy's WITH CHECK clause verifies ownership
--   and is_primary=false, but does not constrain status or qr_token. The final
--   two throws_ok assertions are intentionally included to expose this policy
--   gap. They will fail until the guest UPDATE policy is tightened (or an
--   equivalent database guard is added).
-- =============================================================================

BEGIN;

SELECT plan(10);

INSERT INTO public.events (
    id, organizer_id, title, slug, starts_at, ends_at, capacity,
    rsvp_deadline, visibility_mode, status
) VALUES
    (
      'a9100000-0000-4000-8000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      'pgTAP Attendee Roster Event',
      'pgtap-attendee-roster-event',
      now() + interval '2 days', now() + interval '3 days', 100,
      now() + interval '1 day', 'invite_only', 'published'
    ),
    (
      'a9100000-0000-4000-8000-000000000002',
      '11111111-1111-1111-1111-111111111111',
      'pgTAP Pending Invitation Event',
      'pgtap-pending-invitation-event',
      now() + interval '4 days', now() + interval '5 days', 100,
      now() + interval '3 days', 'invite_only', 'published'
    );

-- Create a dedicated auth.users identity for this synthetic guest.
-- The event remains owned by the seeded organizer, but guests.auth_user_id is
-- unique, so the guest must not reuse the organizer's authentication UUID.
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) VALUES (
    '88888888-8888-4888-8888-888888888009',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pgtap-009-auth@example.test',
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
      'a9200000-0000-4000-8000-000000000001',
      'pgtap-roster-owner@example.test',
      'pgTAP Roster Owner',
      '88888888-8888-4888-8888-888888888009'
    ),
    (
      'a9200000-0000-4000-8000-000000000002',
      'pgtap-roster-other@example.test',
      'pgTAP Other Guest',
      NULL
    )
ON CONFLICT (auth_user_id) DO UPDATE
SET
    id = EXCLUDED.id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
) VALUES
    (
      'a9300000-0000-4000-8000-000000000001',
      'a9100000-0000-4000-8000-000000000001',
      'a9200000-0000-4000-8000-000000000001',
      'accepted', 6
    ),
    (
      'a9300000-0000-4000-8000-000000000002',
      'a9100000-0000-4000-8000-000000000001',
      'a9200000-0000-4000-8000-000000000002',
      'accepted', 6
    ),
    (
      'a9300000-0000-4000-8000-000000000003',
      'a9100000-0000-4000-8000-000000000002',
      'a9200000-0000-4000-8000-000000000001',
      'pending', 6
    );

-- Accepted invitations automatically receive a primary attendee. Additional
-- rows below are created by the test owner to establish each policy case.
INSERT INTO public.attendees (
    id, invitation_id, full_name, status
) VALUES
    (
      'a9400000-0000-4000-8000-000000000001',
      'a9300000-0000-4000-8000-000000000001',
      'Owner Pending Attendee', 'pending'
    ),
    (
      'a9400000-0000-4000-8000-000000000002',
      'a9300000-0000-4000-8000-000000000001',
      'Owner Approved Attendee', 'approved'
    ),
    (
      'a9400000-0000-4000-8000-000000000003',
      'a9300000-0000-4000-8000-000000000002',
      'Other Guest Pending Attendee', 'pending'
    ),
    (
      'a9400000-0000-4000-8000-000000000007',
      'a9300000-0000-4000-8000-000000000001',
      'Owner QR Protection Attendee', 'pending'
    );

SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claim.sub',
    '88888888-8888-4888-8888-888888888009',
    true
);
SELECT set_config(
    'request.jwt.claims',
    '{"sub":"88888888-8888-4888-8888-888888888009","role":"authenticated"}',
    true
);

-- 1. A guest can add an additional row to their own accepted invitation.
SELECT lives_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'a9400000-0000-4000-8000-000000000004',
        'a9300000-0000-4000-8000-000000000001',
        'Owner Added Attendee',
        'pending'
      )$$,
    'guest can add an additional attendee to their own accepted invitation'
);

-- 2. A guest cannot add attendees while their invitation is still pending.
SELECT throws_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'a9400000-0000-4000-8000-000000000005',
        'a9300000-0000-4000-8000-000000000003',
        'Pending Invitation Attendee',
        'pending'
      )$$,
    '42501',
    NULL,
    'guest cannot add attendees to a pending invitation'
);

-- 3. A guest cannot create a primary attendee directly.
SELECT throws_ok(
    $$INSERT INTO public.attendees (
        id, invitation_id, full_name, is_primary, status
      ) VALUES (
        'a9400000-0000-4000-8000-000000000006',
        'a9300000-0000-4000-8000-000000000001',
        'Forged Primary Attendee',
        true,
        'approved'
      )$$,
    '42501',
    NULL,
    'guest cannot create a primary attendee directly'
);

-- 4. A guest can edit their own pending additional attendee.
SELECT lives_ok(
    $$UPDATE public.attendees
      SET full_name = 'Owner Pending Attendee Edited'
      WHERE id = 'a9400000-0000-4000-8000-000000000001'$$,
    'guest can edit their own pending additional attendee'
);

-- 5. The edit is persisted.
SELECT is(
    (SELECT full_name FROM public.attendees
     WHERE id = 'a9400000-0000-4000-8000-000000000001'),
    'Owner Pending Attendee Edited',
    'guest pending-attendee edit is persisted'
);

-- 6. RLS silently affects zero rows when a guest tries to edit another guest's
-- attendee. The row remains readable only after the test returns to owner role;
-- instead this CTE checks the number of rows the authenticated UPDATE touched.
WITH attempted_update AS (
    UPDATE public.attendees
    SET full_name = 'Unauthorized Other Guest Edit'
    WHERE id = 'a9400000-0000-4000-8000-000000000003'
    RETURNING id
)
SELECT is(
    (SELECT count(*)::integer FROM attempted_update),
    0,
    'guest cannot update another guest attendee row'
);

-- 7. The USING policy excludes already-approved additional attendees from the
-- guest UPDATE path; no row should be changed.
WITH attempted_update AS (
    UPDATE public.attendees
    SET full_name = 'Unauthorized Approved Attendee Edit'
    WHERE id = 'a9400000-0000-4000-8000-000000000002'
    RETURNING id
)
SELECT is(
    (SELECT count(*)::integer FROM attempted_update),
    0,
    'guest cannot edit an already-approved additional attendee'
);

-- 8. Moving an owned attendee into another guest's invitation must fail the
-- UPDATE WITH CHECK ownership policy.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET invitation_id = 'a9300000-0000-4000-8000-000000000002'
      WHERE id = 'a9400000-0000-4000-8000-000000000004'$$,
    '42501',
    NULL,
    'guest cannot move their attendee into another guest invitation'
);

-- 9. Approval is an organizer/service-role decision, not a guest roster edit.
-- The baseline UPDATE WITH CHECK does not constrain status, so this assertion
-- is expected to expose a policy gap until the policy is tightened.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET status = 'approved'
      WHERE id = 'a9400000-0000-4000-8000-000000000004'$$,
    '42501',
    NULL,
    'guest cannot self-approve a pending attendee'
);

-- 10. QR issuance is server-controlled; a guest must not inject a token.
-- This is also expected to expose the baseline UPDATE WITH CHECK gap.
SELECT throws_ok(
    $$UPDATE public.attendees
      SET qr_token = 'guest-forged-qr-token'
      WHERE id = 'a9400000-0000-4000-8000-000000000007'$$,
    '42501',
    NULL,
    'guest cannot write a server-issued QR token'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
