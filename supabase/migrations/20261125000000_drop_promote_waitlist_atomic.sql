-- =============================================================================
-- Migration: 20261125000000_drop_promote_waitlist_atomic.sql
--
-- Purpose:
--   Remove the legacy public.promote_waitlist_atomic(uuid, integer, integer)
--   SECURITY DEFINER function.
--
--   Its prior migrations only revoked EXECUTE from PUBLIC, leaving Supabase's
--   default privileges intact for anon and authenticated roles, and it relied
--   on a caller-supplied free-seat count calculated outside any lock.
--
--   Waitlist promotion is now handled exclusively by
--   public.promote_waitlist_fifo(uuid, integer), which locks the event row,
--   computes approved headcount inside the transaction, enforces strict FIFO
--   order, and restricts EXECUTE to service_role.
-- =============================================================================

DROP FUNCTION IF EXISTS public.promote_waitlist_atomic(uuid, integer, integer);
