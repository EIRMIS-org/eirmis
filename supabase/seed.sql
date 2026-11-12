-- =============================================================================
-- Synthetic Seed Data for Local Development & Testing
-- =============================================================================

-- 1. Create Auth Users
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'organizer@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"organizer","full_name":"Synthetic Organizer"}', now(), now(), '', '', '', ''),
  ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'organizer2@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"organizer","full_name":"Synthetic Organizer"}', now(), now(), '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"],"role":"admin"}', '{"role":"admin","full_name":"Synthetic Admin"}', now(), now(), '', '', '', ''),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'guest@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"guest","full_name":"Synthetic Guest"}', now(), now(), '', '', '', ''),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff@example.com', crypt('password123', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"staff","full_name":"Synthetic Staff"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Link Auth Identities for password login
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT 
  id, id, id::text, format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb, 'email', now(), now(), now()
FROM auth.users
WHERE email IN (
  'organizer@example.com',
  'organizer2@example.com',
  'admin@example.com',
  'guest@example.com',
  'staff@example.com'
)
ON CONFLICT DO NOTHING;

-- 2. Profiles
INSERT INTO public.organizer_profiles (id, email, full_name, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'organizer@example.com', 'Synthetic Organizer', 'active'),
  ('11111111-1111-1111-1111-111111111112', 'organizer2@example.com', 'Synthetic Organizer', 'pending')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  status = EXCLUDED.status;

INSERT INTO public.admin_profiles (id, email, full_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'admin@example.com', 'Synthetic Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.guests (id, email, full_name, auth_user_id)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'guest@example.com', 'Synthetic Guest', '33333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444', 'staff@example.com', 'Synthetic Staff', '44444444-4444-4444-4444-444444444444'),
  ('33333333-3333-3333-3333-333333333334', 'guest2@example.com', 'Jane Doe', NULL),
  ('33333333-3333-3333-3333-333333333335', 'guest3@test.com', 'John Doe', NULL)
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  full_name = EXCLUDED.full_name,
  auth_user_id = EXCLUDED.auth_user_id;

-- 3. Events (covering draft, published open_registration, published invite_only, closed, archived)
INSERT INTO public.events (
  id, organizer_id, title, slug, description, starts_at, ends_at, capacity, rsvp_deadline, visibility_mode, status
) VALUES 
  (
    '55555555-5555-5555-5555-555555555551',
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
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '11111111-1111-1111-1111-111111111111',
    'Synthetic Event',
    'synthetic-draft-event',
    'A synthetic event for testing draft status.',
    now() + interval '40 days',
    now() + interval '41 days',
    100,
    now() + interval '35 days',
    'invite_only',
    'draft'
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '11111111-1111-1111-1111-111111111111',
    'Synthetic Event 2026',
    'synthetic-invite-event-2026',
    'A synthetic event for testing invite only mode.',
    now() + interval '15 days',
    now() + interval '16 days',
    50,
    now() + interval '10 days',
    'invite_only',
    'published'
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    '11111111-1111-1111-1111-111111111111',
    'Annual Gala',
    'annual-gala-closed',
    'A synthetic event for testing closed state.',
    now() + interval '5 days',
    now() + interval '6 days',
    200,
    now() - interval '1 day',
    'invite_only',
    'closed'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'Test Event 2026',
    'test-event-archived-2026',
    'A synthetic event for testing archived state.',
    now() - interval '60 days',
    now() - interval '59 days',
    150,
    now() - interval '70 days',
    'open_registration',
    'archived'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Reminder Schedules
INSERT INTO public.reminder_schedules (id, event_id, days_before_event, send_time_of_day, enabled)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '55555555-5555-5555-5555-555555555551', 7, '09:00:00', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '55555555-5555-5555-5555-555555555551', 1, '09:00:00', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '55555555-5555-5555-5555-555555555553', 3, '10:00:00', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Invitations (covering pending, accepted, declined, tentative, waitlisted)
INSERT INTO public.invitations (id, event_id, guest_id, status, max_party_size)
VALUES
  -- Waitlisted on Event 1
  ('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333333', 'waitlisted', 2),
  -- Accepted on Event 1
  ('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333334', 'accepted', 4),
  -- Pending on Event 3
  ('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333335', 'pending', 2),
  -- Declined on Event 3
  ('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 'declined', 1),
  -- Tentative on Event 3
  ('66666666-6666-6666-6666-666666666665', '55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333333', 'tentative', 2)
ON CONFLICT (id) DO NOTHING;

-- 6. Attendees (covering primary, approved, pending, rejected, walk-in, checked-in, child/no-email)
INSERT INTO public.attendees (
  id, invitation_id, full_name, email, is_primary, is_walk_in, status, qr_token, checked_in, checked_in_at, checked_in_by
) VALUES
  -- Waitlisted guest pending primary
  (
    '77777777-7777-7777-7777-777777777771',
    '66666666-6666-6666-6666-666666666661',
    'Synthetic Guest',
    'guest@example.com',
    true,
    false,
    'pending',
    NULL,
    false,
    NULL,
    NULL
  ),
  -- Accepted invitation primary attendee (approved, issued qr_token, checked in)
  (
    '77777777-7777-7777-7777-777777777772',
    '66666666-6666-6666-6666-666666666662',
    'Jane Doe',
    'guest2@example.com',
    true,
    false,
    'approved',
    'token-primary-001',
    true,
    now() - interval '1 hour',
    '44444444-4444-4444-4444-444444444444'
  ),
  -- Secondary approved attendee
  (
    '77777777-7777-7777-7777-777777777773',
    '66666666-6666-6666-6666-666666666662',
    'John Doe',
    'guest3@test.com',
    false,
    false,
    'approved',
    'token-secondary-002',
    false,
    NULL,
    NULL
  ),
  -- Secondary pending attendee (child / no email)
  (
    '77777777-7777-7777-7777-777777777774',
    '66666666-6666-6666-6666-666666666662',
    'Jane Doe',
    NULL,
    false,
    false,
    'pending',
    NULL,
    false,
    NULL,
    NULL
  ),
  -- Secondary rejected attendee
  (
    '77777777-7777-7777-7777-777777777775',
    '66666666-6666-6666-6666-666666666662',
    'Test Guest',
    'guest@test.com',
    false,
    false,
    'rejected',
    NULL,
    false,
    NULL,
    NULL
  ),
  -- Walk-in attendee (approved directly)
  (
    '77777777-7777-7777-7777-777777777776',
    '66666666-6666-6666-6666-666666666662',
    'Synthetic Guest',
    'guest@test.com',
    false,
    true,
    'approved',
    'token-walkin-003',
    false,
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Headcount Increase Requests (covering pending, approved, rejected)
INSERT INTO public.headcount_increase_requests (
  id, invitation_id, requested_additional_heads, note, status, reviewed_by, reviewed_at, review_reason
) VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '66666666-6666-6666-6666-666666666662',
    2,
    'synthetic request note',
    'pending',
    NULL,
    NULL,
    NULL
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '66666666-6666-6666-6666-666666666663',
    1,
    'synthetic request note',
    'approved',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '2 days',
    'synthetic review reason'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    '66666666-6666-6666-6666-666666666665',
    3,
    'synthetic request note',
    'rejected',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '1 day',
    'synthetic review reason'
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Check-in Assignments (covering active, invited, revoked)
INSERT INTO public.checkin_assignments (id, event_id, staff_email, auth_user_id, invited_by, status)
VALUES
  (
    '88888888-8888-8888-8888-888888888881',
    '55555555-5555-5555-5555-555555555551',
    'staff@example.com',
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'active'
  ),
  (
    '88888888-8888-8888-8888-888888888882',
    '55555555-5555-5555-5555-555555555553',
    'staff@test.com',
    NULL,
    '11111111-1111-1111-1111-111111111111',
    'invited'
  ),
  (
    '88888888-8888-8888-8888-888888888883',
    '55555555-5555-5555-5555-555555555551',
    'staff2@test.com',
    NULL,
    '11111111-1111-1111-1111-111111111111',
    'revoked'
  )
ON CONFLICT (id) DO NOTHING;

-- 9. Invitation Designs & Images
INSERT INTO public.invitation_designs (id, event_id, design_type, validation_status, html_storage_path)
VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', '55555555-5555-5555-5555-555555555551', 'images', 'passed', NULL),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', '55555555-5555-5555-5555-555555555553', 'html', 'passed', 'designs/synthetic.html')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invitation_images (id, event_id, storage_path, sort_order)
VALUES
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', '55555555-5555-5555-5555-555555555551', 'gallery/gala-1.png', 0),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', '55555555-5555-5555-5555-555555555551', 'gallery/gala-2.png', 1)
ON CONFLICT (id) DO NOTHING;

-- 10. Email Logs
INSERT INTO public.email_logs (id, event_id, invitation_id, recipient_email, type, status, sent_at)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'guest2@example.com', 'rsvp_confirmation', 'sent', now() - interval '2 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'guest@example.com', 'waitlist_promoted', 'queued', NULL),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'guest@example.com', 'invitation_nudge', 'failed', NULL)
ON CONFLICT (id) DO NOTHING;

-- 11. Audit Log Entries
INSERT INTO public.audit_log_entries (id, actor_type, actor_id, action, entity_type, entity_id, old_value, new_value, reason)
VALUES
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff1',
    'system',
    NULL,
    'organizer.verified',
    'organizer_profile',
    '11111111-1111-1111-1111-111111111111',
    '{"status":"pending"}',
    '{"status":"active"}',
    'synthetic verification'
  ),
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff2',
    'organizer',
    '11111111-1111-1111-1111-111111111111',
    'attendee.approved',
    'attendee',
    '77777777-7777-7777-7777-777777777773',
    '{"status":"pending"}',
    '{"status":"approved"}',
    'synthetic approval'
  ),
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff3',
    'check_in_staff',
    '88888888-8888-8888-8888-888888888881',
    'checkin.attendee_scanned',
    'attendee',
    '77777777-7777-7777-7777-777777777772',
    '{"checked_in":false}',
    '{"checked_in":true}',
    'synthetic checkin'
  )
ON CONFLICT (id) DO NOTHING;
