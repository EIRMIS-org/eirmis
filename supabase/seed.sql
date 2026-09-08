-- =============================================================================
-- M1-14 Synthetic Seed Data
-- =============================================================================

-- Create Auth Users
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'organizer@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'guest@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

-- Insert Organizer Profile
INSERT INTO public.organizer_profiles (id, email, full_name, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'organizer@example.com', 'Synthetic Organizer', 'active');

-- Insert Admin Profile
INSERT INTO public.admin_profiles (id, email, full_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'admin@example.com', 'Synthetic Admin');

-- Insert Guests
INSERT INTO public.guests (id, email, full_name, auth_user_id)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'guest@example.com', 'Synthetic Guest', '33333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444', 'staff@example.com', 'Synthetic Staff', '44444444-4444-4444-4444-444444444444');

-- Insert Event
INSERT INTO public.events (id, organizer_id, title, slug, description, starts_at, ends_at, capacity, rsvp_deadline, visibility_mode, status)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Annual Gala 2026',
  'annual-gala-2026',
  'A synthetic event for testing.',
  now() + interval '30 days',
  now() + interval '31 days',
  500,
  now() + interval '20 days',
  'open_registration',
  'published'
);

-- Insert Invitations (Guest)
INSERT INTO public.invitations (id, event_id, guest_id, status, max_party_size)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'waitlisted',
  2
);

-- Insert Attendees (for the guest)
INSERT INTO public.attendees (id, invitation_id, full_name, email, status)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '66666666-6666-6666-6666-666666666666',
  'Synthetic Guest',
  'guest@example.com',
  'pending'
);

-- Insert Check-in Assignment (Staff)
INSERT INTO public.checkin_assignments (id, event_id, staff_email, auth_user_id, invited_by, status)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '55555555-5555-5555-5555-555555555555',
  'staff@example.com',
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'active'
);
