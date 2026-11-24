import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      statusText: "Method Not Allowed",
      headers: { "Content-Type": "application/json" },
    });
  }

  // Atomically creates/matches a guest row, creates an accepted invitation,
  // and dispatches confirmation email with a magic-link.
  // Implementation will use Supabase service role key to bypass RLS for guest insertion
  // and create the invitation, then call Resend for the email.

  return new Response(
    JSON.stringify({ message: "Created" }),
    { 
      status: 201,
      statusText: "Created",
      headers: { "Content-Type": "application/json" } 
    }
  );
});
