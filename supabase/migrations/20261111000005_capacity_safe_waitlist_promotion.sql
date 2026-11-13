
-- =============================================================================
-- Migration: 20261111000005_capacity_safe_waitlist_promotion.sql
--
-- Purpose:
--   Make FIFO waitlist promotion respect event capacity and concurrency.
--
-- Function:
--   public.promote_waitlist_fifo(uuid, integer)
--
-- Responsibilities:
--   1. Validate the event ID and promotion limit.
--   2. Lock the event row before calculating capacity.
--   3. Calculate the current approved headcount.
--   4. Select waitlisted invitations in strict FIFO order.
--   5. Promote only invitations that fit within available capacity.
--   6. Create primary attendees through the existing invitation trigger.
--   7. Preserve pending additional attendees.
--   8. Return the same columns expected by waitlist-promote/index.ts.
--
-- Concurrency:
--   Uses the same event-row locking strategy as:
--     - public.decide_attendee()
--     - public.admit_public_rsvp()
--
-- FIFO:
--   Orders by waitlisted_at, created_at, and invitation ID.
--   Does not use SKIP LOCKED, because skipping an older locked invitation
--   could violate strict FIFO ordering.
--
-- Existing behavior preserved:
--   - Promoted invitations become accepted.
--   - Previously pending additional attendees remain pending.
--   - The primary-attendee trigger creates the primary attendee.
--   - waitlisted_at is preserved as queue-history information.
-- =============================================================================


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

    -- -----------------------------------------------------------------------
    -- 1. Validate input.
    -- -----------------------------------------------------------------------

    IF p_event_id IS NULL THEN
        RAISE EXCEPTION 'EVENT_ID_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF p_max_promotions IS NULL OR p_max_promotions < 1 THEN
        RAISE EXCEPTION 'MAX_PROMOTIONS_MUST_BE_POSITIVE'
            USING ERRCODE = '22023';
    END IF;


    -- -----------------------------------------------------------------------
    -- 2. Lock the event row.
    --
    -- This must happen before reading the current approved headcount.
    --
    -- Attendee approval and public RSVP admission use the same event lock.
    -- Consequently, capacity decisions for this event are serialized.
    -- -----------------------------------------------------------------------

    SELECT e.capacity
    INTO v_capacity
    FROM public.events AS e
    WHERE e.id = p_event_id
    FOR UPDATE OF e;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;


    -- -----------------------------------------------------------------------
    -- 3. Calculate the current approved attendee count.
    --
    -- party_size is maintained by:
    --   trg_attendee_update_invitation_counts
    --
    -- Pending additional attendees do not consume event capacity.
    -- -----------------------------------------------------------------------

    SELECT COALESCE(SUM(i.party_size), 0)::integer
    INTO v_current_headcount
    FROM public.invitations AS i
    WHERE i.event_id = p_event_id;


    -- -----------------------------------------------------------------------
    -- 4. Retrieve waitlisted invitations in strict FIFO order.
    --
    -- Tie-breakers:
    --   1. waitlisted_at
    --   2. created_at
    --   3. invitation ID
    --
    -- FOR UPDATE locks the selected invitations.
    --
    -- SKIP LOCKED is deliberately not used because it could skip an older
    -- invitation and promote a newer one first.
    --
    -- An invitation with an existing approved primary attendee consumes
    -- no additional capacity during promotion.
    -- -----------------------------------------------------------------------

    FOR v_candidate IN
        SELECT
            i.id AS invitation_id,
            i.event_id AS invitation_event_id,
            i.guest_id AS invitation_guest_id,

            EXISTS (
                SELECT 1
                FROM public.attendees AS a
                WHERE a.invitation_id = i.id
                  AND a.is_primary IS TRUE
                  AND a.status = 'approved'
            ) AS has_primary_attendee

        FROM public.invitations AS i

        WHERE i.event_id = p_event_id
          AND i.status = 'waitlisted'
          AND i.waitlisted_at IS NOT NULL

        ORDER BY
            i.waitlisted_at ASC,
            i.created_at ASC,
            i.id ASC

        LIMIT p_max_promotions

        FOR UPDATE OF i

    LOOP

        -- -------------------------------------------------------------------
        -- 5. Check whether the next FIFO invitation can be promoted.
        --
        -- Accepted invitations normally create one approved primary
        -- attendee through fn_create_primary_attendee_on_accept().
        --
        -- If a primary attendee already exists, promotion does not consume
        -- an additional capacity slot.
        --
        -- If no primary exists and capacity is exhausted, STOP.
        --
        -- Do not skip this invitation to promote a newer one.
        -- -------------------------------------------------------------------

        IF NOT v_candidate.has_primary_attendee
           AND v_current_headcount >= v_capacity
        THEN
            EXIT;
        END IF;


        -- -------------------------------------------------------------------
        -- 6. Promote the invitation.
        --
        -- The existing primary-attendee trigger fires after the status
        -- changes to accepted, creating the approved primary attendee
        -- when one does not already exist.
        --
        -- Existing responded_at is preserved. If it is NULL, set it now.
        --
        -- waitlisted_at is intentionally preserved.
        -- -------------------------------------------------------------------

        UPDATE public.invitations AS i

        SET
            status = 'accepted',
            responded_at = COALESCE(i.responded_at, v_now)

        WHERE i.id = v_candidate.invitation_id
          AND i.status = 'waitlisted'
          AND i.waitlisted_at IS NOT NULL;


        GET DIAGNOSTICS v_updated_count = ROW_COUNT;


        -- If another operation changed the invitation, do not return
        -- an invitation that this function did not actually promote.
        IF v_updated_count = 0 THEN
            CONTINUE;
        END IF;


        -- -------------------------------------------------------------------
        -- 7. Recalculate headcount after promotion.
        --
        -- The invitation UPDATE activates the existing primary-attendee
        -- trigger. The attendee insertion activates the invitation-count
        -- trigger. Therefore party_size has been updated before this query.
        --
        -- Recalculating also avoids assuming that exactly one additional
        -- approved attendee was created.
        -- -------------------------------------------------------------------

        SELECT COALESCE(SUM(i.party_size), 0)::integer

        INTO v_current_headcount

        FROM public.invitations AS i

        WHERE i.event_id = p_event_id;


        -- -------------------------------------------------------------------
        -- 8. Return the promoted invitation.
        --
        -- These output columns preserve the existing RPC response contract:
        --   id, event_id, guest_id
        --
        -- waitlist-promote/index.ts already consumes these fields.
        -- -------------------------------------------------------------------

        id := v_candidate.invitation_id;
        event_id := v_candidate.invitation_event_id;
        guest_id := v_candidate.invitation_guest_id;

        RETURN NEXT;

    END LOOP;


    RETURN;

END;
$$;


-- ---------------------------------------------------------------------------
-- 9. Function permissions.
--
-- The waitlist-promote Edge Function uses the service-role client.
-- Organizer authorization remains in the Edge Function.
--
-- Direct execution by anon/authenticated roles is not permitted.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.promote_waitlist_fifo(
    uuid, integer
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.promote_waitlist_fifo(
    uuid, integer
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.promote_waitlist_fifo(
    uuid, integer
) TO service_role;


-- ---------------------------------------------------------------------------
-- 10. Function documentation.
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.promote_waitlist_fifo(
    uuid, integer
) IS
'Capacity-safe strict FIFO waitlist promotion. Locks the event before calculating approved headcount, promotes only invitations that fit within available capacity, preserves pending additional attendees, and relies on the existing invitation acceptance trigger to create primary attendees. Restricted to service_role.';
