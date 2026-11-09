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

async function createQrBundlePdf(attendees: {
  full_name: string;
  qr_token: string | null;
}[]) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const attendee of attendees) {
    if (!attendee.qr_token) {
      throw new Error(`Approved attendee "${attendee.full_name}" has no QR token.`);
    }

    const pngBuffer = await QRCode.toBuffer(attendee.qr_token, {
      type: "png",
    });
    const qrImage = await pdf.embedPng(pngBuffer);
    const page = pdf.addPage([612, 792]);
    const qrSize = 300;

    page.drawText(attendee.full_name, {
      x: 48,
      y: page.getHeight() - 64,
      size: 20,
      font,
    });
    page.drawImage(qrImage, {
      x: (page.getWidth() - qrSize) / 2,
      y: (page.getHeight() - qrSize) / 2 - 20,
      width: qrSize,
      height: qrSize,
    });
  }

  return new Uint8Array(await pdf.save());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !resendApiKey ||
    !resendFromEmail ||
    !supabaseServiceRoleKey
  ) {
    console.error("QR bundle function is missing required configuration.");
    return jsonResponse({ error: "Function is not configured." }, 500);
  }

  if (!authorization) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (
    body === null ||
    typeof body !== "object" ||
    !("invitation_id" in body) ||
    typeof body.invitation_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(body.invitation_id)
  ) {
    return jsonResponse({ error: "A valid invitation_id is required." }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: invitation, error: invitationError } = await supabase
    .from("invitations")
    .select("id, event_id, guest_id")
    .eq("id", body.invitation_id)
    .maybeSingle();

  if (invitationError || !invitation) {
    if (invitationError) {
      console.error("Failed to fetch invitation:", invitationError.message);
    }
    return jsonResponse({ error: "Invitation not found." }, 404);
  }

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("email")
    .eq("id", invitation.guest_id)
    .maybeSingle();

  if (guestError || !guest) {
    console.error("Failed to fetch invitation guest:", guestError?.message);
    return jsonResponse({ error: "Failed to fetch invitation guest." }, 500);
  }

  const { data: attendees, error } = await supabase
    .from("attendees")
    .select("*")
    .eq("invitation_id", body.invitation_id)
    .eq("status", "approved");

  if (error) {
    console.error("Failed to fetch approved attendees:", error.message);
    return jsonResponse({ error: "Failed to fetch approved attendees." }, 500);
  }

  if (attendees.length === 0) {
    return jsonResponse(
      { error: "No approved attendees found for this invitation." },
      404,
    );
  }

  const serviceSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  let resendResult: { id: string };
  try {
    const pdfBytes = await createQrBundlePdf(attendees);
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [guest.email],
        subject: "Your EIRMIS QR codes",
        text: "Your attendee QR codes are attached as a PDF.",
        attachments: [{
          filename: "qr-codes.pdf",
          content: bytesToBase64(pdfBytes),
        }],
      }),
    });

    const resendResponseBody = await resendResponse.json();
    if (!resendResponse.ok) {
      throw new Error(
        `Resend request failed (${resendResponse.status}): ${
          JSON.stringify(resendResponseBody)
        }`,
      );
    }

    if (!resendResponseBody || typeof resendResponseBody.id !== "string") {
      throw new Error("Resend response did not include a message ID.");
    }

    resendResult = resendResponseBody;
  } catch (error) {
    console.error("Failed to send QR bundle:", error);

    const { error: failedLogError } = await serviceSupabase
      .from("email_logs")
      .insert({
        event_id: invitation.event_id,
        invitation_id: invitation.id,
        recipient_email: guest.email,
        type: "qr_codes_issued",
        status: "failed",
      });

    if (failedLogError) {
      console.error(
        "Failed to record failed QR bundle email:",
        failedLogError.message,
      );
    }

    return jsonResponse({ error: "Failed to send QR bundle." }, 500);
  }

  const { data: emailLog, error: logError } = await serviceSupabase
    .from("email_logs")
    .insert({
      event_id: invitation.event_id,
      invitation_id: invitation.id,
      recipient_email: guest.email,
      type: "qr_codes_issued",
      status: "sent",
      provider_message_id: resendResult.id,
      sent_at: new Date().toISOString(),
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
      actor_type: "system",
      actor_id: null,
      action: "qr_bundle_sent",
      entity_type: "invitation",
      entity_id: invitation.id,
      new_value: {
        email_log_id: emailLog?.id ?? null,
        provider_message_id: resendResult.id,
        attendee_count: attendees.length,
      },
    });

  if (auditLogError) {
    console.error(
      "QR bundle sent, but audit log insertion failed:",
      auditLogError.message,
    );
  }

  if (logError || !emailLog || auditLogError) {
    return jsonResponse(
      { error: "QR bundle was sent, but one or more logs could not be recorded." },
      500,
    );
  }

  return jsonResponse({
    message: "QR bundle sent successfully.",
    emails_sent: 1,
  });
});
