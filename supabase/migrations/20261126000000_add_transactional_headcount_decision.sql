-- =============================================================================
-- Migration: 20261126000000_add_transactional_headcount_decision.sql
-- Purpose:   Centralize headcount increase approval/rejection, invitation
--            party size limit update, and audit logging in one database
--            transaction.
--
-- Architecture:
--   - The headcount-requests Edge Function handles JWT authentication and
--     post-decision guest email notifications.
--   - This RPC performs authorization, row locking, invitation max_party_size
--     update (on approve), headcount_increase_requests update, and
--     audit_log_entries insertion atomically.
--   - Lock order: events -> invitations -> headcount_increase_requests,
--     matching decide_attendee to prevent deadlocks.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.decide_headcount_request(
    p_request_id uuid,
    p_decision text,
    p_actor_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_invitation_id uuid;
    v_invitation_event_id uuid;
    v_event_organizer_id uuid;

    v_request public.headcount_increase_requests%ROWTYPE;
    v_updated_request public.headcount_increase_requests%ROWTYPE;

    v_old_max_party_size integer;
    v_new_max_party_size integer;
    v_audit_action text;
    v_reason text;
BEGIN

    -- -----------------------------------------------------------------------
    -- 1. Validate parameters.
    -- -----------------------------------------------------------------------

    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'REQUEST_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'ACTOR_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_decision IS NULL
       OR p_decision NOT IN ('approve', 'reject')
    THEN
        RAISE EXCEPTION 'INVALID_HEADCOUNT_DECISION'
            USING ERRCODE = '22023';
    END IF;

    v_reason := NULLIF(BTRIM(p_reason), '');


    -- -----------------------------------------------------------------------
    -- 2. Find the event and invitation associated with this request.
    --    Records are re-read and locked below in canonical lock order.
    -- -----------------------------------------------------------------------

    SELECT i.event_id, hir.invitation_id
    INTO v_event_id, v_invitation_id
    FROM public.headcount_increase_requests AS hir
    JOIN public.invitations AS i
        ON i.id = hir.invitation_id
    WHERE hir.id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'HEADCOUNT_REQUEST_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;


    -- -----------------------------------------------------------------------
    -- 3. Lock the event row first (matches decide_attendee lock order).
    -- -----------------------------------------------------------------------

    SELECT e.organizer_id
    INTO v_event_organizer_id
    FROM public.events AS e
    WHERE e.id = v_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;


    -- -----------------------------------------------------------------------
    -- 4. Verify the supplied actor is the active event organizer.
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
    -- 5. Lock and revalidate the invitation and headcount request.
    -- -----------------------------------------------------------------------

    SELECT i.event_id, i.max_party_size
    INTO v_invitation_event_id, v_old_max_party_size
    FROM public.invitations AS i
    WHERE i.id = v_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVITATION_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_invitation_event_id <> v_event_id THEN
        RAISE EXCEPTION 'HEADCOUNT_REQUEST_EVENT_CHANGED'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT hir.*
    INTO v_request
    FROM public.headcount_increase_requests AS hir
    WHERE hir.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'HEADCOUNT_REQUEST_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_request.invitation_id <> v_invitation_id THEN
        RAISE EXCEPTION 'HEADCOUNT_REQUEST_INVITATION_CHANGED'
            USING ERRCODE = 'P0001';
    END IF;


    -- -----------------------------------------------------------------------
    -- 6. Only pending requests can be decided.
    -- -----------------------------------------------------------------------

    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION 'HEADCOUNT_REQUEST_NOT_PENDING'
            USING ERRCODE = 'P0001';
    END IF;


    -- -----------------------------------------------------------------------
    -- 7. Apply the decision atomically.
    --    Approval raises invitations.max_party_size in full (non-blocking on
    --    event capacity; individual attendee approvals enforce capacity).
    -- -----------------------------------------------------------------------

    v_new_max_party_size := v_old_max_party_size;

    IF p_decision = 'approve' THEN
        v_new_max_party_size :=
            v_old_max_party_size + v_request.requested_additional_heads;

        UPDATE public.invitations
        SET max_party_size = v_new_max_party_size
        WHERE id = v_invitation_id;
    END IF;

    UPDATE public.headcount_increase_requests
    SET
        status = CASE
            WHEN p_decision = 'approve'
                THEN 'approved'::public.hir_status_enum
            ELSE 'rejected'::public.hir_status_enum
        END,
        reviewed_by = p_actor_id,
        reviewed_at = now(),
        review_reason = v_reason
    WHERE id = p_request_id
    RETURNING *
    INTO v_updated_request;


    -- -----------------------------------------------------------------------
    -- 8. Record the audit entry in the same transaction.
    --    Any failure here rolls back both the invitation and request updates.
    -- -----------------------------------------------------------------------

    v_audit_action := CASE
        WHEN p_decision = 'approve' THEN 'headcount_request.approved'
        ELSE 'headcount_request.rejected'
    END;

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
        'headcount_increase_request',
        v_updated_request.id,
        jsonb_build_object(
            'status', v_request.status,
            'max_party_size', v_old_max_party_size
        ),
        jsonb_build_object(
            'status', v_updated_request.status,
            'max_party_size', v_new_max_party_size,
            'requested_additional_heads', v_request.requested_additional_heads
        ),
        v_reason
    );


    -- -----------------------------------------------------------------------
    -- 9. Return the updated request and authoritative party size limits.
    -- -----------------------------------------------------------------------

    RETURN jsonb_build_object(
        'request', to_jsonb(v_updated_request),
        'old_max_party_size', v_old_max_party_size,
        'new_max_party_size', v_new_max_party_size
    );

END;
$$;


-- ---------------------------------------------------------------------------
-- Function permissions
--
-- The Edge Function invokes this RPC with the service-role client.
-- Authenticated and anonymous clients must not invoke it directly.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.decide_headcount_request(
    uuid, text, uuid, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.decide_headcount_request(
    uuid, text, uuid, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.decide_headcount_request(
    uuid, text, uuid, text
) TO service_role;


COMMENT ON FUNCTION public.decide_headcount_request(
    uuid, text, uuid, text
) IS
'Transactional headcount increase decision operation. Locks event, invitation, and request rows, verifies active organizer ownership and pending status, raises invitations.max_party_size on approval, updates the request, and records an immutable audit entry atomically.';
