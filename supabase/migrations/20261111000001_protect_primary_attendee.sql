
-- =============================================================================
-- Migration: 20261111000001_protect_primary_attendee.sql
--
-- Purpose:
--   Enforce primary attendee uniqueness and protect the primary attendee's
--   identity and RSVP-approved status after invitation acceptance.
--
-- Existing behavior preserved:
--   - Primary attendees are automatically created when invitations are
--     accepted.
--   - Primary attendees are automatically approved.
--   - QR token updates remain permitted.
--   - Check-in updates remain permitted.
--   - Deleting an invitation can still cascade-delete its attendees.
--
-- Source:
--   README.md §6 - Guest Directory & Invitations
--   README.md §6 - Attendee Roster & Approval
-- =============================================================================


-- =============================================================================
-- 1. VERIFY EXISTING DATA BEFORE CREATING THE UNIQUE INDEX
-- =============================================================================

-- Do not silently delete or modify existing duplicate primary attendee rows.
-- If duplicates exist, migration should stop so they can be reviewed.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.attendees
        WHERE is_primary IS TRUE
        GROUP BY invitation_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Cannot enforce primary attendee uniqueness: duplicate primary attendees already exist.'
            USING ERRCODE = '23505';
    END IF;
END;
$$;


-- =============================================================================
-- 2. GUARANTEE ONE PRIMARY ATTENDEE PER INVITATION
-- =============================================================================

CREATE UNIQUE INDEX idx_attendees_one_primary_per_invitation
    ON public.attendees (invitation_id)
    WHERE is_primary IS TRUE;

COMMENT ON INDEX public.idx_attendees_one_primary_per_invitation IS
    'Guarantees at most one primary attendee per invitation.';


-- =============================================================================
-- 3. ENSURE PRIMARY ATTENDEES ARE ALWAYS APPROVED
-- =============================================================================

ALTER TABLE public.attendees
    ADD CONSTRAINT attendees_primary_must_be_approved
    CHECK (
        NOT is_primary OR status = 'approved'
    );


-- =============================================================================
-- 4. PROTECT PRIMARY ATTENDEE IDENTITY AND STATUS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_protect_primary_attendee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN

    -- -------------------------------------------------------------------------
    -- DELETE protection
    -- -------------------------------------------------------------------------

    IF TG_OP = 'DELETE' THEN

        -- Direct deletion of a primary attendee is prohibited.
        --
        -- pg_trigger_depth() allows deletion initiated by a cascading
        -- invitation deletion, preserving the existing ON DELETE CASCADE
        -- relationship between invitations and attendees.

        IF OLD.is_primary IS TRUE
           AND pg_trigger_depth() = 1 THEN

            RAISE EXCEPTION
                'Primary attendee % cannot be deleted after invitation acceptance.',
                OLD.id
                USING
                    ERRCODE = '23514',
                    CONSTRAINT = 'attendees_primary_immutable';

        END IF;

        RETURN OLD;
    END IF;


    -- -------------------------------------------------------------------------
    -- UPDATE protection
    -- -------------------------------------------------------------------------

    IF OLD.is_primary IS TRUE THEN

        -- A primary attendee represents the original invited guest.
        -- Their identity and association must remain unchanged.

        IF NEW.invitation_id IS DISTINCT FROM OLD.invitation_id
           OR NEW.full_name IS DISTINCT FROM OLD.full_name
           OR NEW.email IS DISTINCT FROM OLD.email
           OR NEW.is_primary IS DISTINCT FROM TRUE
           OR NEW.status IS DISTINCT FROM 'approved'::public.attendee_status_enum
           OR NEW.is_walk_in IS DISTINCT FROM FALSE THEN

            RAISE EXCEPTION
                'Primary attendee % has immutable identity and approval fields.',
                OLD.id
                USING
                    ERRCODE = '23514',
                    CONSTRAINT = 'attendees_primary_immutable';

        END IF;

    END IF;

    -- Other operational fields remain mutable.
    --
    -- This intentionally allows:
    --   qr_token
    --   checked_in
    --   checked_in_at
    --   checked_in_by
    --
    -- This preserves QR issuance and event-day check-in functionality.

    RETURN NEW;

END;
$function$;


-- =============================================================================
-- 5. REGISTER THE PRIMARY ATTENDEE PROTECTION TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS trg_protect_primary_attendee
    ON public.attendees;

CREATE TRIGGER trg_protect_primary_attendee
    BEFORE UPDATE OR DELETE
    ON public.attendees
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_protect_primary_attendee();


-- =============================================================================
-- 6. DOCUMENT THE NEW DATABASE PROTECTIONS
-- =============================================================================

COMMENT ON FUNCTION public.fn_protect_primary_attendee() IS
    'Protects primary attendee identity, invitation association, primary designation, approved status, and deletion while permitting QR and check-in updates.';

COMMENT ON TRIGGER trg_protect_primary_attendee
    ON public.attendees IS
    'Prevents modification or direct deletion of primary attendee identity and approval fields. Allows operational check-in and QR updates.';

