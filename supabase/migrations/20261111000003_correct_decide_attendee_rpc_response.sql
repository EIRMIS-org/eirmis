
-- =============================================================================
-- Migration: 20261111000003_correct_decide_attendee_rpc_response.sql
-- Purpose:   Update decide_attendee() to return the attendee and
--            capacity_warning in the format required by the OpenAPI contract.
--
-- Changes:
--   1. Change the RPC return type from attendees to jsonb.
--   2. Require an explicit, non-empty reason for capacity overrides.
--   3. Reject capacity overrides for attendee rejections.
--   4. Preserve transactional capacity checking and audit logging.
--   5. Preserve service-role-only execution.
-- =============================================================================

-- PostgreSQL cannot change a function's return type using
-- CREATE OR REPLACE FUNCTION. Drop the previous function first.

DROP FUNCTION IF EXISTS public.decide_attendee(
    uuid, text, uuid, boolean, text
);


CREATE FUNCTION public.decide_attendee(
    p_attendee_id uuid,
    p_decision text,
    p_actor_id uuid,
    p_override_capacity boolean DEFAULT false,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_invitation_event_id uuid;

    v_capacity integer;
    v_current_headcount integer;

    v_event_organizer_id uuid;

    v_attendee public.attendees%ROWTYPE;
    v_updated_attendee public.attendees%ROWTYPE;

    v_would_exceed_capacity boolean := false;
    v_audit_action text;
    v_reason text;
BEGIN

    -- 1. Validate parameters.

    IF p_attendee_id IS NULL THEN
        RAISE EXCEPTION 'ATTENDEE_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'ACTOR_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_decision IS NULL
       OR p_decision NOT IN ('approve', 'reject')
    THEN
        RAISE EXCEPTION 'INVALID_ATTENDEE_DECISION'
            USING ERRCODE = '22023';
    END IF;

    IF p_override_capacity IS NULL THEN
        RAISE EXCEPTION 'INVALID_CAPACITY_OVERRIDE'
            USING ERRCODE = '22023';
    END IF;

    IF p_override_capacity AND p_decision <> 'approve' THEN
        RAISE EXCEPTION 'CAPACITY_OVERRIDE_ONLY_APPLIES_TO_APPROVAL'
            USING ERRCODE = '22023';
    END IF;

    v_reason := NULLIF(BTRIM(p_reason), '');

    IF p_override_capacity AND v_reason IS NULL THEN
        RAISE EXCEPTION 'CAPACITY_OVERRIDE_REASON_REQUIRED'
            USING ERRCODE = '22023';
    END IF;


    -- 2. Find the event associated with the attendee.

    SELECT i.event_id
    INTO v_event_id
    FROM public.attendees AS a
    JOIN public.invitations AS i
        ON i.id = a.invitation_id
    WHERE a.id = p_attendee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ATTENDEE_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;


    -- 3. Lock the event row.
    -- Every operation consuming event capacity must use this same lock.

    SELECT e.capacity, e.organizer_id
    INTO v_capacity, v_event_organizer_id
    FROM public.events AS e
    WHERE e.id = v_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;


    -- 4. Verify the organizer.

    IF v_event_organizer_id <> p_actor_id
       OR NOT EXISTS (
            SELECT 1
            FROM public.organizer_profiles AS op
            WHERE op.id = p_actor_id
              AND op.status = 'active'
       )
    THEN
        RAISE EXCEPTION 'ORGANIZER_NOT_AUTHORIZED'
            USING ERRCODE = '42501';
    END IF;


    -- 5. Lock and revalidate the attendee.

    SELECT a.*
    INTO v_attendee
    FROM public.attendees AS a
    WHERE a.id = p_attendee_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ATTENDEE_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT i.event_id
    INTO v_invitation_event_id
    FROM public.invitations AS i
    WHERE i.id = v_attendee.invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVITATION_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_invitation_event_id <> v_event_id THEN
        RAISE EXCEPTION 'ATTENDEE_EVENT_CHANGED_DURING_DECISION'
            USING ERRCODE = 'P0001';
    END IF;


    -- 6. Only pending attendees can be decided.

    IF v_attendee.status <> 'pending' THEN
        RAISE EXCEPTION 'ATTENDEE_NOT_PENDING'
            USING ERRCODE = 'P0001';
    END IF;


    -- 7. Check event capacity before approval.

    IF p_decision = 'approve' THEN

        SELECT COALESCE(SUM(i.party_size), 0)::integer
        INTO v_current_headcount
        FROM public.invitations AS i
        WHERE i.event_id = v_event_id;

        v_would_exceed_capacity :=
            (v_current_headcount + 1) > v_capacity;

        IF v_would_exceed_capacity
           AND NOT p_override_capacity
        THEN
            RAISE EXCEPTION 'EVENT_CAPACITY_EXCEEDED'
                USING
                    ERRCODE = 'P0001',
                    DETAIL = format(
                        'Capacity: %s. Current approved headcount: %s. An explicit organizer override is required.',
                        v_capacity,
                        v_current_headcount
                    );
        END IF;

    END IF;


    -- 8. Apply the attendee decision.

    UPDATE public.attendees
    SET
        status = CASE
            WHEN p_decision = 'approve'
                THEN 'approved'::public.attendee_status_enum
            ELSE 'rejected'::public.attendee_status_enum
        END,
        reviewed_by = p_actor_id,
        reviewed_at = now(),
        review_reason = v_reason
    WHERE id = p_attendee_id
    RETURNING *
    INTO v_updated_attendee;


    -- 9. Determine the audit action.

    IF p_decision = 'reject' THEN
        v_audit_action := 'attendee.rejected';

    ELSIF v_would_exceed_capacity THEN
        v_audit_action := 'attendee.approved_over_capacity';

    ELSE
        v_audit_action := 'attendee.approved';
    END IF;


    -- 10. Write the audit entry in the same transaction.

    INSERT INTO public.audit_log_entries (
        actor_type,
        actor_id,
        action,
        entity_type,
        entity_id,
        old_value,
        new_value,
        reason
    )
    VALUES (
        'organizer',
        p_actor_id,
        v_audit_action,
        'attendee',
        v_updated_attendee.id,
        jsonb_build_object(
            'status', v_attendee.status
        ),
        jsonb_build_object(
            'status', v_updated_attendee.status,
            'reviewed_by', v_updated_attendee.reviewed_by,
            'reviewed_at', v_updated_attendee.reviewed_at
        ),
        v_reason
    );


    -- 11. Return the object expected by the OpenAPI contract.

    RETURN jsonb_build_object(
        'attendee', to_jsonb(v_updated_attendee),
        'capacity_warning', v_would_exceed_capacity
    );

END;
$$;


-- 12. Restrict execution to the service role.

REVOKE ALL ON FUNCTION public.decide_attendee(
    uuid, text, uuid, boolean, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.decide_attendee(
    uuid, text, uuid, boolean, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.decide_attendee(
    uuid, text, uuid, boolean, text
) TO service_role;


COMMENT ON FUNCTION public.decide_attendee(
    uuid, text, uuid, boolean, text
) IS
'Transactional attendee decision operation. Serializes event-capacity decisions using an event row lock, applies approval or rejection, requires an explicit reason for over-capacity overrides, returns the updated attendee and capacity_warning, and records immutable audit entries.';
