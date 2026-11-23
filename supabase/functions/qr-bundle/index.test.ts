import {
  buildQrBundleEmailHtml,
  handleQrBundleRequest,
  renderAttendeeQrAssets,
  signQrToken,
  verifyAndDecodeQrToken,
} from "./index.ts";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";
const INVITATION_ID = "66666666-6666-6666-6666-666666666666";
const INVITATION_2_ID = "66666666-6666-6666-6666-666666666667";
const ORGANIZER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ORGANIZER_ID = "11111111-1111-1111-1111-111111111119";
const GUEST_ID = "33333333-3333-3333-3333-333333333333";
const ATTENDEE_1_ID = "77777777-7777-7777-7777-777777777771";
const ATTENDEE_2_ID = "77777777-7777-7777-7777-777777777772";
const HMAC_SECRET = "test-hmac-secret-key-256";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

Deno.test("signQrToken and verifyAndDecodeQrToken round-trip and tamper resistance", async () => {
  const payload = {
    attendee_id: ATTENDEE_1_ID,
    event_id: EVENT_ID,
    invitation_id: INVITATION_ID,
    issued_at: "2026-11-09T10:00:00.000Z",
  };

  const token = await signQrToken(payload, HMAC_SECRET);
  assert(
    token.startsWith("eyJhbGciOiJIUzI1NiJ9."),
    "Token should start with HS256 header eyJhbGciOiJIUzI1NiJ9.",
  );

  const verified = await verifyAndDecodeQrToken(
    token,
    {
      attendee_id: ATTENDEE_1_ID,
      event_id: EVENT_ID,
      invitation_id: INVITATION_ID,
    },
    HMAC_SECRET,
  );
  assert(verified !== null, "Token should verify with matching secret and IDs");
  assert(verified.attendee_id === ATTENDEE_1_ID, "attendee_id matches");
  assert(verified.event_id === EVENT_ID, "event_id matches");
  assert(verified.invitation_id === INVITATION_ID, "invitation_id matches");
  assert(
    verified.issued_at === "2026-11-09T10:00:00.000Z",
    "issued_at matches",
  );

  // Tampered signature must fail
  const tampered = token.slice(0, -2) + "ab";
  const badSig = await verifyAndDecodeQrToken(
    tampered,
    {
      attendee_id: ATTENDEE_1_ID,
      event_id: EVENT_ID,
      invitation_id: INVITATION_ID,
    },
    HMAC_SECRET,
  );
  assert(badSig === null, "Tampered signature must return null");

  // Wrong event_id must fail
  const wrongEvent = await verifyAndDecodeQrToken(
    token,
    {
      attendee_id: ATTENDEE_1_ID,
      event_id: "55555555-5555-5555-5555-555555555599",
      invitation_id: INVITATION_ID,
    },
    HMAC_SECRET,
  );
  assert(wrongEvent === null, "Mismatched event_id must return null");
});

Deno.test("renderAttendeeQrAssets and buildQrBundleEmailHtml produce valid PDF and HTML", async () => {
  const token = await signQrToken(
    {
      attendee_id: ATTENDEE_1_ID,
      event_id: EVENT_ID,
      invitation_id: INVITATION_ID,
      issued_at: new Date().toISOString(),
    },
    HMAC_SECRET,
  );

  const { pdfBytes, passesWithPngBase64 } = await renderAttendeeQrAssets(
    [
      {
        id: ATTENDEE_1_ID,
        full_name: "Jose Santos",
        is_primary: true,
        qr_token: token,
      },
    ],
    "Annual Gala 2026",
  );

  assert(pdfBytes.byteLength > 500, "PDF bytes should be non-empty");
  assert(passesWithPngBase64.length === 1, "Should have 1 pass");
  assert(passesWithPngBase64[0].pngBase64.length > 100, "PNG base64 non-empty");

  const html = buildQrBundleEmailHtml({
    guestName: "Jose Santos",
    eventTitle: "Annual Gala 2026",
    eventStartsAt: "2026-12-15T18:00:00+08:00",
    eventLocation: "Grand Ballroom, Manila",
    passes: passesWithPngBase64,
  });

  assert(html.includes("Annual Gala 2026"), "HTML contains event title");
  assert(html.includes("Jose Santos"), "HTML contains attendee name");
  assert(
    html.includes("data:image/png;base64,"),
    "HTML embeds QR PNG data URI",
  );
  assert(
    html.includes("Check-in Instructions:"),
    "HTML includes attendee check-in instructions",
  );
});

Deno.test("handleQrBundleRequest enforces 401, 403, and dispatches bundles with 200", async () => {
  Deno.env.set("SUPABASE_URL", "http://supabase.mock");
  Deno.env.set("SUPABASE_ANON_KEY", "anon-key");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  Deno.env.set("RESEND_API_KEY", "resend-api-key");
  Deno.env.set("RESEND_FROM_EMAIL", "EIRMIS <tickets@eirmis.local>");
  Deno.env.set("QR_HMAC_SECRET", HMAC_SECRET);

  // 1. Missing Authorization -> 401
  const res401 = await handleQrBundleRequest(
    new Request("http://localhost/functions/v1/qr-bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: EVENT_ID }),
    }),
  );
  assert(res401.status === 401, "Missing auth should return 401");

  const updatedTokens: Record<string, string> = {};
  const emailLogsInserted: Record<string, unknown>[] = [];
  const auditLogsInserted: Record<string, unknown>[] = [];
  let resendPayloads: Record<string, unknown>[] = [];
  let activeCallerUserId = ORGANIZER_ID;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");

    if (urlStr.includes("/auth/v1/user")) {
      return new Response(
        JSON.stringify({ id: activeCallerUserId, email: "org@example.com" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (urlStr.includes("/rest/v1/organizer_profiles")) {
      if (
        activeCallerUserId === ORGANIZER_ID ||
        activeCallerUserId === OTHER_ORGANIZER_ID
      ) {
        return new Response(
          JSON.stringify({ id: activeCallerUserId, status: "active" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (urlStr.includes("/rest/v1/events")) {
      return new Response(
        JSON.stringify({
          id: EVENT_ID,
          organizer_id: ORGANIZER_ID,
          title: "Annual Gala 2026",
          starts_at: "2026-12-15T18:00:00Z",
          venue_name: "Main Hall",
          address: "123 Ave",
          city: "Manila",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (urlStr.includes("/rest/v1/invitations")) {
      if (urlStr.includes(`id=eq.${INVITATION_ID}`)) {
        return new Response(
          JSON.stringify({
            id: INVITATION_ID,
            event_id: EVENT_ID,
            guest_id: GUEST_ID,
            status: "accepted",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify([
          {
            id: INVITATION_ID,
            event_id: EVENT_ID,
            guest_id: GUEST_ID,
            status: "accepted",
          },
          {
            id: INVITATION_2_ID,
            event_id: EVENT_ID,
            guest_id: GUEST_ID,
            status: "accepted",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (urlStr.includes("/rest/v1/attendees")) {
      if (method === "PATCH") {
        const match = urlStr.match(/id=eq\.([0-9a-f-]+)/i);
        const bodyJson = JSON.parse(String(init?.body ?? "{}"));
        if (match && bodyJson.qr_token) {
          updatedTokens[match[1]] = bodyJson.qr_token;
        }
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes(`invitation_id=eq.${INVITATION_ID}`)) {
        return new Response(
          JSON.stringify([
            {
              id: ATTENDEE_1_ID,
              invitation_id: INVITATION_ID,
              full_name: "Synthetic Guest",
              email: "guest@example.com",
              is_primary: true,
              status: "approved",
              qr_token: updatedTokens[ATTENDEE_1_ID] ?? null,
              submitted_at: "2026-10-06T10:00:00Z",
              reviewed_at: "2026-10-07T09:00:00Z",
            },
            {
              id: ATTENDEE_2_ID,
              invitation_id: INVITATION_ID,
              full_name: "Jose Santos",
              email: null,
              is_primary: false,
              status: "approved",
              qr_token: updatedTokens[ATTENDEE_2_ID] ?? "legacy-unsigned-token",
              submitted_at: "2026-10-06T10:00:00Z",
              reviewed_at: "2026-10-07T09:00:00Z",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (urlStr.includes("/rest/v1/guests")) {
      return new Response(
        JSON.stringify({
          id: GUEST_ID,
          email: "guest@example.com",
          full_name: "Synthetic Guest",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (urlStr.includes("/rest/v1/email_logs")) {
      if (method === "GET") {
        return new Response(JSON.stringify(emailLogsInserted), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const row = JSON.parse(String(init?.body ?? "{}"));
      const inserted = { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", ...row };
      emailLogsInserted.push(inserted);
      return new Response(JSON.stringify(inserted), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (urlStr.includes("/rest/v1/audit_log_entries")) {
      const row = JSON.parse(String(init?.body ?? "{}"));
      auditLogsInserted.push(row);
      return new Response(
        JSON.stringify([{ id: "ffffffff-ffff-ffff-ffff-ffffffffffff", ...row }]),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (urlStr.includes("api.resend.com/emails")) {
      const parsed = JSON.parse(String(init?.body ?? "{}"));
      resendPayloads.push(parsed);
      return new Response(JSON.stringify({ id: "resend_msg_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  try {
    // 2. Caller is not organizer of the event -> 403
    activeCallerUserId = OTHER_ORGANIZER_ID;
    const res403 = await handleQrBundleRequest(
      new Request("http://localhost/functions/v1/qr-bundle", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-other-org-jwt",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: EVENT_ID, force_resend: false }),
      }),
    );
    assert(res403.status === 403, "Non-owner organizer should receive 403");

    // 3. Valid Organizer bulk event dispatch -> 200
    activeCallerUserId = ORGANIZER_ID;
    resendPayloads = [];
    const res200 = await handleQrBundleRequest(
      new Request("http://localhost/functions/v1/qr-bundle", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-org-jwt",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: EVENT_ID,
          invitation_id: INVITATION_ID,
          force_resend: false,
        }),
      }),
    );
    assert(res200.status === 200, `Expected 200, got ${res200.status}`);
    const body200 = await res200.json();
    assert(body200.dispatched_count === 1, "dispatched_count should be 1");
    assert(body200.failed_count === 0, "failed_count should be 0");
    assert(body200.emails_sent === 1, "emails_sent should be 1");
    assert(
      Array.isArray(body200.invitation_ids) &&
        body200.invitation_ids[0] === INVITATION_ID,
      "invitation_ids should include INVITATION_ID",
    );

    // Both attendees must now have valid signed HMAC-SHA256 tokens saved
    assert(Boolean(updatedTokens[ATTENDEE_1_ID]), "Attendee 1 token generated");
    assert(
      Boolean(updatedTokens[ATTENDEE_2_ID]),
      "Attendee 2 token regenerated from unsigned",
    );

    // Email and audit logs recorded per spec
    assert(emailLogsInserted.length === 1, "1 email_log row inserted");
    assert(
      emailLogsInserted[0].type === "qr_bundle_dispatched",
      "email_log type is qr_bundle_dispatched",
    );
    assert(auditLogsInserted.length === 1, "1 audit_log_entries row inserted");
    assert(
      auditLogsInserted[0].action === "qr_bundle.dispatched",
      "audit_log action is qr_bundle.dispatched",
    );
    assert(resendPayloads.length === 1, "1 email sent via Resend");

    // 4. Calling again with force_resend: false skips already-sent invitation
    const resSkip = await handleQrBundleRequest(
      new Request("http://localhost/functions/v1/qr-bundle", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-org-jwt",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: EVENT_ID,
          invitation_id: INVITATION_ID,
          force_resend: false,
        }),
      }),
    );
    const bodySkip = await resSkip.json();
    assert(
      bodySkip.dispatched_count === 0,
      "Should skip already-sent when force_resend is false",
    );

    // 5. Calling with force_resend: true resends
    const resForce = await handleQrBundleRequest(
      new Request("http://localhost/functions/v1/qr-bundle", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-org-jwt",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: EVENT_ID,
          invitation_id: INVITATION_ID,
          force_resend: true,
        }),
      }),
    );
    const bodyForce = await resForce.json();
    assert(
      bodyForce.dispatched_count === 1,
      "Should resend when force_resend is true",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
