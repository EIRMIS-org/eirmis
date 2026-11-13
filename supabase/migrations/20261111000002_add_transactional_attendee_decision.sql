
-- =============================================================================
-- Migration: 20261111000002_add_transactional_attendee_decision.sql
-- Purpose:   Centralize attendee approval/rejection, event-capacity
--            validation, and audit logging in one database transaction.
--
-- Architecture:
--   - The attendees Edge Function handles authentication and authorization.
--   - This RPC performs the actual database decision.
--   - All capacity-consuming operations must lock the event row first.
--
-- Capacity:
--   - Pending attendees do not reserve event capacity.
--   - Normal approval is permitted when capacity is available.
--   - Approval beyond capacity requires an explicit override.
--   - Over-capacity approval is recorded in audit_log_entries.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- decide_attendee
--
-- Parameters:
--   p_attendee_id       Attendee being reviewed.
--   p_decision          'approve' or 'reject'.
--   p_actor_id          Authenticated organizer's profile ID.
--   p_override_capacity Whether the organizer explicitly overrides capacity.
--   p_reason            Optional organizer decision/override reason.
--
-- Returns:
--   The updated attendee record.
--
-- Important:
--   Execute only through the trusted Edge Function using service_role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.decide_attendee(
    p_attendee_id uuid,
    p_decision text,
    p_actor_id uuid,
    p_override_capacity boolean DEFAULT false,
    p_reason text DEFAULT NULL
)
RETURNS public.attendees
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

    -- -----------------------------------------------------------------------
    -- 1. Validate parameters.
    -- -----------------------------------------------------------------------

    IF p_attendee_id IS NULL THEN
        RAISE EXCEPTION 'ATTENDEE_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'ACTOR_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_decision NOT IN ('approve', 'reject') THEN
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


    -- -----------------------------------------------------------------------
    -- 2. Find the event associated with this attendee.
    --
    -- This initial lookup identifies which event must be locked.
    -- The records are rechecked after acquiring the event lock.
    -- -----------------------------------------------------------------------

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


    -- -----------------------------------------------------------------------
    -- 3. Lock the event row.
    --
    -- All operations that consume event capacity must acquire this same
    -- lock before calculating or changing the approved headcount.
    -- -----------------------------------------------------------------------

    SELECT e.capacity, e.organizer_id
    INTO v_capacity, v_event_organizer_id
    FROM public.events AS e
    WHERE e.id = v_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;


    -- -----------------------------------------------------------------------
    -- 4. Validate that the supplied actor is the active event organizer.
    --
    -- Authentication remains the responsibility of the Edge Function.
    -- This is an additional database-level ownership check.
    -- -----------------------------------------------------------------------

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


    -- -----------------------------------------------------------------------
    -- 5. Lock and revalidate the attendee and invitation.
    -- -----------------------------------------------------------------------

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


    -- -----------------------------------------------------------------------
    -- 6. Ensure that the attendee is still pending.
    -- -----------------------------------------------------------------------

    IF v_attendee.status <> 'pending' THEN
        RAISE EXCEPTION 'ATTENDEE_NOT_PENDING'
            USING ERRCODE = 'P0001';
    END IF;


    -- -----------------------------------------------------------------------
    -- 7. Check event capacity for approval.
    --
    -- invitations.party_size is already maintained by the existing
    -- trg_attendee_update_invitation_counts trigger.
    --
    -- Only approved attendees contribute to this count.
    -- -----------------------------------------------------------------------

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


    -- -----------------------------------------------------------------------
    -- 8. Apply the attendee decision.
    --
    -- QR token generation remains with the existing QR Edge Function flow.
    -- -----------------------------------------------------------------------

    UPDATE public.attendees
    SET
        status = CASE
            WHEN p_decision = 'approve' THEN 'approved'::public.attendee_status_enum
            ELSE 'rejected'::public.attendee_status_enum
        END,
        reviewed_by = p_actor_id,
        reviewed_at = now(),
        review_reason = v_reason
    WHERE id = p_attendee_id
    RETURNING *
    INTO v_updated_attendee;


    -- -----------------------------------------------------------------------
    -- 9. Determine the audit action.
    -- -----------------------------------------------------------------------

    IF p_decision = 'reject' THEN
        v_audit_action := 'attendee.rejected';

    ELSIF v_would_exceed_capacity THEN
        v_audit_action := 'attendee.approved_over_capacity';

    ELSE
        v_audit_action := 'attendee.approved';
    END IF;


    -- -----------------------------------------------------------------------
    -- 10. Record the audit entry in the same transaction.
    --
    -- If the audit insertion fails, the attendee update also rolls back.
    -- -----------------------------------------------------------------------

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


    -- -----------------------------------------------------------------------
    -- 11. Return the updated attendee.
    -- -----------------------------------------------------------------------

    RETURN v_updated_attendee;

END;
$$;


-- ---------------------------------------------------------------------------
-- Function permissions
--
-- The Edge Function uses the service-role client to invoke this RPC.
-- Authenticated and anonymous clients must not invoke it directly.
-- ---------------------------------------------------------------------------

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
'Transactional attendee decision operation. Serializes event-capacity decisions using an event row lock, applies approval or rejection, supports explicit over-capacity organizer overrides, and records immutable audit entries.';
