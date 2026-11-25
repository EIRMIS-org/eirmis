// ---------------------------------------------------------------------------
// Helpers & Types
// ---------------------------------------------------------------------------

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-scanner-signature, x-signature, x-hub-signature-256",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InvitationDesignRow {
  id: string;
  event_id: string;
  design_type: string;
  html_storage_path: string | null;
  validation_status: string;
}

export interface ScanCallbackAuditEntry {
  actor_type: "system";
  actor_id: null;
  action: "invitation_design.scan_completed";
  entity_type: "invitation_design";
  entity_id: string;
  old_value: { validation_status: string };
  new_value: {
    validation_status: "passed" | "failed";
    threats_detected: unknown[];
    scan_id: string;
    storage_path: string | null;
  };
  reason: string | null;
}

export interface ScanCallbackDependencies {
  supabaseUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  scannerWebhookSecret: string | undefined;
  now?: () => Date;
  findPendingDesign: (eventId: string | null) => Promise<{
    data: InvitationDesignRow | null;
    error: { message: string } | null;
  }>;
  findDesignByEventId: (eventId: string) => Promise<{
    data: InvitationDesignRow | null;
    error: { message: string } | null;
  }>;
  moveToQuarantine: (
    originalPath: string,
    quarantinedPath: string,
  ) => Promise<{ error: { message: string } | null }>;
  updateDesign: (
    id: string,
    update: {
      validation_status: "passed" | "failed";
      validated_at: string;
      validation_notes: string | null;
      html_storage_path: string | null;
    },
  ) => Promise<{ error: { message: string } | null }>;
  insertAuditLog: (
    entry: ScanCallbackAuditEntry,
  ) => Promise<{ error: { message: string } | null }>;
  notifyScanFailure?: (params: {
    eventId: string;
    scanId: string;
    validationNotes: string | null;
  }) => Promise<void>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Contract-compliant error shape: { code, message, details, hint }. */
function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ code, message, details: null, hint: null }, status);
}

/** Constant-time string equality check to mitigate timing attacks. */
export function timingSafeEqual(a: string, b: string): boolean {
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
export async function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
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
// Request Handler
// ---------------------------------------------------------------------------

export function createScanCallbackHandler(
  deps: ScanCallbackDependencies,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // ── CORS preflight ──────────────────────────────────────────────────
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method Not Allowed.", 405);
    }

    // ── Environment ─────────────────────────────────────────────────────
    const supabaseUrl = deps.supabaseUrl?.trim() ?? "";
    const supabaseServiceRoleKey = deps.supabaseServiceRoleKey?.trim() ?? "";
    const scannerWebhookSecret = deps.scannerWebhookSecret?.trim() ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey || !scannerWebhookSecret) {
      console.error(
        "HTML scan callback is missing required configuration (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SCANNER_WEBHOOK_SECRET).",
      );
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
    const bearerToken = authorization?.replace(/^Bearer\s+/i, "") ?? null;
    const isServiceRole =
      bearerToken !== null &&
      timingSafeEqual(bearerToken, supabaseServiceRoleKey);

    let isSignatureValid = false;

    if (isServiceRole) {
      isSignatureValid = true;
    } else {
      const headerSignature =
        req.headers.get("x-scanner-signature") ??
        req.headers.get("x-signature") ??
        req.headers.get("x-hub-signature-256");

      if (headerSignature) {
        isSignatureValid = await verifyHmacSignature(
          rawBody,
          headerSignature,
          scannerWebhookSecret,
        );
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

    const rawStatus =
      typeof body.status === "string" ? body.status.toLowerCase().trim() : null;
    const rawResult =
      typeof body.result === "string" ? body.result.toLowerCase().trim() : null;

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
    const { data: pendingDesign, error: fetchPendingError } =
      await deps.findPendingDesign(eventId);

    if (fetchPendingError) {
      console.error(
        "Failed to query pending invitation_design:",
        fetchPendingError.message,
      );
      return errorResponse("INTERNAL_ERROR", "Failed to lookup invitation design.", 500);
    }

    let targetDesign = pendingDesign;

    // Fallback: if not found strictly in pending status, query by event_id regardless of status
    if (!targetDesign && eventId) {
      const { data: existingDesign, error: fetchExistingError } =
        await deps.findDesignByEventId(eventId);

      if (fetchExistingError) {
        console.error(
          "Failed to lookup invitation_design by event_id:",
          fetchExistingError.message,
        );
        return errorResponse("INTERNAL_ERROR", "Failed to lookup invitation design.", 500);
      }
      targetDesign = existingDesign;
    }

    if (!targetDesign) {
      return errorResponse("NOT_FOUND", "Associated invitation design not found.", 404);
    }

    const oldValidationStatus = targetDesign.validation_status;
    const validatedAt = (deps.now ? deps.now() : new Date()).toISOString();
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

      try {
        const { error: moveError } = await deps.moveToQuarantine(
          originalPath,
          quarantinedPath,
        );

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
    const { error: updateError } = await deps.updateDesign(targetDesign.id, {
      validation_status: resolvedStatus,
      validated_at: validatedAt,
      validation_notes: validationNotes,
      html_storage_path: updatedStoragePath,
    });

    if (updateError) {
      console.error("Failed to update invitation_designs:", updateError.message);
      return errorResponse("INTERNAL_ERROR", "Failed to update design status.", 500);
    }

    // ── Audit Logging ───────────────────────────────────────────────────
    const { error: auditError } = await deps.insertAuditLog({
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
    if (resolvedStatus === "failed" && deps.notifyScanFailure) {
      await deps.notifyScanFailure({
        eventId: targetDesign.event_id,
        scanId,
        validationNotes,
      });
    }

    return jsonResponse({ processed: true }, 200);
  };
}
