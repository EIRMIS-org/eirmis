import { paths } from '../contract/generated/schema.js';

const endpoints = [
  '/rest/v1/events',
  '/rest/v1/reminder_schedules',
  '/rest/v1/guests',
  '/rest/v1/invitations',
  '/rest/v1/attendees',
  '/rest/v1/headcount_increase_requests',
  '/rest/v1/invitation_designs',
  '/rest/v1/invitation_images',
  '/rest/v1/checkin_assignments',
  '/rest/v1/email_logs',
  '/rest/v1/audit_log_entries',
  '/rest/v1/organizer_profiles',
  '/rest/v1/admin_profiles'
];

async function checkAllEndpoints() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.");
    process.exit(1);
  }

  console.log(`Starting API Health Check against ${supabaseUrl}\n`);
  let hasErrors = false;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${supabaseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`❌ [FAIL] ${endpoint} -> HTTP ${response.status}: ${text}`);
        hasErrors = true;
      } else {
        // Just checking reachability, no need to print full payloads for all of them
        console.log(`✅ [OK]   ${endpoint}`);
      }
    } catch (error) {
      console.error(`❌ [FAIL] ${endpoint} -> Request failed:`, error);
      hasErrors = true;
    }
  }

  console.log('\n--- Summary ---');
  if (hasErrors) {
    console.log('⚠️ Some endpoints returned errors. Check your RLS policies or migrations.');
  } else {
    console.log('🚀 All endpoints are working perfectly!');
  }
}

checkAllEndpoints();
