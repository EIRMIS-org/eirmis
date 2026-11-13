
-- =============================================================================
-- Migration: 20261111000004_add_public_rsvp_admission.sql
--
-- Purpose:
--   Create a transactional public RSVP admission operation.
--
-- Function:
--   public.admit_public_rsvp(text, text, text)
--
-- Responsibilities:
--   1. Validate public registration input.
--   2. Find and lock the event.
--   3. Validate event visibility, publication status, and RSVP deadline.
--   4. Normalize and match guests by email.
--   5. Calculate the event's approved headcount.
--   6. Create an accepted or waitlisted invitation.
--   7. Set waitlisted_at for waitlisted invitations.
--   8. Return the final invitation row.
--
-- Concurrency:
--   Locks the event row before checking capacity.
--   Uses the same event-row locking convention as decide_attendee().
--
-- Existing trigger behavior:
--   Accepted invitation:
--     fn_create_primary_attendee_on_accept() creates the primary attendee.
--
--   Waitlisted invitation:
--     No primary attendee is created until promotion to accepted.
--
-- Security:
--   Callable only by service_role.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. CHECK FOR EXISTING CASE-INSENSITIVE DUPLICATE GUEST EMAILS
--
-- The existing guests.email UNIQUE constraint is case-sensitive.
-- This additional unique expression index makes email matching
-- case-insensitive.
--
-- Do not automatically merge existing guest records: they may have
-- invitations belonging to different events.
-- ---------------------------------------------------------------------------

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM public.guests
        GROUP BY lower(btrim(email))
        HAVING COUNT(*) > 1
    ) THEN

        RAISE EXCEPTION
            'Cannot create normalized guest email index: duplicate guest emails exist when compared case-insensitively.'
            USING
                ERRCODE = '23505',
                HINT = 'Reconcile existing duplicate guest records before applying this migration.';

    END IF;

END;
$$;


-- ---------------------------------------------------------------------------
-- 2. NORMALIZE EXISTING GUEST EMAILS
--
-- This follows the existing guests.email column documentation,
-- which specifies lowercase normalization on insertion.
-- ---------------------------------------------------------------------------

UPDATE public.guests
SET email = lower(btrim(email))
WHERE email IS DISTINCT FROM lower(btrim(email));


-- ---------------------------------------------------------------------------
-- 3. ENFORCE CASE-INSENSITIVE EMAIL UNIQUENESS
--
-- This prevents two guest rows from representing the same email
-- using different letter casing.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_email_normalized
ON public.guests ((lower(email)));


-- ---------------------------------------------------------------------------
-- 4. CREATE TRANSACTIONAL PUBLIC RSVP ADMISSION FUNCTION
-- ---------------------------------------------------------------------------

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

    -- -----------------------------------------------------------------------
    -- 4.1 VALIDATE INPUT
    -- -----------------------------------------------------------------------

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


    -- -----------------------------------------------------------------------
    -- 4.2 FIND AND LOCK THE EVENT
    --
    -- IMPORTANT:
    -- Acquire this lock BEFORE calculating approved headcount.
    --
    -- All operations capable of consuming event capacity must acquire
    -- this same event-row lock before making their capacity decision.
    -- -----------------------------------------------------------------------

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


    -- -----------------------------------------------------------------------
    -- 4.3 VALIDATE EVENT VISIBILITY
    --
    -- Public registration is only available for open_registration events.
    -- -----------------------------------------------------------------------

    IF v_event.visibility_mode <> 'open_registration' THEN

        RAISE EXCEPTION 'EVENT_NOT_OPEN_FOR_REGISTRATION'
            USING ERRCODE = 'P0001';

    END IF;


    -- -----------------------------------------------------------------------
    -- 4.4 VALIDATE EVENT PUBLICATION STATUS
    --
    -- Only published events accept guest actions.
    -- -----------------------------------------------------------------------

    IF v_event.status <> 'published' THEN

        RAISE EXCEPTION 'EVENT_NOT_ACCEPTING_RSVPS'
            USING ERRCODE = 'P0001';

    END IF;


    -- -----------------------------------------------------------------------
    -- 4.5 VALIDATE RSVP DEADLINE
    -- -----------------------------------------------------------------------

    IF v_event.rsvp_deadline <= v_now THEN

        RAISE EXCEPTION 'RSVP_DEADLINE_PASSED'
            USING ERRCODE = 'P0001';

    END IF;


    -- -----------------------------------------------------------------------
    -- 4.6 CALCULATE CURRENT EVENT HEADCOUNT
    --
    -- invitation.party_size is a trigger-maintained cache containing
    -- the number of approved attendees for each invitation.
    --
    -- Pending attendees do not consume capacity.
    -- Tentative and waitlisted invitations do not consume capacity
    -- unless they already have approved attendee rows.
    -- -----------------------------------------------------------------------

    SELECT COALESCE(SUM(i.party_size), 0)::integer
    INTO v_current_headcount
    FROM public.invitations AS i
    WHERE i.event_id = v_event.id;


    -- -----------------------------------------------------------------------
    -- 4.7 DETERMINE ADMISSION STATUS
    --
    -- Each new public RSVP initially contributes one primary attendee.
    --
    -- If at least one place remains:
    --   status = accepted
    --
    -- If capacity is exhausted:
    --   status = waitlisted
    -- -----------------------------------------------------------------------

    IF v_current_headcount < v_event.capacity THEN

        v_admission_status := 'accepted';

    ELSE

        v_admission_status := 'waitlisted';

    END IF;


    -- -----------------------------------------------------------------------
    -- 4.8 CREATE OR MATCH GUEST BY NORMALIZED EMAIL
    --
    -- The guest directory is shared across events.
    --
    -- Case-insensitive matching uses idx_guests_email_normalized.
    --
    -- Existing auth_user_id is preserved when a guest is matched.
    -- The submitted name updates the guest's directory name.
    -- -----------------------------------------------------------------------

    INSERT INTO public.guests (
        email,
        full_name
    )
    VALUES (
        v_email,
        v_full_name
    )
    ON CONFLICT ((lower(email)))
    DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name
    RETURNING id
    INTO v_guest_id;


    -- -----------------------------------------------------------------------
    -- 4.9 CREATE THE INVITATION TRANSACTIONALLY
    --
    -- max_party_size starts at one because the initial invitation
    -- covers the primary guest.
    --
    -- invited_by remains NULL for public registration.
    --
    -- responded_at records when the guest submitted their RSVP.
    --
    -- waitlisted_at is populated only when the invitation is waitlisted.
    -- -----------------------------------------------------------------------

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
            WHEN v_admission_status = 'waitlisted'
                THEN v_now
            ELSE NULL
        END
    )
    ON CONFLICT ON CONSTRAINT invitations_unique_per_event_guest
    DO NOTHING
    RETURNING id
    INTO v_invitation_id;


    -- -----------------------------------------------------------------------
    -- 4.10 HANDLE DUPLICATE REGISTRATION
    --
    -- One guest can have only one invitation per event.
    -- This also protects against concurrent duplicate submissions.
    -- -----------------------------------------------------------------------

    IF v_invitation_id IS NULL THEN

        RAISE EXCEPTION 'RSVP_ALREADY_EXISTS'
            USING ERRCODE = 'P0001';

    END IF;


    -- -----------------------------------------------------------------------
    -- 4.11 FETCH THE FINAL INVITATION ROW
    --
    -- This is important because the existing primary-attendee trigger
    -- runs AFTER invitation insertion when status = accepted.
    --
    -- The primary attendee insertion also triggers the invitation
    -- count-maintenance trigger, updating party_size.
    --
    -- Re-selecting ensures that the RPC returns the refreshed party_size.
    -- -----------------------------------------------------------------------

    SELECT i.*
    INTO v_invitation
    FROM public.invitations AS i
    WHERE i.id = v_invitation_id;

    IF NOT FOUND THEN

        RAISE EXCEPTION 'INVITATION_CREATION_FAILED'
            USING ERRCODE = 'P0001';

    END IF;


    -- -----------------------------------------------------------------------
    -- 4.12 RETURN THE CREATED INVITATION
    --
    -- The returned composite row matches the existing Invitation
    -- response model used by the register-public API.
    -- -----------------------------------------------------------------------

    RETURN v_invitation;

END;
$$;


-- ---------------------------------------------------------------------------
-- 5. FUNCTION PERMISSIONS
--
-- Public guests must call the register-public Edge Function.
-- The Edge Function uses the service-role client to invoke this RPC.
--
-- Do not expose this privileged function directly to anon/authenticated.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admit_public_rsvp(
    text, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.admit_public_rsvp(
    text, text, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admit_public_rsvp(
    text, text, text
) TO service_role;


-- ---------------------------------------------------------------------------
-- 6. FUNCTION DOCUMENTATION
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.admit_public_rsvp(
    text, text, text
) IS
'Transactional public RSVP admission. Locks the event before capacity calculation, creates or matches the guest by normalized email, and inserts an accepted or waitlisted invitation. Accepted invitations trigger primary attendee creation; waitlisted invitations do not. Restricted to service_role.';
