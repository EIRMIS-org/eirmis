-- =============================================================================
-- Migration: 20261126000001_harden_guest_rsvp_and_attendee_writes.sql
--
-- Purpose:
--   Close PostgREST guest write bypasses on public.attendees and
--   public.invitations so guests cannot circumvent Event Capacity, Waitlist
--   Promotion FIFO, Party Size Limit, or check-in/review integrity.
--
--   1. Tighten "attendees: guest inserts additional attendees" so guests can
--      only insert clean pending rows (no pre-approved, checked-in, reviewed,
--      or QR-minted attendees).
--   2. Tighten "attendees: guest updates own non-primary pending/rejected" and
--      add a BEFORE UPDATE trigger enforcing the AttendeeUpdate contract
--      (full_name and email only) while automatically resetting rejected
--      Additional Attendees back to pending on edit.
--   3. Add a BEFORE UPDATE trigger on public.invitations for guest-initiated
--      updates that:
--        - restricts editable columns to status, dietary_preference, and
--          special_requests (blocking max_party_size, cached counts, and
--          provenance/timestamp tampering);
--        - requires the parent event to be published and non-deleted;
--        - enforces the guest RSVP status transition matrix (blocking
--          waitlisted -> accepted, accepted -> declined/tentative, and direct
--          writes to pending/waitlisted);
--        - locks the event row and checks Event Capacity on pending/tentative/
--          declined -> accepted, auto-routing to waitlisted when full;
--        - auto-populates responded_at when leaving pending.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tighten guest INSERT policy on public.attendees
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS
    "attendees: guest inserts additional attendees"
ON public.attendees;

CREATE POLICY "attendees: guest inserts additional attendees"
ON public.attendees
FOR INSERT
TO public
WITH CHECK (
    is_primary = false
    AND is_walk_in = false
    AND status = 'pending'::public.attendee_status_enum
    AND qr_token IS NULL
    AND checked_in = false
    AND checked_in_at IS NULL
    AND checked_in_by IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND review_reason IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.invitations i
        WHERE i.id = attendees.invitation_id
          AND public.is_guest(i.guest_id)
          AND i.status = 'accepted'
    )
);

-- ---------------------------------------------------------------------------
-- 2. Tighten guest UPDATE policy + add BEFORE UPDATE guard on public.attendees
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS
    "attendees: guest updates own non-primary pending/rejected"
ON public.attendees;

CREATE POLICY "attendees: guest updates own non-primary pending/rejected"
ON public.attendees
FOR UPDATE
TO public
USING (
    is_primary = false
    AND status = ANY (
        ARRAY[
            'pending'::public.attendee_status_enum,
            'rejected'::public.attendee_status_enum
        ]
    )
    AND EXISTS (
        SELECT 1
        FROM public.invitations i
        WHERE i.id = attendees.invitation_id
          AND public.is_guest(i.guest_id)
    )
)
WITH CHECK (
    is_primary = false
    AND is_walk_in = false
    AND status = ANY (
        ARRAY[
            'pending'::public.attendee_status_enum,
            'rejected'::public.attendee_status_enum
        ]
    )
    AND qr_token IS NULL
    AND checked_in = false
    AND checked_in_at IS NULL
    AND checked_in_by IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.invitations i
        WHERE i.id = attendees.invitation_id
          AND public.is_guest(i.guest_id)
    )
);

CREATE OR REPLACE FUNCTION public.fn_guard_guest_attendee_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only restrict direct PostgREST guest updates (top-level statements
    -- executed as anon/authenticated). service_role, postgres, SECURITY
    -- DEFINER RPCs, nested triggers, and the event's organizer bypass this.
    IF current_user NOT IN ('anon', 'authenticated')
       OR pg_trigger_depth() > 1
       OR EXISTS (
           SELECT 1
           FROM public.invitations AS i
           WHERE i.id = OLD.invitation_id
             AND public.is_event_organizer(i.event_id)
       )
    THEN
        RETURN NEW;
    END IF;

    -- Contract AttendeeUpdate allows only full_name and email.
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.invitation_id IS DISTINCT FROM OLD.invitation_id
       OR NEW.is_primary IS DISTINCT FROM OLD.is_primary
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.review_reason IS DISTINCT FROM OLD.review_reason
       OR NEW.qr_token IS DISTINCT FROM OLD.qr_token
       OR NEW.checked_in IS DISTINCT FROM OLD.checked_in
       OR NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
       OR NEW.checked_in_by IS DISTINCT FROM OLD.checked_in_by
       OR NEW.is_walk_in IS DISTINCT FROM OLD.is_walk_in
    THEN
        RAISE EXCEPTION
            'Guests may only update full_name and email on pending or rejected additional attendees.'
            USING ERRCODE = '42501';
    END IF;

    -- Editing a rejected Additional Attendee automatically resubmits it as pending.
    IF OLD.status = 'rejected'::public.attendee_status_enum THEN
        NEW.status := 'pending'::public.attendee_status_enum;
        NEW.reviewed_by := NULL;
        NEW.reviewed_at := NULL;
        NEW.review_reason := NULL;
        NEW.submitted_at := clock_timestamp();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendee_guard_guest_update
    ON public.attendees;

CREATE TRIGGER trg_attendee_guard_guest_update
    BEFORE UPDATE
    ON public.attendees
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_guest_attendee_update();

COMMENT ON FUNCTION public.fn_guard_guest_attendee_update() IS
    'Enforces the AttendeeUpdate guest column allowlist (full_name, email) and automatically resets rejected Additional Attendees to pending on resubmission.';

-- ---------------------------------------------------------------------------
-- 3. Add BEFORE UPDATE guard on public.invitations for guest updates
-- ---------------------------------------------------------------------------

-- Narrow SECURITY DEFINER helper used by fn_guard_guest_invitation_update()
-- so the trigger itself stays SECURITY INVOKER (making current_user reliable
-- even if a SECURITY DEFINER RPC is invoked from an authenticated session)
-- while still able to lock public.events FOR UPDATE and sum event-wide
-- Approved Headcount across all invitations.
CREATE OR REPLACE FUNCTION public.fn_check_guest_invitation_event_capacity(
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

COMMENT ON FUNCTION public.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean) IS
    'Internal helper for fn_guard_guest_invitation_update(): verifies event publication state and, on acceptance, locks the event row to evaluate Event Capacity.';

CREATE OR REPLACE FUNCTION public.fn_guard_guest_invitation_update()
RETURNS trigger
LANGUAGE plpgsql
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
    -- DEFINER RPCs/triggers (where current_user is the owner), nested triggers,
    -- and the event's organizer bypass this guest guard.
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
    FROM public.fn_check_guest_invitation_event_capacity(
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

DROP TRIGGER IF EXISTS trg_invitation_guard_guest_update
    ON public.invitations;

CREATE TRIGGER trg_invitation_guard_guest_update
    BEFORE UPDATE
    ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_guest_invitation_update();

COMMENT ON FUNCTION public.fn_guard_guest_invitation_update() IS
    'Enforces guest column immutability, published-event checks, RSVP status transitions, Event Capacity auto-waitlisting, and responded_at maintenance on public.invitations.';

COMMIT;
