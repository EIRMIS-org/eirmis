
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InvitationRecord = {
  id: string;
  event_id: string;
  guest_id: string;
  status: "accepted" | "waitlisted" | string;
  max_party_size: number;
  party_size: number;
  checked_in_count: number;
  responded_at: string | null;
  waitlisted_at: string | null;
  created_at: string;
  updated_at: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(value);
}

function isValidEmail(value: string): boolean {
  return value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function admissionErrorResponse(message: string, code?: string) {
  const details = `${message} ${code ?? ""}`;

  if (details.includes("RSVP_ALREADY_EXISTS")) {
    return jsonResponse(
      { error: "This guest has already registered for this event." },
      409,
    );
  }

  if (details.includes("EVENT_NOT_FOUND")) {
    return jsonResponse({ error: "Event not found." }, 404);
  }

  if (
    details.includes("EVENT_NOT_OPEN_FOR_REGISTRATION") ||
    details.includes("EVENT_NOT_ACCEPTING_RSVPS") ||
    details.includes("RSVP_DEADLINE_PASSED")
  ) {
    return jsonResponse(
      { error: "This event is not currently accepting public registrations." },
      409,
    );
  }

  if (
    details.includes("INVALID_EMAIL") ||
    details.includes("FULL_NAME_REQUIRED") ||
    code === "22023"
  ) {
    return jsonResponse({ error: "Invalid registration information." }, 400);
  }

  console.error("Public RSVP admission failed:", message, code);
  return jsonResponse({ error: "Failed to create the registration." }, 500);
}

Deno.serve(async (req) => {
  // --------------------------------------------------------------------------
  // 1. Handle CORS preflight.
  // --------------------------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  // --------------------------------------------------------------------------
  // 2. Read environment configuration.
  //
  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
  // RESEND_API_KEY and RESEND_FROM_EMAIL are configured as function secrets.
  // --------------------------------------------------------------------------

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !resendApiKey ||
    !resendFromEmail
  ) {
    console.error(
      "Public registration function is missing required configuration.",
    );

    return jsonResponse(
      { error: "Registration service is not configured." },
      500,
    );
  }

  // --------------------------------------------------------------------------
  // 3. Parse the request body.
  // --------------------------------------------------------------------------

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (!isRecord(body)) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const eventId = body.event_id;
  const rawEmail = body.email;
  const rawFullName = body.full_name;

  // Validate event ID.
  if (!isUuid(eventId)) {
    return jsonResponse(
      { error: "event_id must be a valid UUID." },
      400,
    );
  }

  // Validate email.
  if (
    typeof rawEmail !== "string" ||
    !isValidEmail(rawEmail.trim().toLowerCase())
  ) {
    return jsonResponse({ error: "A valid email address is required." }, 400);
  }

  // Validate full name.
  if (
    typeof rawFullName !== "string" ||
    rawFullName.trim().length === 0
  ) {
    return jsonResponse({ error: "A full name is required." }, 400);
  }

  const email = rawEmail.trim().toLowerCase();
  const fullName = rawFullName.trim();

  // --------------------------------------------------------------------------
  // 4. Create the service-role client.
  //
  // Public callers never receive the service-role key.
  // The Edge Function uses it to invoke privileged database operations.
  // --------------------------------------------------------------------------

  const serviceClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  // --------------------------------------------------------------------------
  // 5. Resolve event_id to the event slug.
  //
  // The OpenAPI request uses event_id.
  // The existing admit_public_rsvp() RPC currently accepts event_slug.
  //
  // The RPC still performs the authoritative event validation and
  // capacity check while holding the event-row lock.
  // --------------------------------------------------------------------------

  const { data: event, error: eventError } = await serviceClient
    .from("events")
    .select("id, slug, title")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Failed to retrieve registration event:", eventError.message);

    return jsonResponse(
      { error: "Failed to retrieve the requested event." },
      500,
    );
  }

  if (!event) {
    return jsonResponse({ error: "Event not found." }, 404);
  }

  // --------------------------------------------------------------------------
  // 6. Create the guest and invitation through the transactional RPC.
  //
  // The RPC handles:
  //   - Guest matching by normalized email.
  //   - Event-row locking.
  //   - Capacity calculation.
  //   - Accepted versus waitlisted admission.
  //   - Invitation creation.
  //   - waitlisted_at assignment.
  //   - Automatic primary attendee creation for accepted invitations.
  // --------------------------------------------------------------------------

  const { data: admissionData, error: admissionError } =
    await serviceClient.rpc("admit_public_rsvp", {
      p_event_slug: event.slug,
      p_email: email,
      p_full_name: fullName,
    });

  if (admissionError) {
    return admissionErrorResponse(
      admissionError.message,
      admissionError.code,
    );
  }

  // A function returning a composite invitation should return one object.
  // Handle an array defensively in case the PostgREST representation differs.
  const rawInvitation = Array.isArray(admissionData)
    ? admissionData[0]
    : admissionData;

  if (
    !isRecord(rawInvitation) ||
    typeof rawInvitation.id !== "string" ||
    typeof rawInvitation.guest_id !== "string" ||
    typeof rawInvitation.event_id !== "string" ||
    typeof rawInvitation.status !== "string"
  ) {
    console.error("admit_public_rsvp returned an invalid invitation result.");

    return jsonResponse(
      {
        error: "Registration was processed, but its invitation result was invalid.",
      },
      500,
    );
  }

  const invitation = rawInvitation as unknown as InvitationRecord;

  // --------------------------------------------------------------------------
  // 7. Generate a Supabase Auth magic link.
  //
  // generateLink() generates the link but does not send an email.
  // Resend will deliver the generated action_link in the next step.
  //
  // For a new email user, the Auth operation creates the Auth user.
  // The existing trg_on_auth_user_created trigger then matches the
  // already-created Guest row by email and links auth_user_id.
  //
  // Existing Auth users receive a magic link for their existing account.
  // No second Auth user is created.
  //
  // No redirectTo is supplied here, so Supabase uses the configured
  // Auth Site URL. The local config currently uses http://127.0.0.1:3000.
  // --------------------------------------------------------------------------

  let actionLink: string | null = null;
  let magicLinkErrorMessage: string | null = null;

  try {
    const { data: magicLinkData, error: magicLinkError } =
      await serviceClient.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (magicLinkError) {
      magicLinkErrorMessage = magicLinkError.message;
    } else {
      actionLink = magicLinkData?.properties?.action_link ?? null;

      if (!actionLink) {
        magicLinkErrorMessage =
          "Supabase Auth did not return a magic-link action URL.";
      }
    }
  } catch (error) {
    magicLinkErrorMessage = error instanceof Error
      ? error.message
      : "Unexpected magic-link generation failure.";
  }

  // --------------------------------------------------------------------------
  // 8. Record a failed confirmation attempt if link generation failed.
  // --------------------------------------------------------------------------

  if (!actionLink) {
    console.error(
      "Failed to generate registration magic link:",
      magicLinkErrorMessage,
    );

    const { error: logError } = await serviceClient
      .from("email_logs")
      .insert({
        event_id: invitation.event_id,
        invitation_id: invitation.id,
        recipient_email: email,
        type: "rsvp_confirmation",
        status: "failed",
      });

    if (logError) {
      console.error(
        "Failed to record magic-link generation failure:",
        logError.message,
      );
    }

    return jsonResponse(
      {
        error:
          "Registration was created, but its confirmation link could not be generated.",
        registration_created: true,
        invitation,
      },
      502,
    );
  }

  // --------------------------------------------------------------------------
  // 9. Prepare the registration confirmation email.
  //
  // Accepted and waitlisted invitations receive different explanations.
  // Both emails contain the same kind of secure magic-link.
  // --------------------------------------------------------------------------

  const isWaitlisted = invitation.status === "waitlisted";

  const statusMessage = isWaitlisted
    ? "Your registration has been received, but the event is currently full. You have been placed on the waitlist. You will be notified if a place becomes available."
    : "Your registration has been accepted. Your place at the event is confirmed.";

  const emailSubject = isWaitlisted
    ? `EIRMIS registration received - ${event.title}`
    : `EIRMIS registration confirmation - ${event.title}`;

  const emailText = [
    `Hello ${fullName},`,
    "",
    `Thank you for registering for ${event.title}.`,
    "",
    statusMessage,
    "",
    "Use the secure link below to sign in to your EIRMIS guest portal and manage your registration:",
    "",
    actionLink,
    "",
    "This is a one-time sign-in link. Do not share it with anyone.",
    "",
    "If you did not submit this registration, you can ignore this email.",
    "",
    "Thank you,",
    "EIRMIS Team",
  ].join("\n");

  // --------------------------------------------------------------------------
  // 10. Send the email through Resend.
  // --------------------------------------------------------------------------

  let providerMessageId: string | null = null;
  let resendErrorMessage: string | null = null;

  try {
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [email],
          subject: emailSubject,
          text: emailText,
        }),
      },
    );

    const responseText = await resendResponse.text();

    let resendData: { id?: string; message?: string } = {};

    try {
      resendData = JSON.parse(responseText);
    } catch {
      resendData = {};
    }

    if (
      !resendResponse.ok ||
      typeof resendData.id !== "string"
    ) {
      resendErrorMessage =
        resendData.message ??
        `Resend request failed with HTTP ${resendResponse.status}.`;
    } else {
      providerMessageId = resendData.id;
    }
  } catch (error) {
    resendErrorMessage = error instanceof Error
      ? error.message
      : "Unexpected email delivery error.";
  }

  // --------------------------------------------------------------------------
  // 11. Record failed Resend delivery.
  //
  // The invitation was already created by the database RPC.
  // Do not attempt to delete or roll back that registration here.
  // --------------------------------------------------------------------------

  if (!providerMessageId) {
    console.error(
      "Registration email delivery failed:",
      resendErrorMessage,
    );

    const { error: logError } = await serviceClient
      .from("email_logs")
      .insert({
        event_id: invitation.event_id,
        invitation_id: invitation.id,
        recipient_email: email,
        type: "rsvp_confirmation",
        status: "failed",
      });

    if (logError) {
      console.error(
        "Failed to record registration email failure:",
        logError.message,
      );
    }

    return jsonResponse(
      {
        error:
          "Registration was created, but the confirmation email could not be sent.",
        registration_created: true,
        invitation,
      },
      502,
    );
  }

  // --------------------------------------------------------------------------
  // 12. Record successful email delivery.
  //
  // provider_message_id stores the message ID returned by Resend.
  // sent_at records when Resend accepted the email request.
  // --------------------------------------------------------------------------

  const { error: emailLogError } = await serviceClient
    .from("email_logs")
    .insert({
      event_id: invitation.event_id,
      invitation_id: invitation.id,
      recipient_email: email,
      type: "rsvp_confirmation",
      status: "sent",
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
    });

  if (emailLogError) {
    console.error(
      "Registration email was sent, but email logging failed:",
      emailLogError.message,
    );

    return jsonResponse(
      {
        error:
          "Registration and confirmation email succeeded, but email history could not be recorded.",
        registration_created: true,
        email_sent: true,
        invitation,
      },
      500,
    );
  }

  // --------------------------------------------------------------------------
  // 13. Return the created invitation.
  //
  // The 201 response follows the existing OpenAPI Invitation response.
  // The invitation status tells the client whether registration was
  // accepted or waitlisted.
  // --------------------------------------------------------------------------

  return jsonResponse(invitation, 201);
});
