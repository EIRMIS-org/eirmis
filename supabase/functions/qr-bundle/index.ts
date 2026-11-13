import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import QRCode from "npm:qrcode@1.5.4";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface QrTokenPayload {
  attendee_id: string;
  event_id: string;
  invitation_id: string;
  issued_at: string;
}

interface AttendeeRow {
  id: string;
  invitation_id: string;
  full_name: string;
  email: string | null;
  is_primary: boolean;
  status: string;
  qr_token: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

interface InvitationRow {
  id: string;
  event_id: string;
  guest_id: string;
  status: string;
}

interface EventRow {
  id: string;
  organizer_id: string;
  title: string;
  starts_at: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
}

interface GuestRow {
  id: string;
  email: string;
  full_name: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details: string | null = null,
  hint: string | null = null,
) {
  return jsonResponse(
    { code, message, details, hint, error: message },
    status,
  );
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }

  return btoa(binary);
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeToString(value: string): string {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signQrToken(
  payload: QrTokenPayload,
  secret: string,
): Promise<string> {
  const headerB64 = base64UrlEncodeString(JSON.stringify({ alg: "HS256" }));
  const payloadB64 = base64UrlEncodeString(
    JSON.stringify({
      attendee_id: payload.attendee_id,
      event_id: payload.event_id,
      invitation_id: payload.invitation_id,
      issued_at: payload.issued_at,
    }),
  );
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  const signatureB64 = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));
  return `${signingInput}.${signatureB64}`;
}

export async function verifyAndDecodeQrToken(
  token: string | null | undefined,
  expected: { attendee_id: string; event_id: string; invitation_id: string },
  secret: string,
): Promise<QrTokenPayload | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) {
    return null;
  }

  try {
    const signingInput = `${headerB64}.${payloadB64}`;
    const key = await importHmacKey(secret);
    const expectedSigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signingInput),
    );
    const expectedSigB64 = base64UrlEncodeBytes(
      new Uint8Array(expectedSigBuffer),
    );

    if (expectedSigB64.length !== signatureB64.length) {
      return null;
    }
    let mismatch = 0;
    for (let i = 0; i < expectedSigB64.length; i++) {
      mismatch |= expectedSigB64.charCodeAt(i) ^ signatureB64.charCodeAt(i);
    }
    if (mismatch !== 0) {
      return null;
    }

    const decodedJson = JSON.parse(base64UrlDecodeToString(payloadB64));
    if (
      decodedJson === null ||
      typeof decodedJson !== "object" ||
      decodedJson.attendee_id !== expected.attendee_id ||
      decodedJson.event_id !== expected.event_id ||
      decodedJson.invitation_id !== expected.invitation_id ||
      typeof decodedJson.issued_at !== "string" ||
      !decodedJson.issued_at
    ) {
      return null;
    }

    return {
      attendee_id: decodedJson.attendee_id,
      event_id: decodedJson.event_id,
      invitation_id: decodedJson.invitation_id,
      issued_at: decodedJson.issued_at,
    };
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function renderAttendeeQrAssets(
  attendees: {
    id: string;
    full_name: string;
    is_primary?: boolean;
    qr_token: string;
  }[],
  eventTitle?: string,
): Promise<{
  pdfBytes: Uint8Array;
  passesWithPngBase64: {
    id: string;
    full_name: string;
    is_primary: boolean;
    qr_token: string;
    pngBase64: string;
  }[];
}> {
  const pdf = await PDFDocument.create();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const passesWithPngBase64: {
    id: string;
    full_name: string;
    is_primary: boolean;
    qr_token: string;
    pngBase64: string;
  }[] = [];

  for (const attendee of attendees) {
    if (!attendee.qr_token) {
      throw new Error(
        `Approved attendee "${attendee.full_name}" has no QR token.`,
      );
    }

    const pngBuffer = await QRCode.toBuffer(attendee.qr_token, {
      type: "png",
      width: 300,
      margin: 2,
    });
    const pngBytes = new Uint8Array(pngBuffer);
    const pngBase64 = bytesToBase64(pngBytes);

    passesWithPngBase64.push({
      id: attendee.id,
      full_name: attendee.full_name,
      is_primary: Boolean(attendee.is_primary),
      qr_token: attendee.qr_token,
      pngBase64,
    });

    const qrImage = await pdf.embedPng(pngBytes);
    const page = pdf.addPage([612, 792]);
    const qrSize = 300;

    if (eventTitle) {
      page.drawText(eventTitle, {
        x: 48,
        y: page.getHeight() - 56,
        size: 14,
        font: fontRegular,
        color: rgb(0.35, 0.38, 0.45),
      });
    }

    page.drawText(attendee.full_name, {
      x: 48,
      y: page.getHeight() - 88,
      size: 22,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.15),
    });

    page.drawText(
      attendee.is_primary ? "Primary Guest Pass" : "Party Attendee Pass",
      {
        x: 48,
        y: page.getHeight() - 112,
        size: 12,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.52),
      },
    );

    page.drawImage(qrImage, {
      x: (page.getWidth() - qrSize) / 2,
      y: (page.getHeight() - qrSize) / 2 - 20,
      width: qrSize,
      height: qrSize,
    });

    page.drawText(
      "Present this QR code at the event entrance for check-in.",
      {
        x: 48,
        y: 72,
        size: 11,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.52),
      },
    );
  }

  return {
    pdfBytes: new Uint8Array(await pdf.save()),
    passesWithPngBase64,
  };
}

export function buildQrBundleEmailHtml(params: {
  guestName: string;
  eventTitle: string;
  eventStartsAt: string | null;
  eventLocation: string | null;
  passes: {
    id: string;
    full_name: string;
    is_primary: boolean;
    qr_token: string;
    pngBase64: string;
  }[];
}): string {
  const { guestName, eventTitle, eventStartsAt, eventLocation, passes } =
    params;

  const formattedDate = eventStartsAt
    ? new Date(eventStartsAt).toUTCString()
    : null;

  const passCardsHtml = passes
    .map(
      (pass) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; text-align: center; background-color: #ffffff;">
        <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600;">
          ${pass.is_primary ? "Primary Guest" : "Party Attendee"}
        </p>
        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">
          ${escapeHtml(pass.full_name)}
        </h3>
        <img
          src="data:image/png;base64,${pass.pngBase64}"
          alt="QR Pass for ${escapeHtml(pass.full_name)}"
          width="220"
          height="220"
          style="display: block; margin: 0 auto 12px auto; max-width: 220px; height: auto; border: 1px solid #f1f5f9; border-radius: 8px;"
        />
        <p style="margin: 0; font-size: 11px; color: #94a3b8; word-break: break-all; font-family: monospace;">
          Pass ID: ${escapeHtml(pass.id)}
        </p>
      </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your QR Code Passes — ${escapeHtml(eventTitle)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px;">
    <h1 style="margin: 0 0 12px 0; font-size: 24px; color: #0f172a;">
      Your Event QR Code Passes
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
      Hello <strong>${escapeHtml(guestName)}</strong>, your approved attendee QR code passes for <strong>${escapeHtml(eventTitle)}</strong> are ready.
    </p>
    ${
    formattedDate || eventLocation
      ? `<div style="background-color: #f1f5f9; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; font-size: 14px; color: #334155;">
          ${
        formattedDate
          ? `<p style="margin: 0 0 4px 0;"><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>`
          : ""
      }
          ${
        eventLocation
          ? `<p style="margin: 0;"><strong>Location:</strong> ${escapeHtml(eventLocation)}</p>`
          : ""
      }
        </div>`
      : ""
  }
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin-bottom: 24px; font-size: 14px; color: #1e3a8a;">
      <strong>Check-in Instructions:</strong> Present each attendee's individual QR code below (or from the attached multi-page PDF) to the check-in staff at the venue entrance. Each QR code is uniquely signed and valid for a single check-in.
    </div>
    ${passCardsHtml}
    <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748b; text-align: center;">
      A printable multi-page PDF containing all ${passes.length} pass(es) is also attached to this email.
    </p>
  </div>
</body>
</html>`;
}

export async function handleQrBundleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method Not Allowed.", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") || "EIRMIS <noreply@eirmis.local>";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const qrHmacSecret =
    Deno.env.get("QR_HMAC_SECRET") ||
    Deno.env.get("QR_SIGNING_SECRET") ||
    Deno.env.get("QR_TOKEN_SECRET") ||
    Deno.env.get("HMAC_SECRET") ||
    Deno.env.get("JWT_SECRET") ||
    supabaseServiceRoleKey;
  const authorization = req.headers.get("Authorization");

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !resendApiKey ||
    !supabaseServiceRoleKey ||
    !qrHmacSecret
  ) {
    console.error("QR bundle function is missing required configuration.");
    return errorResponse(
      "FUNCTION_NOT_CONFIGURED",
      "Function is not configured.",
      500,
    );
  }

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Request body must be valid JSON.",
      400,
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(
      "INVALID_REQUEST",
      "Request body must be a JSON object.",
      400,
    );
  }

  const payload = body as Record<string, unknown>;
  const rawInvitationId = payload.invitation_id;
  const rawEventId = payload.event_id;
  const rawForceResend = payload.force_resend;

  if (
    rawInvitationId !== undefined &&
    rawInvitationId !== null &&
    (typeof rawInvitationId !== "string" || !uuidPattern.test(rawInvitationId))
  ) {
    return errorResponse(
      "INVALID_INVITATION_ID",
      "invitation_id must be a valid UUID.",
      400,
    );
  }

  if (
    rawEventId !== undefined &&
    rawEventId !== null &&
    (typeof rawEventId !== "string" || !uuidPattern.test(rawEventId))
  ) {
    return errorResponse(
      "INVALID_EVENT_ID",
      "event_id must be a valid UUID.",
      400,
    );
  }

  if (
    rawForceResend !== undefined &&
    rawForceResend !== null &&
    typeof rawForceResend !== "boolean"
  ) {
    return errorResponse(
      "INVALID_FORCE_RESEND",
      "force_resend must be a boolean.",
      400,
    );
  }

  const invitationId =
    typeof rawInvitationId === "string" ? rawInvitationId : null;
  const eventIdParam = typeof rawEventId === "string" ? rawEventId : null;
  const forceResend =
    typeof rawForceResend === "boolean"
      ? rawForceResend
      : Boolean(invitationId && !eventIdParam);

  if (!invitationId && !eventIdParam) {
    return errorResponse(
      "INVALID_REQUEST",
      "Either event_id or invitation_id is required.",
      400,
    );
  }

  const serviceSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const isServiceRoleRequest =
    authorization === `Bearer ${supabaseServiceRoleKey}`;
  let actorId: string | null = null;

  if (!isServiceRoleRequest) {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
    }

    actorId = user.id;

    const { data: organizer, error: organizerError } = await serviceSupabase
      .from("organizer_profiles")
      .select("id")
      .eq("id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (organizerError) {
      console.error("Failed to verify organizer:", organizerError.message);
      return errorResponse(
        "ORGANIZER_CHECK_FAILED",
        "Failed to verify organizer.",
        500,
      );
    }

    if (!organizer) {
      return errorResponse(
        "FORBIDDEN",
        "Caller does not have active organizer permissions.",
        403,
      );
    }
  }

  let singleInvitation: InvitationRow | null = null;
  if (invitationId) {
    const { data: inv, error: invError } = await serviceSupabase
      .from("invitations")
      .select("id, event_id, guest_id, status")
      .eq("id", invitationId)
      .maybeSingle();

    if (invError) {
      console.error("Failed to fetch invitation:", invError.message);
      return errorResponse(
        "INVITATION_FETCH_FAILED",
        "Failed to fetch invitation.",
        500,
      );
    }

    if (!inv) {
      return errorResponse("NOT_FOUND", "Invitation not found.", 404);
    }

    if (eventIdParam && inv.event_id !== eventIdParam) {
      return errorResponse(
        "NOT_FOUND",
        "Invitation does not belong to the specified event.",
        404,
      );
    }

    singleInvitation = inv as InvitationRow;
  }

  const targetEventId = eventIdParam ?? singleInvitation!.event_id;

  const { data: eventData, error: eventError } = await serviceSupabase
    .from("events")
    .select("id, organizer_id, title, starts_at, venue_name, address, city")
    .eq("id", targetEventId)
    .maybeSingle();

  if (eventError) {
    console.error("Failed to fetch event:", eventError.message);
    return errorResponse("EVENT_FETCH_FAILED", "Failed to fetch event.", 500);
  }

  if (!eventData) {
    return errorResponse("NOT_FOUND", "Event not found.", 404);
  }

  const event = eventData as EventRow;

  if (!isServiceRoleRequest && event.organizer_id !== actorId) {
    return errorResponse(
      "FORBIDDEN",
      "Caller is not the organizer of this event.",
      403,
    );
  }

  let invitations: InvitationRow[];
  if (singleInvitation) {
    invitations = [singleInvitation];
  } else {
    const { data: eventInvitations, error: listInvError } =
      await serviceSupabase
        .from("invitations")
        .select("id, event_id, guest_id, status")
        .eq("event_id", targetEventId)
        .eq("status", "accepted");

    if (listInvError) {
      console.error(
        "Failed to fetch event invitations:",
        listInvError.message,
      );
      return errorResponse(
        "INVITATIONS_FETCH_FAILED",
        "Failed to fetch event invitations.",
        500,
      );
    }

    invitations = (eventInvitations ?? []) as InvitationRow[];
  }

  if (invitations.length === 0) {
    return jsonResponse({
      message: "No confirmed invitations found for QR bundle dispatch.",
      emails_sent: 0,
      dispatched_count: 0,
      failed_count: 0,
      invitation_ids: [],
    });
  }

  const eventLocation =
    [event.venue_name, event.address, event.city].filter(Boolean).join(", ") ||
    null;

  let dispatchedCount = 0;
  let failedCount = 0;
  const dispatchedInvitationIds: string[] = [];

  for (const invitation of invitations) {
    const { data: attendeeRows, error: attendeesError } = await serviceSupabase
      .from("attendees")
      .select("*")
      .eq("invitation_id", invitation.id)
      .eq("status", "approved");

    if (attendeesError) {
      console.error(
        `Failed to fetch approved attendees for invitation ${invitation.id}:`,
        attendeesError.message,
      );
      if (singleInvitation && !eventIdParam) {
        return errorResponse(
          "ATTENDEES_FETCH_FAILED",
          "Failed to fetch approved attendees.",
          500,
        );
      }
      failedCount++;
      continue;
    }

    const approvedAttendees = (attendeeRows ?? []) as AttendeeRow[];
    if (approvedAttendees.length === 0) {
      if (singleInvitation && !eventIdParam) {
        return errorResponse(
          "NOT_FOUND",
          "No approved attendees found for this invitation.",
          404,
        );
      }
      continue;
    }

    if (!forceResend) {
      const { data: existingLogs, error: existingLogsError } =
        await serviceSupabase
          .from("email_logs")
          .select("id, sent_at, created_at")
          .eq("invitation_id", invitation.id)
          .eq("status", "sent")
          .in("type", ["qr_bundle_dispatched", "qr_codes_issued"])
          .order("sent_at", { ascending: false })
          .limit(1);

      if (!existingLogsError && existingLogs && existingLogs.length > 0) {
        const lastSentRaw =
          existingLogs[0].sent_at ?? existingLogs[0].created_at;
        const lastSentMs = lastSentRaw ? Date.parse(lastSentRaw) : 0;

        let allAttendeesAlreadyIssued = true;
        for (const attendee of approvedAttendees) {
          const decoded = await verifyAndDecodeQrToken(
            attendee.qr_token,
            {
              attendee_id: attendee.id,
              event_id: invitation.event_id,
              invitation_id: invitation.id,
            },
            qrHmacSecret,
          );
          if (!decoded) {
            allAttendeesAlreadyIssued = false;
            break;
          }
          const reviewedMs = attendee.reviewed_at
            ? Date.parse(attendee.reviewed_at)
            : 0;
          if (lastSentMs > 0 && reviewedMs > lastSentMs) {
            allAttendeesAlreadyIssued = false;
            break;
          }
        }

        if (allAttendeesAlreadyIssued) {
          continue;
        }
      }
    }

    const { data: guestData, error: guestError } = await serviceSupabase
      .from("guests")
      .select("id, email, full_name")
      .eq("id", invitation.guest_id)
      .maybeSingle();

    if (guestError || !guestData || !guestData.email) {
      console.error(
        `Failed to fetch guest for invitation ${invitation.id}:`,
        guestError?.message ?? "Guest record or email missing.",
      );
      if (singleInvitation && !eventIdParam) {
        return errorResponse(
          "GUEST_FETCH_FAILED",
          "Failed to fetch invitation guest.",
          500,
        );
      }
      failedCount++;
      continue;
    }

    const guest = guestData as GuestRow;

    const preparedAttendees: {
      id: string;
      full_name: string;
      is_primary: boolean;
      qr_token: string;
    }[] = [];

    let tokenGenerationFailed = false;
    for (const attendee of approvedAttendees) {
      const existingValidPayload = await verifyAndDecodeQrToken(
        attendee.qr_token,
        {
          attendee_id: attendee.id,
          event_id: invitation.event_id,
          invitation_id: invitation.id,
        },
        qrHmacSecret,
      );

      let tokenToUse = attendee.qr_token;
      if (!existingValidPayload || !tokenToUse) {
        const issuedAt = new Date().toISOString();
        tokenToUse = await signQrToken(
          {
            attendee_id: attendee.id,
            event_id: invitation.event_id,
            invitation_id: invitation.id,
            issued_at: issuedAt,
          },
          qrHmacSecret,
        );

        const { error: updateTokenError } = await serviceSupabase
          .from("attendees")
          .update({ qr_token: tokenToUse })
          .eq("id", attendee.id);

        if (updateTokenError) {
          console.error(
            `Failed to persist qr_token for attendee ${attendee.id}:`,
            updateTokenError.message,
          );
          tokenGenerationFailed = true;
          break;
        }
      }

      preparedAttendees.push({
        id: attendee.id,
        full_name: attendee.full_name,
        is_primary: Boolean(attendee.is_primary),
        qr_token: tokenToUse,
      });
    }

    if (tokenGenerationFailed) {
      failedCount++;
      if (singleInvitation && !eventIdParam) {
        return errorResponse(
          "QR_TOKEN_UPDATE_FAILED",
          "Failed to persist attendee QR token.",
          500,
        );
      }
      continue;
    }

    let resendMessageId: string;
    try {
      const { pdfBytes, passesWithPngBase64 } = await renderAttendeeQrAssets(
        preparedAttendees,
        event.title,
      );
      const htmlBody = buildQrBundleEmailHtml({
        guestName: guest.full_name || guest.email,
        eventTitle: event.title || "EIRMIS Event",
        eventStartsAt: event.starts_at,
        eventLocation,
        passes: passesWithPngBase64,
      });

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [guest.email],
          subject: event.title
            ? `Your QR Code Passes for ${event.title}`
            : "Your EIRMIS QR codes",
          html: htmlBody,
          text: `Your attendee QR codes for ${
            event.title || "your event"
          } are attached as a PDF (${preparedAttendees.length} pass(es)).`,
          attachments: [
            {
              filename: "qr-codes.pdf",
              content: bytesToBase64(pdfBytes),
            },
          ],
        }),
      });

      const resendResponseBody = await resendResponse.json();
      if (!resendResponse.ok) {
        throw new Error(
          `Resend request failed (${resendResponse.status}): ${JSON.stringify(
            resendResponseBody,
          )}`,
        );
      }

      if (
        !resendResponseBody ||
        typeof resendResponseBody !== "object" ||
        typeof (resendResponseBody as { id?: unknown }).id !== "string"
      ) {
        throw new Error("Resend response did not include a message ID.");
      }

      resendMessageId = (resendResponseBody as { id: string }).id;
    } catch (error) {
      console.error(
        `Failed to send QR bundle for invitation ${invitation.id}:`,
        error,
      );
      failedCount++;

      const { error: failedLogError } = await serviceSupabase
        .from("email_logs")
        .insert({
          event_id: invitation.event_id,
          invitation_id: invitation.id,
          recipient_email: guest.email,
          type: "qr_bundle_dispatched",
          status: "failed",
        });

      if (failedLogError) {
        console.error(
          "Failed to record failed QR bundle email:",
          failedLogError.message,
        );
      }

      if (singleInvitation && !eventIdParam) {
        return errorResponse(
          "QR_BUNDLE_SEND_FAILED",
          "Failed to send QR bundle.",
          500,
        );
      }
      continue;
    }

    const sentAt = new Date().toISOString();
    const { data: emailLog, error: logError } = await serviceSupabase
      .from("email_logs")
      .insert({
        event_id: invitation.event_id,
        invitation_id: invitation.id,
        recipient_email: guest.email,
        type: "qr_bundle_dispatched",
        status: "sent",
        provider_message_id: resendMessageId,
        sent_at: sentAt,
      })
      .select("id")
      .single();

    if (logError || !emailLog) {
      console.error(
        "QR bundle sent, but email log insertion failed:",
        logError?.message ?? "No email log row returned.",
      );
    }

    const { error: auditLogError } = await serviceSupabase
      .from("audit_log_entries")
      .insert({
        actor_type: isServiceRoleRequest ? "system" : "organizer",
        actor_id: isServiceRoleRequest ? null : actorId,
        action: "qr_bundle.dispatched",
        entity_type: "invitation",
        entity_id: invitation.id,
        new_value: {
          event_id: invitation.event_id,
          invitation_id: invitation.id,
          recipient_email: guest.email,
          email_log_id: emailLog?.id ?? null,
          provider_message_id: resendMessageId,
          attendee_count: preparedAttendees.length,
        },
      });

    if (auditLogError) {
      console.error(
        "QR bundle sent, but audit log insertion failed:",
        auditLogError.message,
      );
    }

    if ((logError || !emailLog || auditLogError) && singleInvitation && !eventIdParam) {
      return errorResponse(
        "LOG_RECORD_FAILED",
        "QR bundle was sent, but one or more logs could not be recorded.",
        500,
      );
    }

    dispatchedCount++;
    dispatchedInvitationIds.push(invitation.id);
  }

  return jsonResponse({
    message:
      dispatchedCount > 0
        ? "QR bundle sent successfully."
        : "No unsent QR bundles to dispatch.",
    emails_sent: dispatchedCount,
    dispatched_count: dispatchedCount,
    failed_count: failedCount,
    invitation_ids: dispatchedInvitationIds,
  });
}

if (import.meta.main) {
  serve(handleQrBundleRequest);
}
