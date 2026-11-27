-- =============================================================================
-- Migration: 20261126000005_rsvp_deadline_attendee_updates_and_accepted_decline.sql
--
-- Purpose:
--   1. Enforce event `rsvp_deadline` and `accepted` invitation status directly
--      inside `public.fn_guard_guest_attendee_update()` right after the
--      organizer and service bypass.
--   2. Allow guests to transition `accepted -> declined` before `rsvp_deadline`
--      (unless `checked_in_count > 0`) while keeping `accepted -> tentative`
--      blocked.
--   3. Gate seat occupancy (`invitations.party_size` and Event Capacity /
--      Approved Headcount calculations) on `invitations.status = 'accepted'`
--      (ADR-0002), keeping Primary Attendee rows immutable while releasing all
--      seats, resetting approved Additional Attendees to `pending`, and
--      clearing `qr_token` on any transition out of `accepted`.
--   4. Remove the `has_primary_attendee` Event Capacity bypass in
--      `private.fn_check_guest_invitation_event_capacity()` and
--      `public.promote_waitlist_fifo()` so re-accepting or promoting after a
--      decline always respects Event Capacity.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enforce rsvp_deadline and accepted invitation status on guest attendee edits
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_guard_guest_attendee_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invitation_status public.invitation_status_enum;
    v_rsvp_deadline timestamptz;
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

    -- Verify the parent event is still published/visible and enforce rsvp_deadline
    -- directly before evaluating column allowlists or resubmission state resets.
    SELECT i.status, e.rsvp_deadline
    INTO v_invitation_status, v_rsvp_deadline
    FROM public.invitations AS i
    JOIN public.events AS e
      ON e.id = i.event_id
    WHERE i.id = OLD.invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Attendees can only be updated while the event is published.'
            USING ERRCODE = '42501';
    END IF;

    IF v_rsvp_deadline IS NOT NULL
       AND clock_timestamp() > v_rsvp_deadline
    THEN
        RAISE EXCEPTION
            'RSVP deadline has passed. No further changes are permitted.'
            USING ERRCODE = 'P0001',
                  HINT = 'The RSVP deadline for this event has passed.';
    END IF;

    IF v_invitation_status <> 'accepted'::public.invitation_status_enum THEN
        RAISE EXCEPTION
            'Guests may only update additional attendees on accepted invitations.'
            USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.fn_guard_guest_attendee_update()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_guard_guest_attendee_update()
    TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_guard_guest_attendee_update() IS
    'Enforces RSVP deadline, accepted invitation status, and the AttendeeUpdate guest column allowlist (full_name, email), automatically resetting rejected Additional Attendees to pending on resubmission.';

-- ---------------------------------------------------------------------------
-- 2. Gate Event Capacity check on accepted invitations and remove primary bypass
-- ---------------------------------------------------------------------------

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
        -- Only accepted invitations occupy seats (ADR-0002). Because declining
        -- releases the guest's seat, re-accepting always requires available
        -- Event Capacity even if an immutable Primary Attendee row exists.
        SELECT COALESCE(SUM(i.party_size), 0)::integer
        INTO v_current_headcount
        FROM public.invitations AS i
        WHERE i.event_id = p_event_id
          AND i.status = 'accepted'::public.invitation_status_enum;

        IF v_current_headcount >= v_event_capacity THEN
            should_waitlist := true;
        END IF;
    END IF;

    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fn_check_guest_invitation_event_capacity(uuid, uuid, boolean)
    TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Allow accepted -> declined in fn_guard_guest_invitation_update()
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
            -- Guests may decline an accepted invitation before the RSVP deadline
            -- (enforced by trg_invitations_rsvp_deadline_check), unless an
            -- attendee on the invitation has already checked in.
            IF NEW.status <> 'declined'::public.invitation_status_enum THEN
                RAISE EXCEPTION
                    'Accepted invitations can only be changed to declined by a guest.'
                    USING ERRCODE = '42501';
            END IF;

            IF OLD.checked_in_count > 0 THEN
                RAISE EXCEPTION
                    'Guests cannot decline an invitation after an attendee has checked in.'
                    USING ERRCODE = '42501';
            END IF;

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
-- 4. Scope invitations.party_size to accepted invitations & release seats
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_update_invitation_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invitation_id uuid;
    v_invitation_status public.invitation_status_enum;
    v_party_size integer;
    v_checked_in_count integer;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_invitation_id := OLD.invitation_id;
    ELSE
        v_invitation_id := NEW.invitation_id;
    END IF;

    SELECT i.status
    INTO v_invitation_status
    FROM public.invitations AS i
    WHERE i.id = v_invitation_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF v_invitation_status = 'accepted'::public.invitation_status_enum THEN
        SELECT count(*)::integer
        INTO v_party_size
        FROM public.attendees AS a
        WHERE a.invitation_id = v_invitation_id
          AND a.status = 'approved'::public.attendee_status_enum;
    ELSE
        v_party_size := 0;
    END IF;

    SELECT count(*)::integer
    INTO v_checked_in_count
    FROM public.attendees AS a
    WHERE a.invitation_id = v_invitation_id
      AND a.checked_in = true;

    UPDATE public.invitations
    SET
        party_size = v_party_size,
        checked_in_count = v_checked_in_count,
        updated_at = now()
    WHERE id = v_invitation_id
      AND (
          party_size IS DISTINCT FROM v_party_size
          OR checked_in_count IS DISTINCT FROM v_checked_in_count
      );

    RETURN NULL;
END;
$$;

-- Role-agnostic BEFORE UPDATE trigger keeping invitations.party_size synced on
-- status transitions into or out of accepted (named alphabetically after
-- trg_invitation_guard_guest_update so auto-waitlisting has already resolved
-- NEW.status).
CREATE OR REPLACE FUNCTION public.fn_sync_invitation_party_size()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status = 'accepted'::public.invitation_status_enum
           AND NEW.status <> 'accepted'::public.invitation_status_enum
           AND OLD.checked_in_count > 0
        THEN
            RAISE EXCEPTION
                'Cannot leave accepted status after an attendee has checked in.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.status = 'accepted'::public.invitation_status_enum THEN
            SELECT count(*)::integer
            INTO NEW.party_size
            FROM public.attendees AS a
            WHERE a.invitation_id = NEW.id
              AND a.status = 'approved'::public.attendee_status_enum;
        ELSE
            NEW.party_size := 0;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sync_invitation_party_size()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_sync_invitation_party_size()
    TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_sync_invitation_party_size() IS
    'Role-agnostic BEFORE UPDATE trigger that blocks leaving accepted after check-in and keeps invitations.party_size synced to accepted-only seat occupancy (ADR-0002).';

DROP TRIGGER IF EXISTS trg_invitation_sync_party_size
    ON public.invitations;

CREATE TRIGGER trg_invitation_sync_party_size
    BEFORE UPDATE
    ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_invitation_party_size();

-- Role-agnostic AFTER UPDATE trigger releasing seats when an invitation leaves
-- accepted: resets approved Additional Attendees back to pending (clearing
-- review metadata) and clears qr_token across all attendees on the invitation.
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
        WHERE invitation_id = NEW.id
          AND qr_token IS NOT NULL;
    END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_release_invitation_seats_on_leave_accepted()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_release_invitation_seats_on_leave_accepted()
    TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_release_invitation_seats_on_leave_accepted() IS
    'Role-agnostic AFTER UPDATE trigger that resets approved Additional Attendees to pending and clears qr_token across all attendees when an invitation leaves accepted status (ADR-0002).';

DROP TRIGGER IF EXISTS trg_invitation_release_seats_on_leave_accepted
    ON public.invitations;

CREATE TRIGGER trg_invitation_release_seats_on_leave_accepted
    AFTER UPDATE
    ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_release_invitation_seats_on_leave_accepted();

-- ---------------------------------------------------------------------------
-- 5. Update promote_waitlist_fifo() and admit_public_rsvp() for accepted-only capacity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_waitlist_fifo(
    p_event_id uuid,
    p_max_promotions integer DEFAULT 1
)
RETURNS TABLE (
    id uuid,
    event_id uuid,
    guest_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_capacity integer;
    v_current_headcount integer;
    v_candidate record;
    v_updated_count integer;
    v_now timestamptz := clock_timestamp();
BEGIN
    IF p_event_id IS NULL THEN
        RAISE EXCEPTION 'EVENT_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_max_promotions IS NULL OR p_max_promotions < 1 THEN
        RAISE EXCEPTION 'MAX_PROMOTIONS_MUST_BE_POSITIVE'
            USING ERRCODE = '22023';
    END IF;

    SELECT e.capacity
    INTO v_capacity
    FROM public.events AS e
    WHERE e.id = p_event_id
    FOR UPDATE OF e;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT COALESCE(SUM(i.party_size), 0)::integer
    INTO v_current_headcount
    FROM public.invitations AS i
    WHERE i.event_id = p_event_id
      AND i.status = 'accepted'::public.invitation_status_enum;

    FOR v_candidate IN
        SELECT
            i.id AS invitation_id,
            i.event_id AS invitation_event_id,
            i.guest_id AS invitation_guest_id
        FROM public.invitations AS i
        WHERE i.event_id = p_event_id
          AND i.status = 'waitlisted'::public.invitation_status_enum
          AND i.waitlisted_at IS NOT NULL
        ORDER BY
            i.waitlisted_at ASC,
            i.created_at ASC,
            i.id ASC
        LIMIT p_max_promotions
        FOR UPDATE OF i
    LOOP
        -- Every promoted invitation transitions from party_size = 0 to
        -- party_size = 1 (ADR-0002), even if an immutable Primary Attendee row
        -- already exists from an earlier acceptance.
        IF v_current_headcount >= v_capacity THEN
            EXIT;
        END IF;

        UPDATE public.invitations AS i
        SET
            status = 'accepted'::public.invitation_status_enum,
            responded_at = COALESCE(i.responded_at, v_now)
        WHERE i.id = v_candidate.invitation_id
          AND i.status = 'waitlisted'::public.invitation_status_enum
          AND i.waitlisted_at IS NOT NULL;

        GET DIAGNOSTICS v_updated_count = ROW_COUNT;

        IF v_updated_count = 0 THEN
            CONTINUE;
        END IF;

        SELECT COALESCE(SUM(i.party_size), 0)::integer
        INTO v_current_headcount
        FROM public.invitations AS i
        WHERE i.event_id = p_event_id
          AND i.status = 'accepted'::public.invitation_status_enum;

        id := v_candidate.invitation_id;
        event_id := v_candidate.invitation_event_id;
        guest_id := v_candidate.invitation_guest_id;

        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_waitlist_fifo(uuid, integer)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_waitlist_fifo(uuid, integer)
    TO service_role;

CREATE OR REPLACE FUNCTION public.admit_public_rsvp(
    p_event_slug text,
    p_email text,
    p_full_name text
)
RETURNS public.invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event public.events%ROWTYPE;
    v_guest_id uuid;
    v_invitation_id uuid;
    v_invitation public.invitations%ROWTYPE;
    v_email text;
    v_full_name text;
    v_event_slug text;
    v_current_headcount integer;
    v_admission_status public.invitation_status_enum;
    v_now timestamptz := clock_timestamp();
BEGIN
    v_event_slug := NULLIF(btrim(p_event_slug), '');
    v_email := lower(NULLIF(btrim(p_email), ''));
    v_full_name := NULLIF(btrim(p_full_name), '');

    IF v_event_slug IS NULL THEN
        RAISE EXCEPTION 'EVENT_SLUG_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF v_email IS NULL
       OR length(v_email) > 320
       OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    THEN
        RAISE EXCEPTION 'INVALID_EMAIL'
            USING ERRCODE = '22023';
    END IF;

    IF v_full_name IS NULL THEN
        RAISE EXCEPTION 'FULL_NAME_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    SELECT e.*
    INTO v_event
    FROM public.events AS e
    WHERE e.slug = v_event_slug
      AND e.deleted_at IS NULL
    FOR UPDATE OF e;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_event.visibility_mode <> 'open_registration' THEN
        RAISE EXCEPTION 'EVENT_NOT_OPEN_FOR_REGISTRATION'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_event.status <> 'published' THEN
        RAISE EXCEPTION 'EVENT_NOT_ACCEPTING_RSVPS'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_event.rsvp_deadline <= v_now THEN
        RAISE EXCEPTION 'RSVP_DEADLINE_PASSED'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(SUM(i.party_size), 0)::integer
    INTO v_current_headcount
    FROM public.invitations AS i
    WHERE i.event_id = v_event.id
      AND i.status = 'accepted'::public.invitation_status_enum;

    IF v_current_headcount < v_event.capacity THEN
        v_admission_status := 'accepted';
    ELSE
        v_admission_status := 'waitlisted';
    END IF;

    INSERT INTO public.guests (email, full_name)
    VALUES (v_email, v_full_name)
    ON CONFLICT ((lower(email)))
    DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name
    RETURNING id
    INTO v_guest_id;

    INSERT INTO public.invitations (
        event_id,
        guest_id,
        status,
        max_party_size,
        responded_at,
        waitlisted_at
    )
    VALUES (
        v_event.id,
        v_guest_id,
        v_admission_status,
        1,
        v_now,
        CASE
            WHEN v_admission_status = 'waitlisted' THEN v_now
            ELSE NULL
        END
    )
    ON CONFLICT ON CONSTRAINT invitations_unique_per_event_guest
    DO NOTHING
    RETURNING id
    INTO v_invitation_id;

    IF v_invitation_id IS NULL THEN
        RAISE EXCEPTION 'RSVP_ALREADY_EXISTS'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT i.*
    INTO v_invitation
    FROM public.invitations AS i
    WHERE i.id = v_invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVITATION_CREATION_FAILED'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN v_invitation;
END;
$$;

REVOKE ALL ON FUNCTION public.admit_public_rsvp(text, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admit_public_rsvp(text, text, text)
    TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Require accepted invitation status in check-in and organizer approvals
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_attendee_check_in(
    p_attendee_id uuid,
    p_event_id uuid,
    p_auth_user_id uuid,
    p_actor_type public.audit_actor_type_enum,
    p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime, pg_temp
AS $$
DECLARE
    v_attendee public.attendees%ROWTYPE;
    v_checked_in_at timestamptz;
    v_total_checked_in integer;
    v_result text;
BEGIN
    PERFORM 1 FROM public.events WHERE id = p_event_id FOR NO KEY UPDATE;

    SELECT a.* INTO v_attendee
    FROM public.attendees AS a
    JOIN public.invitations AS i ON i.id = a.invitation_id
    WHERE a.id = p_attendee_id
      AND i.event_id = p_event_id
      AND i.status = 'accepted'::public.invitation_status_enum
      AND a.status = 'approved'::public.attendee_status_enum
    FOR UPDATE OF a, i;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approved attendee does not belong to an accepted invitation for this event.'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_attendee.checked_in THEN
        v_result := 'already_checked_in';
        v_checked_in_at := v_attendee.checked_in_at;
    ELSE
        v_result := 'accepted';
        v_checked_in_at := clock_timestamp();
        UPDATE public.attendees
        SET checked_in = true, checked_in_at = v_checked_in_at, checked_in_by = p_auth_user_id
        WHERE id = p_attendee_id
        RETURNING * INTO v_attendee;
    END IF;

    INSERT INTO public.audit_log_entries (
        actor_type, actor_id, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        p_actor_type,
        p_actor_id,
        CASE WHEN v_result = 'accepted'
            THEN 'checkin.attendee_scanned'
            ELSE 'checkin.attendee_rescanned'
        END,
        'attendee',
        p_attendee_id,
        jsonb_build_object('checked_in', v_result = 'already_checked_in'),
        jsonb_build_object('checked_in', true, 'checked_in_at', v_checked_in_at)
    );

    SELECT count(*)::integer INTO v_total_checked_in
    FROM public.attendees AS a
    JOIN public.invitations AS i ON i.id = a.invitation_id
    WHERE i.event_id = p_event_id AND a.checked_in = true;

    IF v_result = 'accepted' THEN
        PERFORM realtime.send(
            payload => jsonb_build_object(
                'attendee_id', v_attendee.id,
                'attendee_name', v_attendee.full_name,
                'scanned_at', v_checked_in_at,
                'scanned_by', p_auth_user_id,
                'total_checked_in', v_total_checked_in
            ),
            event => 'check-in',
            topic => 'broadcast:attendance:' || p_event_id::text,
            private => true
        );
    END IF;

    RETURN jsonb_build_object(
        'result', v_result,
        'attendee', to_jsonb(v_attendee),
        'checked_in_at', v_checked_in_at,
        'total_checked_in', v_total_checked_in
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_attendee_check_in(uuid, uuid, uuid, public.audit_actor_type_enum, uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_attendee_check_in(uuid, uuid, uuid, public.audit_actor_type_enum, uuid)
    TO service_role;

CREATE OR REPLACE FUNCTION public.decide_attendee(
    p_attendee_id uuid,
    p_decision text,
    p_actor_id uuid,
    p_override_capacity boolean DEFAULT false,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_id uuid;
    v_invitation_event_id uuid;
    v_invitation_status public.invitation_status_enum;
    v_capacity integer;
    v_current_headcount integer;
    v_event_organizer_id uuid;
    v_attendee public.attendees%ROWTYPE;
    v_updated_attendee public.attendees%ROWTYPE;
    v_would_exceed_capacity boolean := false;
    v_audit_action text;
    v_reason text;
BEGIN
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

    SELECT e.capacity, e.organizer_id
    INTO v_capacity, v_event_organizer_id
    FROM public.events AS e
    WHERE e.id = v_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

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

    SELECT a.*
    INTO v_attendee
    FROM public.attendees AS a
    WHERE a.id = p_attendee_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ATTENDEE_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT i.event_id, i.status
    INTO v_invitation_event_id, v_invitation_status
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

    IF v_attendee.status <> 'pending' THEN
        RAISE EXCEPTION 'ATTENDEE_NOT_PENDING'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_decision = 'approve' THEN
        IF v_invitation_status <> 'accepted'::public.invitation_status_enum THEN
            RAISE EXCEPTION 'INVITATION_NOT_ACCEPTED'
                USING ERRCODE = 'P0001';
        END IF;

        SELECT COALESCE(SUM(i.party_size), 0)::integer
        INTO v_current_headcount
        FROM public.invitations AS i
        WHERE i.event_id = v_event_id
          AND i.status = 'accepted'::public.invitation_status_enum;

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

    IF p_decision = 'reject' THEN
        v_audit_action := 'attendee.rejected';
    ELSIF v_would_exceed_capacity THEN
        v_audit_action := 'attendee.approved_over_capacity';
    ELSE
        v_audit_action := 'attendee.approved';
    END IF;

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
        jsonb_build_object('status', v_attendee.status),
        jsonb_build_object(
            'status', v_updated_attendee.status,
            'reviewed_by', v_updated_attendee.reviewed_by,
            'reviewed_at', v_updated_attendee.reviewed_at
        ),
        v_reason
    );

    RETURN jsonb_build_object(
        'attendee', to_jsonb(v_updated_attendee),
        'capacity_warning', v_would_exceed_capacity
    );
END;
$$;

REVOKE ALL ON FUNCTION public.decide_attendee(uuid, text, uuid, boolean, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_attendee(uuid, text, uuid, boolean, text)
    TO service_role;

CREATE OR REPLACE FUNCTION public.decide_headcount_request(
    p_request_id uuid,
    p_decision text,
    p_actor_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_id uuid;
    v_invitation_id uuid;
    v_invitation_event_id uuid;
    v_invitation_status public.invitation_status_enum;
    v_event_organizer_id uuid;
    v_request public.headcount_increase_requests%ROWTYPE;
    v_updated_request public.headcount_increase_requests%ROWTYPE;
    v_old_max_party_size integer;
    v_new_max_party_size integer;
    v_audit_action text;
    v_reason text;
BEGIN
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

    SELECT e.organizer_id
    INTO v_event_organizer_id
    FROM public.events AS e
    WHERE e.id = v_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

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

    SELECT i.event_id, i.status, i.max_party_size
    INTO v_invitation_event_id, v_invitation_status, v_old_max_party_size
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

    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION 'HEADCOUNT_REQUEST_NOT_PENDING'
            USING ERRCODE = 'P0001';
    END IF;

    v_new_max_party_size := v_old_max_party_size;

    IF p_decision = 'approve' THEN
        IF v_invitation_status <> 'accepted'::public.invitation_status_enum THEN
            RAISE EXCEPTION 'INVITATION_NOT_ACCEPTED'
                USING ERRCODE = 'P0001';
        END IF;

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

    RETURN jsonb_build_object(
        'request', to_jsonb(v_updated_request),
        'old_max_party_size', v_old_max_party_size,
        'new_max_party_size', v_new_max_party_size
    );
END;
$$;

REVOKE ALL ON FUNCTION public.decide_headcount_request(uuid, text, uuid, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_headcount_request(uuid, text, uuid, text)
    TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Backfill any existing non-accepted invitations to release stale seats/QRs
-- ---------------------------------------------------------------------------

UPDATE public.attendees AS a
SET
    status = 'pending'::public.attendee_status_enum,
    reviewed_by = NULL,
    reviewed_at = NULL,
    review_reason = NULL,
    qr_token = NULL
FROM public.invitations AS i
WHERE a.invitation_id = i.id
  AND i.status <> 'accepted'::public.invitation_status_enum
  AND a.is_primary IS FALSE
  AND a.status = 'approved'::public.attendee_status_enum;

UPDATE public.attendees AS a
SET qr_token = NULL
FROM public.invitations AS i
WHERE a.invitation_id = i.id
  AND i.status <> 'accepted'::public.invitation_status_enum
  AND a.qr_token IS NOT NULL;

UPDATE public.invitations
SET party_size = 0
WHERE status <> 'accepted'::public.invitation_status_enum
  AND party_size <> 0;

COMMIT;
