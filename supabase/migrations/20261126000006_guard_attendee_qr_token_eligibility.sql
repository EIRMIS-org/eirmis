-- =============================================================================
-- Migration: 20261126000006_guard_attendee_qr_token_eligibility.sql
--
-- Purpose:
--   Close the concurrency race between QR bundle dispatch and an invitation
--   leaving `accepted` status:
--   1. Lock all attendee rows for the invitation in
--      `fn_release_invitation_seats_on_leave_accepted()` when clearing
--      `qr_token` (even if `qr_token` is currently NULL).
--   2. Add an AFTER INSERT OR UPDATE trigger on `public.attendees` that
--      rejects persisting any non-null `qr_token` unless `attendees.status`
--      is `approved` and the parent `invitations.status` is `accepted`
--      (running AFTER RLS WITH CHECK policies so guest attempts still raise
--      42501).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_release_invitation_seats_on_leave_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status = 'accepted'::public.invitation_status_enum
       AND NEW.status <> 'accepted'::public.invitation_status_enum
    THEN
        UPDATE public.attendees
        SET
            status = 'pending'::public.attendee_status_enum,
            reviewed_by = NULL,
            reviewed_at = NULL,
            review_reason = NULL,
            qr_token = NULL
        WHERE invitation_id = NEW.id
          AND is_primary IS FALSE
          AND status = 'approved'::public.attendee_status_enum;

        UPDATE public.attendees
        SET qr_token = NULL
        WHERE invitation_id = NEW.id;
    END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_release_invitation_seats_on_leave_accepted()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_release_invitation_seats_on_leave_accepted()
    TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_guard_attendee_qr_token_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invitation_status public.invitation_status_enum;
BEGIN
    IF NEW.qr_token IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT i.status
    INTO v_invitation_status
    FROM public.invitations AS i
    WHERE i.id = NEW.invitation_id;

    IF v_invitation_status IS DISTINCT FROM 'accepted'::public.invitation_status_enum
       OR NEW.status <> 'approved'::public.attendee_status_enum
    THEN
        RAISE EXCEPTION
            'QR tokens can only be persisted for approved attendees on accepted invitations.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_guard_attendee_qr_token_eligibility()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_guard_attendee_qr_token_eligibility()
    TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_guard_attendee_qr_token_eligibility() IS
    'Prevents persisting a non-null qr_token unless the attendee is approved and its parent invitation is accepted.';

DROP TRIGGER IF EXISTS trg_attendee_guard_qr_token_eligibility
    ON public.attendees;

CREATE TRIGGER trg_attendee_guard_qr_token_eligibility
    AFTER INSERT OR UPDATE OF qr_token, status
    ON public.attendees
    FOR EACH ROW
    WHEN (NEW.qr_token IS NOT NULL)
    EXECUTE FUNCTION public.fn_guard_attendee_qr_token_eligibility();

COMMIT;
