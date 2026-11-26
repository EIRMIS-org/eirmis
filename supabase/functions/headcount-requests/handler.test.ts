import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHeadcountDecisionHandler,
  type HeadcountDecisionDependencies,
  type HeadcountIncreaseRequestRow,
} from "./handler.ts";

const REQUEST_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const INVITATION_ID = "66666666-6666-6666-6666-666666666666";
const ORGANIZER_ID = "11111111-1111-1111-1111-111111111111";

function makeRequestRow(
  overrides: Partial<HeadcountIncreaseRequestRow> = {},
): HeadcountIncreaseRequestRow {
  return {
    id: REQUEST_ID,
    invitation_id: INVITATION_ID,
    requested_additional_heads: 2,
    status: "approved",
    note: "Two siblings can attend.",
    requested_at: "2026-11-01T10:00:00.000Z",
    reviewed_by: ORGANIZER_ID,
    reviewed_at: "2026-11-26T10:00:00.000Z",
    review_reason: "Extra seats arranged",
    ...overrides,
  };
}

function makeHttpRequest(
  path = `/functions/v1/headcount-requests/${REQUEST_ID}/decision`,
  body: string | undefined = JSON.stringify({
    decision: "approve",
    reason: "Extra seats arranged",
  }),
  headers: Record<string, string> = { Authorization: "Bearer valid-jwt" },
  method = "POST",
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: method === "POST" ? body : undefined,
  });
}

describe("headcount-requests decision handler", () => {
  let deps: HeadcountDecisionDependencies;

  beforeEach(() => {
    deps = {
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
      supabaseServiceRoleKey: "service-role-key",
      resendApiKey: "resend-key",
      resendFromEmail: "noreply@example.com",
      getAuthUser: vi.fn().mockResolvedValue({ userId: ORGANIZER_ID, error: null }),
      decideHeadcountRequest: vi.fn().mockResolvedValue({
        data: {
          request: makeRequestRow(),
          old_max_party_size: 2,
          new_max_party_size: 4,
        },
        error: null,
      }),
      notifyGuestDecision: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("calls decideHeadcountRequest RPC, notifies guest with locked party size limits, and returns the updated request", async () => {
    const handler = createHeadcountDecisionHandler(deps);

    const res = await handler(makeHttpRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(makeRequestRow());
    expect(deps.decideHeadcountRequest).toHaveBeenCalledWith({
      requestId: REQUEST_ID,
      decision: "approve",
      actorId: ORGANIZER_ID,
      reason: "Extra seats arranged",
    });
    expect(deps.notifyGuestDecision).toHaveBeenCalledWith({
      request: makeRequestRow(),
      decision: "approve",
      oldMaxPartySize: 2,
      newMaxPartySize: 4,
      reason: "Extra seats arranged",
    });
  });

  it("handles reject decision and trims blank reasons to null", async () => {
    const rejectedRow = makeRequestRow({
      status: "rejected",
      review_reason: null,
    });
    deps.decideHeadcountRequest = vi.fn().mockResolvedValue({
      data: {
        request: rejectedRow,
        old_max_party_size: 2,
        new_max_party_size: 2,
      },
      error: null,
    });
    const handler = createHeadcountDecisionHandler(deps);

    const res = await handler(
      makeHttpRequest(
        undefined,
        JSON.stringify({ decision: "reject", reason: "   " }),
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rejectedRow);
    expect(deps.decideHeadcountRequest).toHaveBeenCalledWith({
      requestId: REQUEST_ID,
      decision: "reject",
      actorId: ORGANIZER_ID,
      reason: null,
    });
  });

  describe("request validation and auth", () => {
    it("allows OPTIONS preflight and rejects non-POST methods with 405", async () => {
      const handler = createHeadcountDecisionHandler(deps);

      const optRes = await handler(makeHttpRequest(undefined, undefined, {}, "OPTIONS"));
      expect(optRes.status).toBe(200);

      const getRes = await handler(makeHttpRequest(undefined, undefined, {}, "GET"));
      expect(getRes.status).toBe(405);
      expect(await getRes.json()).toMatchObject({ code: "METHOD_NOT_ALLOWED" });
    });

    it("returns 401 when Authorization header is missing or invalid", async () => {
      const handler = createHeadcountDecisionHandler(deps);

      const missingRes = await handler(makeHttpRequest(undefined, undefined, {}));
      expect(missingRes.status).toBe(401);

      deps.getAuthUser = vi.fn().mockResolvedValue({
        userId: null,
        error: { message: "Invalid JWT" },
      });
      const invalidRes = await handler(makeHttpRequest());
      expect(invalidRes.status).toBe(401);
      expect(deps.decideHeadcountRequest).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid request ID, malformed JSON, invalid decision, or non-string reason", async () => {
      const handler = createHeadcountDecisionHandler(deps);

      const badIdRes = await handler(
        makeHttpRequest("/functions/v1/headcount-requests/not-a-uuid/decision"),
      );
      expect(badIdRes.status).toBe(400);

      const badJsonRes = await handler(makeHttpRequest(undefined, "{bad"));
      expect(badJsonRes.status).toBe(400);
      expect(await badJsonRes.json()).toMatchObject({ code: "INVALID_JSON" });

      const badDecisionRes = await handler(
        makeHttpRequest(undefined, JSON.stringify({ decision: "maybe" })),
      );
      expect(badDecisionRes.status).toBe(400);

      const badReasonRes = await handler(
        makeHttpRequest(
          undefined,
          JSON.stringify({ decision: "approve", reason: 123 }),
        ),
      );
      expect(badReasonRes.status).toBe(400);
      expect(deps.decideHeadcountRequest).not.toHaveBeenCalled();
    });
  });

  describe("RPC error mapping", () => {
    it.each([
      {
        label: "invalid parameter (22023)",
        rpcError: { message: "INVALID_HEADCOUNT_DECISION", code: "22023" },
        expectedStatus: 400,
        expectedCode: "INVALID_REQUEST",
      },
      {
        label: "unauthorized organizer (42501)",
        rpcError: { message: "ORGANIZER_NOT_AUTHORIZED", code: "42501" },
        expectedStatus: 403,
        expectedCode: "FORBIDDEN",
      },
      {
        label: "missing request (P0002)",
        rpcError: { message: "HEADCOUNT_REQUEST_NOT_FOUND", code: "P0002" },
        expectedStatus: 404,
        expectedCode: "NOT_FOUND",
      },
      {
        label: "already decided (P0001)",
        rpcError: { message: "HEADCOUNT_REQUEST_NOT_PENDING", code: "P0001" },
        expectedStatus: 409,
        expectedCode: "ALREADY_DECIDED",
      },
      {
        label: "audit insert or unexpected DB failure",
        rpcError: { message: "audit_log_entries insert failed", code: "23514" },
        expectedStatus: 500,
        expectedCode: "INTERNAL_ERROR",
      },
    ])(
      "maps $label to HTTP $expectedStatus ($expectedCode) without notifying guest",
      async ({ rpcError, expectedStatus, expectedCode }) => {
        deps.decideHeadcountRequest = vi.fn().mockResolvedValue({
          data: null,
          error: rpcError,
        });
        const handler = createHeadcountDecisionHandler(deps);

        const res = await handler(makeHttpRequest());
        expect(res.status).toBe(expectedStatus);
        expect(await res.json()).toMatchObject({ code: expectedCode });
        expect(deps.notifyGuestDecision).not.toHaveBeenCalled();
      },
    );

    it("still returns 200 if post-decision email notification throws", async () => {
      deps.notifyGuestDecision = vi
        .fn()
        .mockRejectedValue(new Error("Resend timeout"));
      const handler = createHeadcountDecisionHandler(deps);

      const res = await handler(makeHttpRequest());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(makeRequestRow());
    });
  });
});
