-- =============================================================================
-- Migration: 20261126000003_private_guest_capacity_helper_and_waitlist_reset.sql
--
-- Purpose:
--   1. Move the narrow SECURITY DEFINER capacity helper into a non-exposed
--      `private` schema (not exposed by PostgREST /rpc), revoking EXECUTE from
--      PUBLIC and anon and granting USAGE/EXECUTE to authenticated and
--      service_role.
--   2. Restore public.fn_guard_guest_invitation_update() to SECURITY INVOKER
--      using `current_user` so SECURITY DEFINER RPCs invoked by authenticated
--      sessions reliably bypass the guest guard, with EXECUTE revoked from
--      PUBLIC and anon and granted to authenticated and service_role.
--   3. Clear `waitlisted_at` when a waitlisted guest declines and always stamp
--      a fresh `waitlisted_at` on entry into `waitlisted`, so opting out
--      forfeits the guest's Waitlist Position and a later accept always starts
--      at the back of the line.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Non-exposed `private` schema and narrow SECURITY DEFINER capacity helper
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.fn_check_guest_invitation_event_capacity(
    p_event_id uuid,
    p_invitation_id uuid,
    p_lock_for_accept boolean
)
RETURNS TABLE (
    is_published boolean,
    should_waitlist boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_status public.event_status_enum;
    v_event_deleted_at timestamptz;
    v_event_capacity integer;
    v_current_headcount integer;
    v_has_primary_attendee boolean;
BEGIN
    IF p_lock_for_accept THEN
        SELECT e.status, e.deleted_at, e.capacity
        INTO v_event_status, v_event_deleted_at, v_event_capacity
        FROM public.events AS e
        WHERE e.id = p_event_id
        FOR UPDATE OF e;
    ELSE
        SELECT e.status, e.deleted_at, e.capacity
        INTO v_event_status, v_event_deleted_at, v_event_capacity
        FROM public.events AS e
        WHERE e.id = p_event_id;
    END IF;

    IF NOT FOUND
       OR v_event_status <> 'published'::public.event_status_enum
       OR v_event_deleted_at IS NOT NULL
    THEN
        is_published := false;
        should_waitlist := false;
        RETURN NEXT;
        RETURN;
    END IF;

    is_published := true;
    should_waitlist := false;

    IF p_lock_for_accept THEN
        -- An invitation that already has an approved Primary Attendee
        -- consumes no additional Event Capacity.
        SELECT EXISTS (
            SELECT 1
            FROM public.attendees AS a
            WHERE a.invitation_id = p_invitation_id
              AND a.is_primary IS TRUE
              AND a.status = 'approved'::public.attendee_status_enum
        )
        INTO v_has_primary_attendee;

        IF NOT v_has_primary_attendee THEN
            SELECT COALESCE(SUM(i.party_size), 0)::integer
            INTO v_current_headcount
            FROM public.invitations AS i
            WHERE i.event_id = p_event_id;

            IF v_current_headcount >= v_event_capacity THEN
                should_waitlist := true;
            END IF;
        END IF;
    END IF;

    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)
    TO authenticated, service_role;

COMMENT ON FUNCTION private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean) IS
    'Internal non-exposed helper for public.fn_guard_guest_invitation_update(): verifies event publication state and, on acceptance, locks the event row to evaluate Event Capacity.';

DROP FUNCTION IF EXISTS public.fn_check_guest_invitation_event_capacity(
    uuid,
    uuid,
    boolean
);

-- ---------------------------------------------------------------------------
-- 2. Restore SECURITY INVOKER trigger guard + clear waitlisted_at on decline
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_guard_guest_invitation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_accept_attempt boolean;
    v_is_published boolean;
    v_should_waitlist boolean;
    v_now timestamptz := now();
BEGIN
    -- Only restrict direct PostgREST guest updates (top-level statements
    -- executed as anon/authenticated). service_role, postgres, SECURITY
    -- DEFINER RPCs (where current_user is the owner), nested triggers, and
    -- the event's organizer bypass this guest guard.
    IF current_user NOT IN ('anon', 'authenticated')
       OR pg_trigger_depth() > 1
       OR public.is_event_organizer(OLD.event_id)
    THEN
        RETURN NEW;
    END IF;

    -- Contract InvitationRsvpUpdate allows only status, dietary_preference, and
    -- special_requests. Block all mutations to Party Size Limit (max_party_size),
    -- cached counts, ownership/provenance, and server-managed timestamps.
    -- (updated_at is unconditionally overwritten by trg_invitations_updated_at.)
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.event_id IS DISTINCT FROM OLD.event_id
       OR NEW.guest_id IS DISTINCT FROM OLD.guest_id
       OR NEW.max_party_size IS DISTINCT FROM OLD.max_party_size
       OR NEW.party_size IS DISTINCT FROM OLD.party_size
       OR NEW.checked_in_count IS DISTINCT FROM OLD.checked_in_count
       OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
       OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
       OR NEW.responded_at IS DISTINCT FROM OLD.responded_at
       OR NEW.waitlisted_at IS DISTINCT FROM OLD.waitlisted_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION
            'Guests may only update status, dietary_preference, and special_requests on their own invitation.'
            USING ERRCODE = '42501';
    END IF;

    v_is_accept_attempt :=
        NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status = 'accepted'::public.invitation_status_enum
        AND OLD.status IN (
            'pending'::public.invitation_status_enum,
            'tentative'::public.invitation_status_enum,
            'declined'::public.invitation_status_enum
        );

    SELECT c.is_published, c.should_waitlist
    INTO v_is_published, v_should_waitlist
    FROM private.fn_check_guest_invitation_event_capacity(
        OLD.event_id,
        OLD.id,
        v_is_accept_attempt
    ) AS c;

    IF NOT COALESCE(v_is_published, false) THEN
        RAISE EXCEPTION
            'Invitations can only be updated while the event is published.'
            USING ERRCODE = '42501';
    END IF;

    -- Enforce guest RSVP status transition rules.
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Guests can never directly assign pending or waitlisted.
        IF NEW.status IN (
            'pending'::public.invitation_status_enum,
            'waitlisted'::public.invitation_status_enum
        ) THEN
            RAISE EXCEPTION
                'Guests cannot set invitation status to %.',
                NEW.status
                USING ERRCODE = '42501';
        END IF;

        IF OLD.status = 'accepted'::public.invitation_status_enum THEN
            RAISE EXCEPTION
                'Guests cannot change invitation status after acceptance.'
                USING ERRCODE = '42501';

        ELSIF OLD.status = 'waitlisted'::public.invitation_status_enum THEN
            -- Only Waitlist Promotion can advance a waitlisted invitation to accepted.
            -- Guests may only opt out via declined, forfeiting their Waitlist Position.
            IF NEW.status <> 'declined'::public.invitation_status_enum THEN
                RAISE EXCEPTION
                    'Waitlisted invitations cannot be changed to % by a guest.',
                    NEW.status
                    USING ERRCODE = '42501';
            END IF;

            NEW.waitlisted_at := NULL;

        ELSIF v_is_accept_attempt AND v_should_waitlist THEN
            NEW.status := 'waitlisted'::public.invitation_status_enum;
            NEW.waitlisted_at := v_now;
        END IF;
    END IF;

    -- Auto-maintain responded_at when the guest first leaves pending status.
    IF OLD.status = 'pending'::public.invitation_status_enum
       AND NEW.status <> 'pending'::public.invitation_status_enum
    THEN
        NEW.responded_at := COALESCE(OLD.responded_at, v_now);
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_guard_guest_invitation_update()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_guard_guest_invitation_update()
    TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_guard_guest_invitation_update() IS
    'SECURITY INVOKER trigger guard enforcing guest column immutability, published-event checks, RSVP status transitions, Event Capacity auto-waitlisting, Waitlist Position reset on decline, and responded_at maintenance on public.invitations.';

COMMIT;
