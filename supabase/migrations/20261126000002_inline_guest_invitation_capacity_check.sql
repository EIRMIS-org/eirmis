-- =============================================================================
-- Migration: 20261126000002_inline_guest_invitation_capacity_check.sql
--
-- Purpose:
--   Eliminate the PostgREST /rpc exposure of
--   public.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean), which
--   was a SECURITY DEFINER helper in public without EXECUTE revoked. Any caller
--   could invoke it via /rpc to probe event publication status and Event
--   Capacity fullness while taking FOR UPDATE locks on public.events rows.
--
--   1. Inline the event publication check, FOR UPDATE lock, and Event Capacity /
--      Approved Headcount evaluation directly into
--      public.fn_guard_guest_invitation_update() as SECURITY DEFINER.
--   2. Switch its guest-caller guard from current_user to the active role
--      (COALESCE(NULLIF(current_setting('role', true), 'none'), session_user))
--      so service_role and DB-owner writes still bypass the guard inside the
--      SECURITY DEFINER trigger while direct anon/authenticated PostgREST
--      updates remain restricted.
--   3. Revoke EXECUTE on public.fn_guard_guest_invitation_update() from PUBLIC,
--      anon, and authenticated (PostgreSQL does not require callers to hold
--      EXECUTE on a trigger function when firing a trigger).
--   4. Drop public.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_guard_guest_invitation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_active_role text := COALESCE(
        NULLIF(current_setting('role', true), 'none'),
        session_user
    );
    v_is_accept_attempt boolean;
    v_event_status public.event_status_enum;
    v_event_deleted_at timestamptz;
    v_event_capacity integer;
    v_current_headcount integer;
    v_has_primary_attendee boolean;
    v_should_waitlist boolean := false;
    v_now timestamptz := now();
BEGIN
    -- Only restrict direct PostgREST guest updates (top-level statements
    -- executed with active role anon/authenticated). service_role, postgres,
    -- nested triggers, and the event's organizer bypass this guest guard.
    IF v_active_role NOT IN ('anon', 'authenticated')
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

    -- Verify the parent event is published and non-deleted; on acceptance, lock
    -- the event row FOR UPDATE so Event Capacity is evaluated atomically.
    IF v_is_accept_attempt THEN
        SELECT e.status, e.deleted_at, e.capacity
        INTO v_event_status, v_event_deleted_at, v_event_capacity
        FROM public.events AS e
        WHERE e.id = OLD.event_id
        FOR UPDATE OF e;
    ELSE
        SELECT e.status, e.deleted_at, e.capacity
        INTO v_event_status, v_event_deleted_at, v_event_capacity
        FROM public.events AS e
        WHERE e.id = OLD.event_id;
    END IF;

    IF NOT FOUND
       OR v_event_status <> 'published'::public.event_status_enum
       OR v_event_deleted_at IS NOT NULL
    THEN
        RAISE EXCEPTION
            'Invitations can only be updated while the event is published.'
            USING ERRCODE = '42501';
    END IF;

    IF v_is_accept_attempt THEN
        -- An invitation that already has an approved Primary Attendee
        -- consumes no additional Event Capacity.
        SELECT EXISTS (
            SELECT 1
            FROM public.attendees AS a
            WHERE a.invitation_id = OLD.id
              AND a.is_primary IS TRUE
              AND a.status = 'approved'::public.attendee_status_enum
        )
        INTO v_has_primary_attendee;

        IF NOT v_has_primary_attendee THEN
            SELECT COALESCE(SUM(i.party_size), 0)::integer
            INTO v_current_headcount
            FROM public.invitations AS i
            WHERE i.event_id = OLD.event_id;

            IF v_current_headcount >= v_event_capacity THEN
                v_should_waitlist := true;
            END IF;
        END IF;
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
            -- Guests may only opt out via declined.
            IF NEW.status <> 'declined'::public.invitation_status_enum THEN
                RAISE EXCEPTION
                    'Waitlisted invitations cannot be changed to % by a guest.',
                    NEW.status
                    USING ERRCODE = '42501';
            END IF;

        ELSIF v_is_accept_attempt AND v_should_waitlist THEN
            NEW.status := 'waitlisted'::public.invitation_status_enum;
            NEW.waitlisted_at := COALESCE(OLD.waitlisted_at, v_now);
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
    FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.fn_guard_guest_invitation_update() IS
    'SECURITY DEFINER trigger guard enforcing guest column immutability, published-event checks, RSVP status transitions, Event Capacity auto-waitlisting, and responded_at maintenance on public.invitations.';

DROP FUNCTION IF EXISTS public.fn_check_guest_invitation_event_capacity(
    uuid,
    uuid,
    boolean
);

COMMIT;
