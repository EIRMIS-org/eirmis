-- =============================================================================
-- Migration: 20261111000000_enforce_attendee_roster_limit.sql
-- Purpose:   Enforce Invitation.max_party_size against the total attendee
--            roster, independently of Invitation.party_size (the approved
--            attendee cache).
--
-- Source rule: README.md §6, Guest Directory & Invitations / Attendee Roster:
--   max_party_size is the ceiling on total heads in the invitation, including
--   the primary guest. Additional roster rows remain counted while pending or
--   rejected; a rejected attendee may be edited and resubmitted in the same
--   roster slot.
--
-- Concurrency: the attendee trigger locks the parent invitation row before
--   counting roster rows. Concurrent inserts/moves for the same invitation
--   therefore serialize on that row. The function is VOLATILE so its count
--   query obtains a fresh READ COMMITTED snapshot after any lock wait.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Guard attendee INSERTs and moves between invitations.
--
-- For INSERT, the row being inserted is not yet visible to a BEFORE trigger,
-- so reject when the current count is already >= max_party_size.
-- For UPDATE of invitation_id, the row is still counted under OLD.invitation_id
-- and is not yet counted under NEW.invitation_id, so the same comparison works.
-- Updates that do not change invitation_id do not consume another roster slot.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_attendee_roster_limit()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_max_party_size integer;
  v_existing_roster_count integer;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.invitation_id IS NOT DISTINCT FROM OLD.invitation_id THEN
    RETURN NEW;
  END IF;

  -- Lock both invitation rows in a stable order when moving a roster row.
  -- This serializes competing changes and reduces deadlock risk for opposite
  -- direction moves between two invitations.
  IF TG_OP = 'UPDATE' THEN
    PERFORM i.id
    FROM public.invitations AS i
    WHERE i.id IN (OLD.invitation_id, NEW.invitation_id)
    ORDER BY i.id
    FOR UPDATE;
  ELSE
    PERFORM i.id
    FROM public.invitations AS i
    WHERE i.id = NEW.invitation_id
    FOR UPDATE;
  END IF;

  SELECT i.max_party_size
    INTO v_max_party_size
  FROM public.invitations AS i
  WHERE i.id = NEW.invitation_id;

  -- Let the existing foreign-key constraint report a missing invitation.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
    INTO v_existing_roster_count
  FROM public.attendees AS a
  WHERE a.invitation_id = NEW.invitation_id;

  IF v_existing_roster_count >= v_max_party_size THEN
    RAISE EXCEPTION
      'Invitation % has reached its maximum roster size of %.',
      NEW.invitation_id,
      v_max_party_size
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'attendees_within_max_party_size',
        DETAIL = format(
          'The current roster has %s attendee row(s); this operation would exceed the invitation limit.',
          v_existing_roster_count + 1
        );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_attendee_enforce_roster_limit
  ON public.attendees;

CREATE TRIGGER trg_attendee_enforce_roster_limit
  BEFORE INSERT OR UPDATE OF invitation_id
  ON public.attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_attendee_roster_limit();

COMMENT ON FUNCTION public.fn_enforce_attendee_roster_limit() IS
  'Enforces invitations.max_party_size against the total attendee roster. Locks the parent invitation before counting so concurrent roster inserts/moves serialize.';

COMMENT ON TRIGGER trg_attendee_enforce_roster_limit ON public.attendees IS
  'Rejects attendee inserts or invitation moves that would exceed the invitation total-roster ceiling.';

-- ---------------------------------------------------------------------------
-- Prevent an invitation's roster ceiling from being reduced below its
-- current total roster. Raising the ceiling (for example, after an approved
-- HeadcountIncreaseRequest) remains allowed.
-- The UPDATE already holds a row lock on the invitation; attendee INSERT/move
-- operations acquire the same lock in fn_enforce_attendee_roster_limit().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_max_party_size_not_below_roster()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_roster_count integer;
BEGIN
  IF NEW.max_party_size >= OLD.max_party_size THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
    INTO v_roster_count
  FROM public.attendees AS a
  WHERE a.invitation_id = NEW.id;

  IF v_roster_count > NEW.max_party_size THEN
    RAISE EXCEPTION
      'Invitation % cannot reduce max_party_size to % because its roster already contains % attendee row(s).',
      NEW.id,
      NEW.max_party_size,
      v_roster_count
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'invitations_max_party_size_not_below_roster';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_invitation_enforce_max_party_size_not_below_roster
  ON public.invitations;

CREATE TRIGGER trg_invitation_enforce_max_party_size_not_below_roster
  BEFORE UPDATE OF max_party_size
  ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_max_party_size_not_below_roster();

COMMENT ON FUNCTION public.fn_enforce_max_party_size_not_below_roster() IS
  'Prevents reducing an invitation max_party_size below its existing total attendee roster.';

COMMENT ON TRIGGER trg_invitation_enforce_max_party_size_not_below_roster
  ON public.invitations IS
  'Keeps the invitation total-roster ceiling at or above the current attendee count.';
