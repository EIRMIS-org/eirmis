export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface HeadcountIncreaseRequestRow {
  id: string;
  invitation_id: string;
  requested_additional_heads: number;
  status: string;
  note: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
}

export interface HeadcountDecisionRpcResult {
  request: HeadcountIncreaseRequestRow;
  old_max_party_size: number;
  new_max_party_size: number;
}

export interface HeadcountDecisionDependencies {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  resendApiKey: string | undefined;
  resendFromEmail: string | undefined;
  getAuthUser: (authorization: string) => Promise<{
    userId: string | null;
    error: { message: string } | null;
  }>;
  decideHeadcountRequest: (params: {
    requestId: string;
    decision: "approve" | "reject";
    actorId: string;
    reason: string | null;
  }) => Promise<{
    data: HeadcountDecisionRpcResult | null;
    error: { message: string; code?: string | null } | null;
  }>;
  notifyGuestDecision?: (params: {
    request: HeadcountIncreaseRequestRow;
    decision: "approve" | "reject";
    oldMaxPartySize: number;
    newMaxPartySize: number;
    reason: string | null;
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

function mapRpcError(error: { message: string; code?: string | null }): Response {
  const message = error.message || "";
  const code = error.code || "";

  if (
    code === "22023" ||
    message.includes("REQUEST_ID_REQUIRED") ||
    message.includes("ACTOR_ID_REQUIRED") ||
    message.includes("INVALID_HEADCOUNT_DECISION")
  ) {
    return errorResponse("INVALID_REQUEST", "Invalid headcount decision request.", 400);
  }

  if (code === "42501" || message.includes("ORGANIZER_NOT_AUTHORIZED")) {
    return errorResponse("FORBIDDEN", "Forbidden.", 403);
  }

  if (
    code === "P0002" ||
    message.includes("HEADCOUNT_REQUEST_NOT_FOUND") ||
    message.includes("INVITATION_NOT_FOUND") ||
    message.includes("EVENT_NOT_FOUND")
  ) {
    return errorResponse("NOT_FOUND", "Headcount request not found.", 404);
  }

  if (message.includes("HEADCOUNT_REQUEST_NOT_PENDING")) {
    return errorResponse(
      "ALREADY_DECIDED",
      "This request has already been decided.",
      409,
    );
  }

  return errorResponse(
    "INTERNAL_ERROR",
    "Failed to process headcount request decision.",
    500,
  );
}

export function createHeadcountDecisionHandler(
  deps: HeadcountDecisionDependencies,
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
    if (
      !deps.supabaseUrl ||
      !deps.supabaseAnonKey ||
      !deps.supabaseServiceRoleKey ||
      !deps.resendApiKey ||
      !deps.resendFromEmail
    ) {
      console.error("Headcount decision function is missing required configuration.");
      return errorResponse("FUNCTION_NOT_CONFIGURED", "Function is not configured.", 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
    }

    // ── Parse path parameter ────────────────────────────────────────────
    const requestId = new URL(req.url).pathname.match(
      /\/headcount-requests\/([^/]+)\/decision\/?$/,
    )?.[1];

    if (!requestId || !uuidPattern.test(requestId)) {
      return errorResponse(
        "INVALID_REQUEST",
        "A valid headcount request ID is required.",
        400,
      );
    }

    // ── Parse & validate body ───────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
    }

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("decision" in body) ||
      (body.decision !== "approve" && body.decision !== "reject")
    ) {
      return errorResponse(
        "INVALID_REQUEST",
        "decision must be either 'approve' or 'reject'.",
        400,
      );
    }

    const rawReason = "reason" in body ? body.reason : undefined;
    if (
      rawReason !== undefined &&
      rawReason !== null &&
      typeof rawReason !== "string"
    ) {
      return errorResponse(
        "INVALID_REQUEST",
        "reason must be a string or null.",
        400,
      );
    }

    const reason =
      typeof rawReason === "string" ? rawReason.trim() || null : null;
    const decision = body.decision;

    // ── Authenticate caller ─────────────────────────────────────────────
    const { userId, error: authError } = await deps.getAuthUser(authorization);
    if (authError || !userId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
    }

    // ── Execute atomic database decision RPC ────────────────────────────
    const { data, error: rpcError } = await deps.decideHeadcountRequest({
      requestId,
      decision,
      actorId: userId,
      reason,
    });

    if (rpcError) {
      console.error(
        "Failed to process headcount request decision:",
        rpcError.message,
        rpcError.code,
      );
      return mapRpcError(rpcError);
    }

    if (!data || !data.request) {
      console.error("decide_headcount_request RPC returned an empty payload.");
      return errorResponse(
        "INTERNAL_ERROR",
        "Failed to process headcount request decision.",
        500,
      );
    }

    // ── Post-decision guest notification (non-fatal) ────────────────────
    if (deps.notifyGuestDecision) {
      try {
        await deps.notifyGuestDecision({
          request: data.request,
          decision,
          oldMaxPartySize: data.old_max_party_size,
          newMaxPartySize: data.new_max_party_size,
          reason,
        });
      } catch (notifyErr) {
        console.error(
          "Unexpected error while sending headcount decision notification:",
          notifyErr,
        );
      }
    }

    return jsonResponse(data.request, 200);
  };
}
