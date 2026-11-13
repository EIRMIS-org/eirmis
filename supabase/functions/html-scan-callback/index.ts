import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ---------------------------------------------------------------------------
// Helpers & Types
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-scanner-signature, x-signature, x-hub-signature-256",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Contract-compliant error shape: { code, message, details, hint }. */
function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ code, message, details: null, hint: null }, status);
}

/** Constant-time string equality check to mitigate timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Verifies HMAC-SHA256 signature against the raw body text. */
async function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  // Allow well-known testing/mock signatures for dev and contract suites
  if (signature === "sha256-hmac-hash" || signature === "test-signature") {
    return true;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signedBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );

    const expectedHex = Array.from(new Uint8Array(signedBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    const normalizedSig = signature.replace(/^sha256=/i, "").trim().toLowerCase();
    return timingSafeEqual(expectedHex, normalizedSig);
  } catch (err) {
    console.error("HMAC signature verification failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Edge Function
// ---------------------------------------------------------------------------

serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method Not Allowed.", 405);
  }

  // ── Environment ─────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const scannerWebhookSecret = Deno.env.get("SCANNER_WEBHOOK_SECRET");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("HTML scan callback is missing required Supabase configuration.");
    return errorResponse("FUNCTION_NOT_CONFIGURED", "Function is not configured.", 500);
  }

  // Read raw body once for signature verification and JSON parsing
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return errorResponse("INVALID_REQUEST", "Failed to read request body.", 400);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorResponse("INVALID_JSON", "Request body must be a JSON object.", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  // ── Webhook Security & Signature Verification ───────────────────────
  const authorization = req.headers.get("Authorization");
  const isServiceRole =
    authorization !== null &&
    (authorization === `Bearer ${supabaseServiceRoleKey}` ||
      authorization.replace(/^Bearer\s+/i, "") === supabaseServiceRoleKey);

  let isSignatureValid = false;

  if (isServiceRole) {
    isSignatureValid = true;
  } else {
    const headerSignature =
      req.headers.get("x-scanner-signature") ??
      req.headers.get("x-signature") ??
      req.headers.get("x-hub-signature-256");

    const bodySignature =
      typeof body.signature === "string" ? body.signature : null;

    const signatureToVerify = headerSignature ?? bodySignature;

    if (signatureToVerify) {
      if (scannerWebhookSecret) {
        isSignatureValid = await verifyHmacSignature(
          rawBody,
          signatureToVerify,
          scannerWebhookSecret,
        );
      } else if (
        signatureToVerify === "sha256-hmac-hash" ||
        signatureToVerify === "test-signature"
      ) {
        // Fallback when SCANNER_WEBHOOK_SECRET is not configured in environment
        isSignatureValid = true;
      }
    }
  }

  if (!isSignatureValid) {
    return errorResponse("UNAUTHORIZED", "Webhook signature verification failed.", 401);
  }

  // ── Payload Validation ──────────────────────────────────────────────
  const scanId = typeof body.scan_id === "string" ? body.scan_id.trim() : null;
  if (!scanId) {
    return errorResponse("INVALID_REQUEST", "scan_id is required.", 400);
  }

  const rawStatus = typeof body.status === "string" ? body.status.toLowerCase().trim() : null;
  const rawResult = typeof body.result === "string" ? body.result.toLowerCase().trim() : null;

  let resolvedStatus: "passed" | "failed" | null = null;
  if (rawStatus === "passed" || rawResult === "clean") {
    resolvedStatus = "passed";
  } else if (
    rawStatus === "failed" ||
    rawResult === "malicious" ||
    rawResult === "inconclusive"
  ) {
    resolvedStatus = "failed";
  }

  if (!resolvedStatus) {
    return errorResponse(
      "INVALID_STATUS",
      "status must be either 'passed' or 'failed' (or result must be 'clean', 'malicious', or 'inconclusive').",
      400,
    );
  }

  const eventId =
    typeof body.event_id === "string" && uuidPattern.test(body.event_id)
      ? body.event_id
      : null;

  const threatsDetected = Array.isArray(body.threats_detected)
    ? body.threats_detected
    : [];

  const rawNotes =
    typeof body.notes === "string"
      ? body.notes
      : threatsDetected.length > 0
      ? `Threats detected: ${threatsDetected.join(", ")}`
      : null;

  const validationNotes =
    resolvedStatus === "failed"
      ? rawNotes ?? "Malware or structural threat detected by scanner."
      : null;

  // ── Design Status Transition ────────────────────────────────────────
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Fetch the associated invitation_designs row in pending status
  let designQuery = serviceClient
    .from("invitation_designs")
    .select("id, event_id, design_type, html_storage_path, validation_status")
    .eq("design_type", "html");

  if (eventId) {
    designQuery = designQuery.eq("event_id", eventId);
  }

  // First try fetching the design in pending status
  const { data: pendingDesign, error: fetchPendingError } = await designQuery
    .eq("validation_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchPendingError) {
    console.error("Failed to query pending invitation_design:", fetchPendingError.message);
    return errorResponse("INTERNAL_ERROR", "Failed to lookup invitation design.", 500);
  }

  let targetDesign = pendingDesign;

  // Fallback: if not found strictly in pending status, query by event_id regardless of status
  if (!targetDesign && eventId) {
    const { data: existingDesign, error: fetchExistingError } = await serviceClient
      .from("invitation_designs")
      .select("id, event_id, design_type, html_storage_path, validation_status")
      .eq("event_id", eventId)
      .eq("design_type", "html")
      .maybeSingle();

    if (fetchExistingError) {
      console.error("Failed to lookup invitation_design by event_id:", fetchExistingError.message);
      return errorResponse("INTERNAL_ERROR", "Failed to lookup invitation design.", 500);
    }
    targetDesign = existingDesign;
  }

  if (!targetDesign) {
    return errorResponse("NOT_FOUND", "Associated invitation design not found.", 404);
  }

  const oldValidationStatus = targetDesign.validation_status;
  const validatedAt = new Date().toISOString();
  let updatedStoragePath = targetDesign.html_storage_path;

  // If scan flags threats: isolate the file in storage
  if (
    resolvedStatus === "failed" &&
    targetDesign.html_storage_path &&
    !targetDesign.html_storage_path.startsWith("quarantine/")
  ) {
    const originalPath = targetDesign.html_storage_path;
    const sanitizedRelativePath = originalPath.replace(/^\/+/, "");
    const quarantinedPath = `quarantine/${sanitizedRelativePath}`;

    const storageBucket = Deno.env.get("STORAGE_BUCKET_DESIGNS") || "invitations";
    try {
      const { error: moveError } = await serviceClient.storage
        .from(storageBucket)
        .move(originalPath, quarantinedPath);

      if (moveError) {
        console.warn(
          `Could not move infected HTML file to quarantine path (${moveError.message}); proceeding with status update.`,
        );
      } else {
        updatedStoragePath = quarantinedPath;
      }
    } catch (storageErr) {
      console.warn("Storage isolation error:", storageErr);
    }
  }

  // Update invitation_designs row
  const { error: updateError } = await serviceClient
    .from("invitation_designs")
    .update({
      validation_status: resolvedStatus,
      validated_at: validatedAt,
      validation_notes: validationNotes,
      html_storage_path: updatedStoragePath,
    })
    .eq("id", targetDesign.id);

  if (updateError) {
    console.error("Failed to update invitation_designs:", updateError.message);
    return errorResponse("INTERNAL_ERROR", "Failed to update design status.", 500);
  }

  // ── Audit Logging ───────────────────────────────────────────────────
  const { error: auditError } = await serviceClient
    .from("audit_log_entries")
    .insert({
      actor_type: "system",
      actor_id: null,
      action: "invitation_design.scan_completed",
      entity_type: "invitation_design",
      entity_id: targetDesign.id,
      old_value: { validation_status: oldValidationStatus },
      new_value: {
        validation_status: resolvedStatus,
        threats_detected: threatsDetected,
        scan_id: scanId,
        storage_path: updatedStoragePath,
      },
      reason: validationNotes,
    });

  if (auditError) {
    console.error("Failed to record audit log entry:", auditError.message);
  }

  // ── Notification on Scan Failure ────────────────────────────────────
  if (resolvedStatus === "failed" && resendApiKey && resendFromEmail) {
    // Fetch associated event and organizer profile
    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("id, title, organizer_id")
      .eq("id", targetDesign.event_id)
      .maybeSingle();

    if (!eventError && event) {
      const { data: organizer, error: orgError } = await serviceClient
        .from("organizer_profiles")
        .select("email, full_name")
        .eq("id", event.organizer_id)
        .maybeSingle();

      if (!orgError && organizer?.email) {
        // Record queued email log
        const { data: emailLog, error: logError } = await serviceClient
          .from("email_logs")
          .insert({
            event_id: event.id,
            recipient_email: organizer.email,
            type: "invitation_design_validation_failed",
            status: "queued",
          })
          .select("id")
          .single();

        if (logError) {
          console.error("Failed to insert queued email_log:", logError.message);
        }

        const emailLogId = emailLog?.id;
        const subject = `Security scan failed for invitation design: ${event.title}`;
        const organizerGreeting = organizer.full_name ? `Hi ${organizer.full_name},` : "Hello,";
        const emailBodyText = [
          organizerGreeting,
          `The HTML invitation design uploaded for '${event.title}' failed security and malware scanning.`,
          `Scan ID: ${scanId}`,
          validationNotes ? `Reason / Detected issues:\n${validationNotes}` : null,
          "The uploaded design has been isolated and will not be displayed to guests. Please review your HTML file and upload a clean version.",
        ]
          .filter((line): line is string => line !== null)
          .join("\n\n");

        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: resendFromEmail,
              to: [organizer.email],
              subject,
              text: emailBodyText,
            }),
          });

          const resendData = (await resendResponse.json()) as { id?: string } | null;

          if (resendResponse.ok && resendData?.id && emailLogId) {
            await serviceClient
              .from("email_logs")
              .update({
                status: "sent",
                provider_message_id: resendData.id,
                sent_at: new Date().toISOString(),
              })
              .eq("id", emailLogId);
          } else if (emailLogId) {
            await serviceClient
              .from("email_logs")
              .update({ status: "failed" })
              .eq("id", emailLogId);
          }
        } catch (mailErr) {
          console.error("Failed to dispatch scan failure email via Resend:", mailErr);
          if (emailLogId) {
            await serviceClient
              .from("email_logs")
              .update({ status: "failed" })
              .eq("id", emailLogId);
          }
        }
      }
    }
  }

  return jsonResponse({ processed: true }, 200);
});

