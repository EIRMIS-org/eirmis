
-- =============================================================================
-- EIRMIS pgTAP: transactional attendee decision RPC
--
-- Tests:
--   1. RPC return type and execution permissions.
--   2. Normal attendee approval.
--   3. Attendee rejection.
--   4. Capacity enforcement without an override.
--   5. Explicit capacity override.
--   6. Audit logging.
--
-- Uses the existing seeded active organizer:
--   11111111-1111-1111-1111-111111111111
--
-- All test data is isolated and rolled back at the end.
-- =============================================================================

BEGIN;

SELECT plan(20);


-- ---------------------------------------------------------------------------
-- FIXTURE DATA
-- ---------------------------------------------------------------------------

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
    'c1000000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'pgTAP Attendee Decision Test',
    'pgtap-attendee-decision-test',
    now() + interval '2 days',
    now() + interval '3 days',
    3,
    now() + interval '1 day',
    'open_registration',
    'published'
);

INSERT INTO public.guests (
    id,
    email,
    full_name
)
VALUES
(
    'c2000000-0000-4000-8000-000000000001',
    'pgtap-decision-one@example.test',
    'Decision Guest One'
),
(
    'c2000000-0000-4000-8000-000000000002',
    'pgtap-decision-two@example.test',
    'Decision Guest Two'
);

-- Two accepted invitations create two approved primary attendees.
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
    'c3000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001',
    'accepted',
    3
),
(
    'c3000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000002',
    'accepted',
    2
);

-- Three pending attendees:
--   1. Normal approval.
--   2. Approval requiring an override.
--   3. Rejection.
INSERT INTO public.attendees (
    id,
    invitation_id,
    full_name,
    status
)
VALUES
(
    'c4000000-0000-4000-8000-000000000001',
    'c3000000-0000-4000-8000-000000000001',
    'Normal Approval Attendee',
    'pending'
),
(
    'c4000000-0000-4000-8000-000000000002',
    'c3000000-0000-4000-8000-000000000001',
    'Override Approval Attendee',
    'pending'
),
(
    'c4000000-0000-4000-8000-000000000003',
    'c3000000-0000-4000-8000-000000000002',
    'Rejected Attendee',
    'pending'
);


-- ---------------------------------------------------------------------------
-- 1-4. RPC DEFINITION AND PERMISSIONS
-- ---------------------------------------------------------------------------

SELECT is(
    (
        SELECT pg_get_function_result(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'decide_attendee'
          AND pg_get_function_identity_arguments(p.oid) =
              'p_attendee_id uuid, p_decision text, p_actor_id uuid, p_override_capacity boolean, p_reason text'
    ),
    'jsonb',
    'decide_attendee returns jsonb'
);

SELECT ok(
    has_function_privilege(
        'service_role',
        'public.decide_attendee(uuid,text,uuid,boolean,text)',
        'EXECUTE'
    ),
    'service_role can execute decide_attendee'
);

SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'public.decide_attendee(uuid,text,uuid,boolean,text)',
        'EXECUTE'
    ),
    'authenticated role cannot execute decide_attendee directly'
);

SELECT ok(
    NOT has_function_privilege(
        'anon',
        'public.decide_attendee(uuid,text,uuid,boolean,text)',
        'EXECUTE'
    ),
    'anon role cannot execute decide_attendee directly'
);


-- ---------------------------------------------------------------------------
-- 5. INITIAL HEADCOUNT
-- ---------------------------------------------------------------------------

SELECT is(
    (
        SELECT COALESCE(SUM(party_size), 0)::integer
        FROM public.invitations
        WHERE event_id = 'c1000000-0000-4000-8000-000000000001'
    ),
    2,
    'initial event headcount is two approved primary attendees'
);


-- ---------------------------------------------------------------------------
-- 6-9. NORMAL APPROVAL
-- ---------------------------------------------------------------------------

SELECT is(
    (
        public.decide_attendee(
            'c4000000-0000-4000-8000-000000000001',
            'approve',
            '11111111-1111-1111-1111-111111111111',
            false,
            'Normal approval test'
        )->>'capacity_warning'
    ),
    'false',
    'normal approval does not raise capacity_warning'
);

SELECT is(
    (
        SELECT status::text
        FROM public.attendees
        WHERE id = 'c4000000-0000-4000-8000-000000000001'
    ),
    'approved',
    'normal approval updates attendee status'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM public.audit_log_entries
        WHERE entity_type = 'attendee'
          AND entity_id = 'c4000000-0000-4000-8000-000000000001'
          AND action = 'attendee.approved'
    ),
    'normal approval creates attendee.approved audit entry'
);

SELECT is(
    (
        SELECT COALESCE(SUM(party_size), 0)::integer
        FROM public.invitations
        WHERE event_id = 'c1000000-0000-4000-8000-000000000001'
    ),
    3,
    'normal approval increases event headcount to three'
);


-- ---------------------------------------------------------------------------
-- 10-12. APPROVAL WITHOUT OVERRIDE
-- ---------------------------------------------------------------------------

SELECT throws_ok(
    $$
        SELECT public.decide_attendee(
            'c4000000-0000-4000-8000-000000000002',
            'approve',
            '11111111-1111-1111-1111-111111111111',
            false,
            NULL
        )
    $$,
    'P0001',
    'EVENT_CAPACITY_EXCEEDED',
    'approval beyond capacity is rejected without override'
);

SELECT is(
    (
        SELECT status::text
        FROM public.attendees
        WHERE id = 'c4000000-0000-4000-8000-000000000002'
    ),
    'pending',
    'attendee remains pending after rejected over-capacity approval'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM public.audit_log_entries
        WHERE entity_type = 'attendee'
          AND entity_id = 'c4000000-0000-4000-8000-000000000002'
    ),
    'failed approval does not create an audit entry'
);


-- ---------------------------------------------------------------------------
-- 13-17. EXPLICIT CAPACITY OVERRIDE
-- ---------------------------------------------------------------------------

SELECT is(
    (
        public.decide_attendee(
            'c4000000-0000-4000-8000-000000000002',
            'approve',
            '11111111-1111-1111-1111-111111111111',
            true,
            'Approved after organizer capacity review.'
        )->>'capacity_warning'
    ),
    'true',
    'explicit override allows approval beyond capacity and raises warning'
);

SELECT is(
    (
        SELECT status::text
        FROM public.attendees
        WHERE id = 'c4000000-0000-4000-8000-000000000002'
    ),
    'approved',
    'capacity override successfully approves the attendee'
);

SELECT is(
    (
        SELECT action
        FROM public.audit_log_entries
        WHERE entity_type = 'attendee'
          AND entity_id = 'c4000000-0000-4000-8000-000000000002'
    ),
    'attendee.approved_over_capacity',
    'capacity override creates the correct audit action'
);

SELECT is(
    (
        SELECT reason
        FROM public.audit_log_entries
        WHERE entity_type = 'attendee'
          AND entity_id = 'c4000000-0000-4000-8000-000000000002'
    ),
    'Approved after organizer capacity review.',
    'capacity override audit entry stores the organizer reason'
);

SELECT is(
    (
        SELECT COALESCE(SUM(party_size), 0)::integer
        FROM public.invitations
        WHERE event_id = 'c1000000-0000-4000-8000-000000000001'
    ),
    4,
    'authorized capacity override increases event headcount to four'
);


-- ---------------------------------------------------------------------------
-- 18-20. REJECTION
-- ---------------------------------------------------------------------------

SELECT is(
    (
        public.decide_attendee(
            'c4000000-0000-4000-8000-000000000003',
            'reject',
            '11111111-1111-1111-1111-111111111111',
            false,
            'Does not match the guest list.'
        )->>'capacity_warning'
    ),
    'false',
    'rejection does not raise capacity_warning'
);

SELECT is(
    (
        SELECT status::text
        FROM public.attendees
        WHERE id = 'c4000000-0000-4000-8000-000000000003'
    ),
    'rejected',
    'rejection updates attendee status'
);

SELECT is(
    (
        SELECT action
        FROM public.audit_log_entries
        WHERE entity_type = 'attendee'
          AND entity_id = 'c4000000-0000-4000-8000-000000000003'
    ),
    'attendee.rejected',
    'rejection creates attendee.rejected audit entry'
);


-- ---------------------------------------------------------------------------
-- FINISH
-- ---------------------------------------------------------------------------

SELECT * FROM finish();

ROLLBACK;
