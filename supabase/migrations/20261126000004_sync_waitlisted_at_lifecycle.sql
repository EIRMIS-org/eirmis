-- =============================================================================
-- Migration: 20261126000004_sync_waitlisted_at_lifecycle.sql
--
-- Purpose:
--   1. Enforce the Waitlist Position (`waitlisted_at`) lifecycle for all
--      writers (guests, organizers, and service_role) via a role-agnostic
--      BEFORE UPDATE trigger on `public.invitations`:
--        - Any status transition into `waitlisted` stamps a fresh
--          `clock_timestamp()` so re-entry always starts at the back of the
--          FIFO queue.
--        - Any status transition into `pending`, `tentative`, or `declined`
--          clears `waitlisted_at` to NULL so leaving the waitlist without
--          Waitlist Promotion forfeits Waitlist Position (and `accepted ->
--          declined` never leaves stale timestamps).
--        - Transitions to `accepted` (including Waitlist Promotion) preserve
--          `waitlisted_at` as queue-history information.
--   2. Switch `v_now` in `public.fn_guard_guest_invitation_update()` from
--      `now()` to `clock_timestamp()` so timestamps advance within a single
--      transaction, matching `promote_waitlist_fifo()` and
--      `fn_guard_guest_attendee_update()`.
--   3. Backfill any pre-existing `pending`, `tentative`, or `declined`
--      invitations that still carry a stale `waitlisted_at`.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Use clock_timestamp() in fn_guard_guest_invitation_update()
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
    v_now timestamptz := clock_timestamp();
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

-- ---------------------------------------------------------------------------
-- 2. Role-agnostic BEFORE UPDATE trigger for Waitlist Position (`waitlisted_at`)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_sync_invitation_waitlisted_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'waitlisted'::public.invitation_status_enum THEN
            NEW.waitlisted_at := clock_timestamp();
        ELSIF NEW.status IN (
            'pending'::public.invitation_status_enum,
            'tentative'::public.invitation_status_enum,
            'declined'::public.invitation_status_enum
        ) THEN
            NEW.waitlisted_at := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sync_invitation_waitlisted_at()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_sync_invitation_waitlisted_at()
    TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_invitation_sync_waitlisted_at
    ON public.invitations;

-- Named alphabetically after `trg_invitation_guard_guest_update` so guest
-- auto-waitlisting (pending/tentative/declined -> accepted -> waitlisted)
-- has already resolved `NEW.status` before this trigger runs.
CREATE TRIGGER trg_invitation_sync_waitlisted_at
    BEFORE UPDATE
    ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_invitation_waitlisted_at();

COMMENT ON FUNCTION public.fn_sync_invitation_waitlisted_at() IS
    'Role-agnostic BEFORE UPDATE trigger maintaining Waitlist Position (waitlisted_at): stamps a fresh timestamp on any entry into waitlisted, clears it on transitions to pending/tentative/declined, and preserves it on promotion to accepted.';

-- ---------------------------------------------------------------------------
-- 3. Backfill stale waitlisted_at on non-waitlisted, non-accepted invitations
-- ---------------------------------------------------------------------------

UPDATE public.invitations
SET waitlisted_at = NULL
WHERE status IN (
    'pending'::public.invitation_status_enum,
    'tentative'::public.invitation_status_enum,
    'declined'::public.invitation_status_enum
)
  AND waitlisted_at IS NOT NULL;

COMMIT;
