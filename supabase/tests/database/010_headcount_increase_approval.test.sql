-- =============================================================================
-- EIRMIS pgTAP: decide_headcount_request RPC persistence & security contract
--
-- Exercises public.decide_headcount_request directly to verify:
--   - A pending Headcount Increase Request does not increase Party Size Limit.
--   - Approval atomically raises invitations.max_party_size in full, records
--     reviewer metadata, and writes an audit_log_entries row.
--   - The guest can then add the newly allocated attendee rows up to the new
--     Party Size Limit.
--   - Replaying an already-decided request fails with P0001 and leaves
--     max_party_size unchanged; rejection leaves max_party_size unchanged.
--   - Unauthorized organizers are rejected with 42501.
--   - Execute permission is restricted to service_role (revoked from anon and
--     authenticated).
-- =============================================================================

BEGIN;

SELECT plan(25);

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

-- Invitation A has a Party Size Limit of 2: its Primary Attendee plus one
-- Additional Attendee (pending) already occupy the limit.
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

-- 1-3. A pending request does not itself grant more attendee places or affect
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

-- 4. The guest cannot use a pending request to exceed the current limit.
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

-- Set a service-role claim for the privileged RPC invocation.
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 5. Approve request #1 via public.decide_headcount_request.
SELECT lives_ok(
    $$SELECT public.decide_headcount_request(
        'aa500000-0000-4000-8000-000000000001'::uuid,
        'approve',
        '11111111-1111-1111-1111-111111111111'::uuid,
        'Approved via decide_headcount_request RPC.'
    )$$,
    'decide_headcount_request atomically approves the request, raises max_party_size, and logs audit'
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

-- 11-14. The newly approved places become usable, while the updated limit
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

-- 15-16. Replaying an already-decided request fails with P0001 and does not
-- grant the additional places a second time.
SELECT throws_ok(
    $$SELECT public.decide_headcount_request(
        'aa500000-0000-4000-8000-000000000001'::uuid,
        'approve',
        '11111111-1111-1111-1111-111111111111'::uuid,
        'Replay attempt'
    )$$,
    'P0001',
    'HEADCOUNT_REQUEST_NOT_PENDING',
    'replaying an already completed approval raises HEADCOUNT_REQUEST_NOT_PENDING'
);

SELECT is(
    (SELECT max_party_size FROM public.invitations
     WHERE id = 'aa300000-0000-4000-8000-000000000001'),
    4,
    'repeated approval does not increase max_party_size a second time'
);

-- 17. An organizer who does not own the event cannot decide the request.
SELECT throws_ok(
    $$SELECT public.decide_headcount_request(
        'aa500000-0000-4000-8000-000000000002'::uuid,
        'reject',
        '99999999-9999-9999-9999-999999999999'::uuid,
        'Unauthorized attempt'
    )$$,
    '42501',
    'ORGANIZER_NOT_AUTHORIZED',
    'unauthorized actor is rejected with ORGANIZER_NOT_AUTHORIZED'
);

-- 18-21. A rejected request records its decision and audit entry while leaving
-- the invitation Party Size Limit unchanged.
SELECT lives_ok(
    $$SELECT public.decide_headcount_request(
        'aa500000-0000-4000-8000-000000000002'::uuid,
        'reject',
        '11111111-1111-1111-1111-111111111111'::uuid,
        'Not approved via decide_headcount_request RPC.'
    )$$,
    'decide_headcount_request atomically rejects the request and writes an audit entry'
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

-- 22. A new pending request is allowed once the previous one is decided.
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

-- 23-25. Execute permissions are restricted to service_role.
SELECT ok(
    NOT has_function_privilege(
        'anon',
        'public.decide_headcount_request(uuid, text, uuid, text)',
        'EXECUTE'
    ),
    'anon cannot execute decide_headcount_request'
);

SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'public.decide_headcount_request(uuid, text, uuid, text)',
        'EXECUTE'
    ),
    'authenticated cannot execute decide_headcount_request'
);

SELECT ok(
    has_function_privilege(
        'service_role',
        'public.decide_headcount_request(uuid, text, uuid, text)',
        'EXECUTE'
    ),
    'service_role can execute decide_headcount_request'
);

SELECT * FROM finish();
ROLLBACK;
