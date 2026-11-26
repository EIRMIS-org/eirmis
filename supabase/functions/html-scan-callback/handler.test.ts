import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createScanCallbackHandler,
  type InvitationDesignRow,
  type ScanCallbackDependencies,
} from "./handler.ts";

const SUPABASE_URL = "https://example.supabase.co";
const SERVICE_KEY = "test-service-role-key-secret";
const WEBHOOK_SECRET = "super-secret-webhook-signing-key";
const VALID_SCAN_ID = "22222222-2222-2222-2222-222222222222";

const VALID_PAYLOAD = JSON.stringify({
  scan_id: VALID_SCAN_ID,
  result: "clean",
});

function makeDesign(
  overrides: Partial<InvitationDesignRow> = {},
): InvitationDesignRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    event_id: "55555555-5555-5555-5555-555555555555",
    design_type: "html",
    html_storage_path: "events/55555555/invite.html",
    validation_status: "pending",
    ...overrides,
  };
}

async function signBody(rawBody: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function makeRequest(
  body: string,
  headers: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request("http://localhost/functions/v1/html-scan-callback", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: method === "POST" ? body : undefined,
  });
}

describe("html-scan-callback handler", () => {
  let deps: ScanCallbackDependencies;

  beforeEach(() => {
    deps = {
      supabaseUrl: SUPABASE_URL,
      supabaseServiceRoleKey: SERVICE_KEY,
      scannerWebhookSecret: WEBHOOK_SECRET,
      now: () => new Date("2026-11-25T12:00:00.000Z"),
      findPendingDesign: vi
        .fn()
        .mockResolvedValue({ data: makeDesign(), error: null }),
      moveToQuarantine: vi.fn().mockResolvedValue({ error: null }),
      updateDesign: vi.fn().mockResolvedValue({ updated: true, error: null }),
      updateStoragePath: vi.fn().mockResolvedValue({ error: null }),
      insertAuditLog: vi.fn().mockResolvedValue({ error: null }),
      notifyScanFailure: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe("missing or blank SCANNER_WEBHOOK_SECRET (fail closed)", () => {
    it.each([undefined, "", "   "])(
      "rejects x-signature: test-signature with 500 FUNCTION_NOT_CONFIGURED when secret is %j",
      async (secret) => {
        const handler = createScanCallbackHandler({
          ...deps,
          scannerWebhookSecret: secret,
        });

        const res = await handler(
          makeRequest(VALID_PAYLOAD, { "x-signature": "test-signature" }),
        );
        expect(res.status).toBe(500);
        expect(await res.json()).toMatchObject({ code: "FUNCTION_NOT_CONFIGURED" });
        expect(deps.findPendingDesign).not.toHaveBeenCalled();
        expect(deps.updateDesign).not.toHaveBeenCalled();
      },
    );

    it("rejects sha256-hmac-hash fallback with 500 when secret is unset", async () => {
      const handler = createScanCallbackHandler({
        ...deps,
        scannerWebhookSecret: undefined,
      });

      const res = await handler(
        makeRequest(VALID_PAYLOAD, { "x-scanner-signature": "sha256-hmac-hash" }),
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ code: "FUNCTION_NOT_CONFIGURED" });
      expect(deps.updateDesign).not.toHaveBeenCalled();
    });

    it("rejects even service-role requests with 500 when SCANNER_WEBHOOK_SECRET is unset", async () => {
      const handler = createScanCallbackHandler({
        ...deps,
        scannerWebhookSecret: undefined,
      });

      const res = await handler(
        makeRequest(VALID_PAYLOAD, { Authorization: `Bearer ${SERVICE_KEY}` }),
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ code: "FUNCTION_NOT_CONFIGURED" });
      expect(deps.updateDesign).not.toHaveBeenCalled();
    });
  });

  describe("webhook signature verification", () => {
    it("accepts a valid HMAC-SHA256 signature in x-scanner-signature", async () => {
      const handler = createScanCallbackHandler(deps);
      const sig = await signBody(VALID_PAYLOAD, WEBHOOK_SECRET);

      const res = await handler(
        makeRequest(VALID_PAYLOAD, { "x-scanner-signature": `sha256=${sig}` }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ processed: true });
      expect(deps.updateDesign).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        VALID_SCAN_ID,
        expect.objectContaining({ validation_status: "passed" }),
      );
    });

    it("accepts a valid HMAC-SHA256 signature in x-signature or x-hub-signature-256", async () => {
      const handler = createScanCallbackHandler(deps);
      const sig = await signBody(VALID_PAYLOAD, WEBHOOK_SECRET);

      const res1 = await handler(
        makeRequest(VALID_PAYLOAD, { "x-signature": sig }),
      );
      expect(res1.status).toBe(200);

      const res2 = await handler(
        makeRequest(VALID_PAYLOAD, { "x-hub-signature-256": `sha256=${sig}` }),
      );
      expect(res2.status).toBe(200);
    });

    it("rejects test-signature and sha256-hmac-hash with 401 when secret is set", async () => {
      const handler = createScanCallbackHandler(deps);

      const res1 = await handler(
        makeRequest(VALID_PAYLOAD, { "x-signature": "test-signature" }),
      );
      expect(res1.status).toBe(401);

      const res2 = await handler(
        makeRequest(VALID_PAYLOAD, { "x-scanner-signature": "sha256-hmac-hash" }),
      );
      expect(res2.status).toBe(401);
      expect(deps.updateDesign).not.toHaveBeenCalled();
    });

    it("rejects missing signature header and ignores body.signature", async () => {
      const handler = createScanCallbackHandler(deps);
      const bodyWithSig = JSON.stringify({
        scan_id: "scan-job-123",
        result: "clean",
        signature: "test-signature",
      });

      const res = await handler(makeRequest(bodyWithSig));
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ code: "UNAUTHORIZED" });
      expect(deps.updateDesign).not.toHaveBeenCalled();
    });

    it("rejects invalid HMAC signatures with 401", async () => {
      const handler = createScanCallbackHandler(deps);
      const wrongSig = await signBody(VALID_PAYLOAD, "wrong-secret");

      const res = await handler(
        makeRequest(VALID_PAYLOAD, { "x-scanner-signature": `sha256=${wrongSig}` }),
      );
      expect(res.status).toBe(401);
      expect(deps.updateDesign).not.toHaveBeenCalled();
    });

    it("accepts service-role Authorization when SCANNER_WEBHOOK_SECRET is configured", async () => {
      const handler = createScanCallbackHandler(deps);

      const res = await handler(
        makeRequest(VALID_PAYLOAD, { Authorization: `Bearer ${SERVICE_KEY}` }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ processed: true });
    });

    it("rejects non-service-role Authorization without a valid signature header", async () => {
      const handler = createScanCallbackHandler(deps);

      const res = await handler(
        makeRequest(VALID_PAYLOAD, { Authorization: "Bearer anon-or-user-jwt" }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("method and CORS handling", () => {
    it("allows OPTIONS preflight even if secret is unset", async () => {
      const handler = createScanCallbackHandler({
        ...deps,
        scannerWebhookSecret: undefined,
      });

      const res = await handler(makeRequest("", {}, "OPTIONS"));
      expect(res.status).toBe(200);
    });

    it("rejects non-POST methods with 405", async () => {
      const handler = createScanCallbackHandler(deps);

      const res = await handler(makeRequest("", {}, "GET"));
      expect(res.status).toBe(405);
      expect(await res.json()).toMatchObject({ code: "METHOD_NOT_ALLOWED" });
    });
  });

  describe("scan_id validation and lookup", () => {
    it("rejects a non-UUID scan_id with 400 INVALID_REQUEST before querying", async () => {
      const handler = createScanCallbackHandler(deps);
      const body = JSON.stringify({
        scan_id: "scan-job-123",
        result: "clean",
      });

      const res = await handler(
        makeRequest(body, { Authorization: `Bearer ${SERVICE_KEY}` }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "INVALID_REQUEST" });
      expect(deps.findPendingDesign).not.toHaveBeenCalled();
      expect(deps.updateDesign).not.toHaveBeenCalled();
    });

    it("looks up the pending design by scan_id and ignores event_id", async () => {
      const handler = createScanCallbackHandler(deps);
      const body = JSON.stringify({
        scan_id: VALID_SCAN_ID,
        result: "clean",
        event_id: "99999999-9999-9999-9999-999999999999",
      });

      const res = await handler(
        makeRequest(body, { Authorization: `Bearer ${SERVICE_KEY}` }),
      );
      expect(res.status).toBe(200);
      expect(deps.findPendingDesign).toHaveBeenCalledWith(VALID_SCAN_ID);
    });

    it("returns 404 NOT_FOUND with no fallback when no pending design matches scan_id", async () => {
      deps.findPendingDesign = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const handler = createScanCallbackHandler(deps);
      const body = JSON.stringify({
        scan_id: VALID_SCAN_ID,
        result: "clean",
        event_id: "55555555-5555-5555-5555-555555555555",
      });

      const res = await handler(
        makeRequest(body, { Authorization: `Bearer ${SERVICE_KEY}` }),
      );
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ code: "NOT_FOUND" });
      expect(deps.findPendingDesign).toHaveBeenCalledWith(VALID_SCAN_ID);
      expect(deps.updateDesign).not.toHaveBeenCalled();
      expect(deps.insertAuditLog).not.toHaveBeenCalled();
      expect(deps.notifyScanFailure).not.toHaveBeenCalled();
    });

    it("returns 404 NOT_FOUND and skips quarantine/audit/email when conditional update matches 0 rows (stale or concurrent)", async () => {
      deps.updateDesign = vi
        .fn()
        .mockResolvedValue({ updated: false, error: null });
      const handler = createScanCallbackHandler(deps);
      const body = JSON.stringify({
        scan_id: VALID_SCAN_ID,
        result: "malicious",
        notes: "Detected script payload",
      });

      const res = await handler(
        makeRequest(body, { Authorization: `Bearer ${SERVICE_KEY}` }),
      );
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ code: "NOT_FOUND" });
      expect(deps.updateDesign).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        VALID_SCAN_ID,
        expect.objectContaining({ validation_status: "failed" }),
      );
      expect(deps.moveToQuarantine).not.toHaveBeenCalled();
      expect(deps.updateStoragePath).not.toHaveBeenCalled();
      expect(deps.insertAuditLog).not.toHaveBeenCalled();
      expect(deps.notifyScanFailure).not.toHaveBeenCalled();
    });

    it("quarantines the HTML file, updates storage path, logs audit, and notifies organizer on malicious verdict", async () => {
      const handler = createScanCallbackHandler(deps);
      const body = JSON.stringify({
        scan_id: VALID_SCAN_ID,
        result: "malicious",
        notes: "Trojan detected",
      });

      const res = await handler(
        makeRequest(body, { Authorization: `Bearer ${SERVICE_KEY}` }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ processed: true });
      expect(deps.updateDesign).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        VALID_SCAN_ID,
        expect.objectContaining({
          validation_status: "failed",
          validation_notes: "Trojan detected",
          html_storage_path: "events/55555555/invite.html",
        }),
      );
      expect(deps.moveToQuarantine).toHaveBeenCalledWith(
        "events/55555555/invite.html",
        "quarantine/events/55555555/invite.html",
      );
      expect(deps.updateStoragePath).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        VALID_SCAN_ID,
        "quarantine/events/55555555/invite.html",
      );
      expect(deps.insertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          new_value: expect.objectContaining({
            validation_status: "failed",
            scan_id: VALID_SCAN_ID,
            storage_path: "quarantine/events/55555555/invite.html",
          }),
        }),
      );
      expect(deps.notifyScanFailure).toHaveBeenCalledWith({
        eventId: "55555555-5555-5555-5555-555555555555",
        scanId: VALID_SCAN_ID,
        validationNotes: "Trojan detected",
      });
    });
  });
});
