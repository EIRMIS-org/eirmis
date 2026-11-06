-- =============================================================================
-- Migration: 20261106000000_admin_rls_and_provisioning.sql
-- Purpose:   1. Add Admin SELECT policy on audit_log_entries so system administrators
--               can inspect global audit logs.
--            2. Update handle_new_user() trigger to provision admin_profiles when
--               role metadata indicates 'admin'.
-- =============================================================================

-- 1. Admin RLS policy on audit_log_entries
DROP POLICY IF EXISTS "audit_log_entries: admin reads all" ON public.audit_log_entries;
CREATE POLICY "audit_log_entries: admin reads all"
  ON public.audit_log_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

-- 2. Updated Auth Linkage Trigger to support Admin provisioning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text;
  v_email text;
  v_name text;
  v_role text;
BEGIN
  v_provider := NEW.raw_app_meta_data->>'provider';
  v_email := NEW.email;
  v_name := coalesce(NEW.raw_user_meta_data->>'full_name', split_part(v_email, '@', 1));
  v_role := coalesce(NEW.raw_user_meta_data->>'role', NEW.raw_app_meta_data->>'role');

  -- Admin provisioning via role metadata
  IF v_role = 'admin' THEN
    INSERT INTO public.admin_profiles (id, email, full_name)
    VALUES (NEW.id, v_email, v_name)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email;

  -- Google login defaults to Organizer self-registration (pending status)
  ELSIF v_provider = 'google' THEN
    INSERT INTO public.organizer_profiles (id, email, full_name, status)
    VALUES (NEW.id, v_email, v_name, 'pending')
    ON CONFLICT (id) DO NOTHING;
  
  -- Email magic-link login links Guest identity and Check-in Staff assignments
  ELSIF v_provider = 'email' THEN
    -- 1. Link Guest row, or create if not exists
    INSERT INTO public.guests (email, full_name, auth_user_id)
    VALUES (v_email, v_name, NEW.id)
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = NEW.id
    WHERE public.guests.auth_user_id IS NULL;

    -- 2. Link CheckInAssignment rows and activate them
    UPDATE public.checkin_assignments
    SET auth_user_id = NEW.id, status = 'active'
    WHERE staff_email = v_email AND status = 'invited';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is active on auth.users
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auth trigger to provision organizer/admin profiles and link guest/staff rows upon login.';

