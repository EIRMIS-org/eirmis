-- =============================================================================
-- EIRMIS pgTAP: approved headcount-increase request persistence contract
--
-- Covers the README §6 / §7 rules that:
--   - A pending HeadcountIncreaseRequest does not increase max_party_size.
--   - Approval raises max_party_size by the full requested amount (v1 has no
--     partial approval), records reviewer metadata, and writes an audit row.
--   - The guest can then add the newly allocated attendee rows.
--   - The invitation still cannot exceed its newly approved max_party_size.
--   - Replaying an already-completed approval must not increase the ceiling a
--     second time; rejection must not increase the ceiling.
--
-- IMPORTANT TEST SCOPE:
--   pgTAP runs inside PostgreSQL and cannot invoke the HTTP
--   decideHeadcountRequest Edge Function. The DO block below exercises the
--   documented atomic database write contract (request decision + invitation
--   ceiling + audit entry) as a test-local transaction. It does NOT prove that
--   the deployed Edge Function uses this exact transaction. Add an HTTP
--   integration test for that function, or move this decision into a SQL RPC
--   and call that RPC from this pgTAP test.
-- =============================================================================

BEGIN;

SELECT plan(21);

INSERT INTO public.events (
    id, organizer_id, title, slug, starts_at, ends_at, capacity,
    rsvp_deadline, visibility_mode, status
) VALUES (
    'aa100000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP Headcount Approval Test',
    'pgtap-headcount-approval-test',
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
      'aa200000-0000-4000-8000-000000000001',
      'pgtap-headcount-approved@example.test',
      'pgTAP Headcount Approved Guest'
    ),
    (
      'aa200000-0000-4000-8000-000000000002',
      'pgtap-headcount-rejected@example.test',
      'pgTAP Headcount Rejected Guest'
    );

-- Invitation A has a ceiling of two: its primary guest plus one additional
-- pending attendee already occupy the two allocated roster slots.
INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
) VALUES
    (
      'aa300000-0000-4000-8000-000000000001',
      'aa100000-0000-4000-8000-000000000001',
      'aa200000-0000-4000-8000-000000000001',
      'accepted',
      2
    ),
    (
      'aa300000-0000-4000-8000-000000000002',
      'aa100000-0000-4000-8000-000000000001',
      'aa200000-0000-4000-8000-000000000002',
      'accepted',
      1
    );

INSERT INTO public.attendees (id, invitation_id, full_name, status)
VALUES (
    'aa400000-0000-4000-8000-000000000001',
    'aa300000-0000-4000-8000-000000000001',
    'Existing Pending Attendee',
    'pending'
);

INSERT INTO public.headcount_increase_requests (
    id, invitation_id, requested_additional_heads, status, note
) VALUES
    (
      'aa500000-0000-4000-8000-000000000001',
      'aa300000-0000-4000-8000-000000000001',
      2,
      'pending',
      'Requesting two additional attendee places.'
    ),
    (
      'aa500000-0000-4000-8000-000000000002',
      'aa300000-0000-4000-8000-000000000002',
      3,
      'pending',
      'This request will be rejected.'
    );

-- 1-3. A pending request does not itself grant more attendee slots or affect
-- the approved-headcount cache.
SELECT is(
    (SELECT status::text FROM public.headcount_increase_requests
     WHERE id = 'aa500000-0000-4000-8000-000000000001'),
    'pending',
    'a newly submitted headcount request begins in pending status'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'aa300000-0000-4000-8000-000000000001'),
    2,
    'a pending headcount request does not increase max_party_size'
);

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'aa300000-0000-4000-8000-000000000001'),
    1,
    'pending additional attendees do not increase the approved party_size cache'
);

-- 4. The guest cannot use a pending request as permission to exceed the current
-- roster ceiling.
SELECT throws_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'aa400000-0000-4000-8000-000000000002',
        'aa300000-0000-4000-8000-000000000001',
        'Not Yet Authorized Attendee',
        'pending'
      )$$,
    '23514',
    NULL,
    'additional attendee is rejected until the headcount request is approved'
);

-- Set a service-role claim for the privileged decision transaction.
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 5. Simulate the documented atomic decision transaction. Updating the
-- request, increasing the invitation ceiling, and inserting the audit row are
-- wrapped in one PostgreSQL statement/transaction. If any operation fails,
-- lives_ok reports the error and the statement's writes are rolled back.
SELECT lives_ok(
    $decision$
    DO $body$
    DECLARE
      v_request public.headcount_increase_requests%ROWTYPE;
      v_old_max integer;
      v_new_max integer;
    BEGIN
      SELECT *
        INTO v_request
      FROM public.headcount_increase_requests
      WHERE id = 'aa500000-0000-4000-8000-000000000001'
        AND status = 'pending'
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Headcount request is not pending.'
          USING ERRCODE = 'P0001';
      END IF;

      SELECT max_party_size
        INTO v_old_max
      FROM public.invitations
      WHERE id = v_request.invitation_id
      FOR UPDATE;

      v_new_max := v_old_max + v_request.requested_additional_heads;

      UPDATE public.invitations
      SET max_party_size = v_new_max
      WHERE id = v_request.invitation_id;

      UPDATE public.headcount_increase_requests
      SET status = 'approved',
          reviewed_by = '11111111-1111-1111-1111-111111111111',
          reviewed_at = now(),
          review_reason = 'Approved in the pgTAP transaction test.'
      WHERE id = v_request.id
        AND status = 'pending';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Headcount request was already decided.'
          USING ERRCODE = 'P0001';
      END IF;

      INSERT INTO public.audit_log_entries (
        actor_type, actor_id, action, entity_type, entity_id,
        old_value, new_value, reason
      ) VALUES (
        'organizer',
        '11111111-1111-1111-1111-111111111111',
        'headcount_request.approved',
        'headcount_increase_request',
        v_request.id,
        jsonb_build_object(
          'status', 'pending',
          'max_party_size', v_old_max
        ),
        jsonb_build_object(
          'status', 'approved',
          'max_party_size', v_new_max
        ),
        'Approved in the pgTAP transaction test.'
      );
    END;
    $body$;
    $decision$,
    'approval atomically updates the request, invitation ceiling, and audit log'
);

-- 6-10. Verify the approved decision and its audit metadata.
SELECT is(
    (SELECT status::text FROM public.headcount_increase_requests
     WHERE id = 'aa500000-0000-4000-8000-000000000001'),
    'approved',
    'approved decision changes the request status to approved'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'aa300000-0000-4000-8000-000000000001'),
    4,
    'approval raises max_party_size by the full requested amount'
);

SELECT is(
    (SELECT reviewed_by FROM public.headcount_increase_requests
     WHERE id = 'aa500000-0000-4000-8000-000000000001'),
    '11111111-1111-1111-1111-111111111111'::uuid,
    'approval records the organizer who reviewed the request'
);

SELECT ok(
    (SELECT reviewed_at IS NOT NULL
     FROM public.headcount_increase_requests
     WHERE id = 'aa500000-0000-4000-8000-000000000001'),
    'approval records reviewed_at'
);

SELECT is(
    (SELECT count(*)::integer FROM public.audit_log_entries
     WHERE action = 'headcount_request.approved'
       AND entity_type = 'headcount_increase_request'
       AND entity_id = 'aa500000-0000-4000-8000-000000000001'),
    1,
    'approval writes one headcount_request.approved audit entry'
);

-- 11-14. The newly approved slots become usable, but the updated roster ceiling
-- remains enforced and pending rows still do not consume party_size.
SELECT lives_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES
        (
          'aa400000-0000-4000-8000-000000000003',
          'aa300000-0000-4000-8000-000000000001',
          'Newly Authorized Attendee One',
          'pending'
        ),
        (
          'aa400000-0000-4000-8000-000000000004',
          'aa300000-0000-4000-8000-000000000001',
          'Newly Authorized Attendee Two',
          'pending'
        )$$,
    'guest roster can use the two additional places after approval'
);

SELECT is(
    (SELECT count(*)::integer FROM public.attendees
     WHERE invitation_id = 'aa300000-0000-4000-8000-000000000001'),
    4,
    'roster contains exactly four rows after using the approved increase'
);

SELECT is(
    (SELECT party_size FROM public.invitations
     WHERE id = 'aa300000-0000-4000-8000-000000000001'),
    1,
    'new pending attendees remain excluded from approved party_size'
);

SELECT throws_ok(
    $$INSERT INTO public.attendees (id, invitation_id, full_name, status)
      VALUES (
        'aa400000-0000-4000-8000-000000000005',
        'aa300000-0000-4000-8000-000000000001',
        'Beyond Approved Increase',
        'pending'
      )$$,
    '23514',
    NULL,
    'the roster cannot exceed the newly approved max_party_size'
);

-- 15-16. Replaying an approval must not grant the same additional places twice.
SELECT lives_ok(
    $repeat$
    DO $body$
    DECLARE
      v_request public.headcount_increase_requests%ROWTYPE;
    BEGIN
      SELECT *
        INTO v_request
      FROM public.headcount_increase_requests
      WHERE id = 'aa500000-0000-4000-8000-000000000001'
        AND status = 'pending'
      FOR UPDATE;

      IF FOUND THEN
        UPDATE public.invitations
        SET max_party_size = max_party_size + v_request.requested_additional_heads
        WHERE id = v_request.invitation_id;

        UPDATE public.headcount_increase_requests
        SET status = 'approved',
            reviewed_by = '11111111-1111-1111-1111-111111111111',
            reviewed_at = now()
        WHERE id = v_request.id
          AND status = 'pending';
      END IF;
    END;
    $body$;
    $repeat$,
    'replaying an already completed approval is a safe no-op'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'aa300000-0000-4000-8000-000000000001'),
    4,
    'repeated approval does not increase max_party_size a second time'
);

-- 17-20. A rejected request records its decision but leaves the invitation's
-- allocated party ceiling unchanged.
SELECT lives_ok(
    $reject$
    DO $body$
    BEGIN
      UPDATE public.headcount_increase_requests
      SET status = 'rejected',
          reviewed_by = '11111111-1111-1111-1111-111111111111',
          reviewed_at = now(),
          review_reason = 'Not approved in the pgTAP transaction test.'
      WHERE id = 'aa500000-0000-4000-8000-000000000002'
        AND status = 'pending';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Headcount request was already decided.'
          USING ERRCODE = 'P0001';
      END IF;

      INSERT INTO public.audit_log_entries (
        actor_type, actor_id, action, entity_type, entity_id,
        old_value, new_value, reason
      ) VALUES (
        'organizer',
        '11111111-1111-1111-1111-111111111111',
        'headcount_request.rejected',
        'headcount_increase_request',
        'aa500000-0000-4000-8000-000000000002',
        jsonb_build_object('status', 'pending'),
        jsonb_build_object('status', 'rejected'),
        'Not approved in the pgTAP transaction test.'
      );
    END;
    $body$;
    $reject$,
    'organizer can record a rejected request and its audit entry atomically'
);

SELECT is(
    (SELECT status::text FROM public.headcount_increase_requests
     WHERE id = 'aa500000-0000-4000-8000-000000000002'),
    'rejected',
    'rejected decision changes the request status to rejected'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'aa300000-0000-4000-8000-000000000002'),
    1,
    'rejection does not change the invitation max_party_size'
);

SELECT is(
    (SELECT count(*)::integer FROM public.audit_log_entries
     WHERE action = 'headcount_request.rejected'
       AND entity_type = 'headcount_increase_request'
       AND entity_id = 'aa500000-0000-4000-8000-000000000002'),
    1,
    'rejection writes one headcount_request.rejected audit entry'
);

SELECT lives_ok(
    $$INSERT INTO public.headcount_increase_requests (
        id, invitation_id, requested_additional_heads, status, note
      ) VALUES (
        'aa500000-0000-4000-8000-000000000003',
        'aa300000-0000-4000-8000-000000000001',
        1,
        'pending',
        'A new request is allowed after the previous request was approved.'
      )$$,
    'a new pending request is allowed after the previous request was approved'
);

SELECT * FROM finish();
ROLLBACK;
