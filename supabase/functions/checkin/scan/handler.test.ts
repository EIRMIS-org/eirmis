import { beforeEach, describe, expect, it, vi } from "vitest";
import { signQrToken } from "../../_shared/qr-token.ts";
import { createScanHandler, type ScanDependencies } from "./handler.ts";

const now = new Date("2026-11-10T00:00:00Z");
const secret = "test-signing-secret-with-sufficient-entropy";
const claims = {
  attendee_id: "77777777-7777-7777-7777-777777777777",
  event_id: "55555555-5555-5555-5555-555555555555",
  invitation_id: "66666666-6666-6666-6666-666666666666",
};
const attendee = {
  id: claims.attendee_id,
  invitation_id: claims.invitation_id,
  full_name: "Maria Santos",
  status: "approved",
  checked_in: false,
  checked_in_at: null,
};

function request(token: string, eventId?: string): Request {
  return new Request("http://localhost/functions/v1/checkin/scan", {
    method: "POST",
    headers: { Authorization: "Bearer valid", "Content-Type": "application/json" },
    body: JSON.stringify({ qr_token: token, event_id: eventId }),
  });
}

describe("scan check-in handler", () => {
  let dependencies: ScanDependencies;
  let token: string;

  beforeEach(async () => {
    token = await signQrToken(claims, secret, { now, expiresInSeconds: 60 });
    dependencies = {
      signingSecret: secret,
      now: () => now,
      authenticate: vi.fn().mockResolvedValue("44444444-4444-4444-4444-444444444444"),
      resolveAttendee: vi.fn().mockResolvedValue(attendee),
      authorize: vi.fn().mockResolvedValue({
        actorType: "check_in_staff",
        actorId: "99999999-9999-9999-9999-999999999999",
      }),
      recordCheckIn: vi.fn().mockResolvedValue({
        result: "accepted",
        attendee: { ...attendee, checked_in: true, checked_in_at: now.toISOString() },
        checkedInAt: now.toISOString(),
        totalCheckedIn: 1,
      }),
    };
  });

  it("requires an authenticated user", async () => {
    dependencies.authenticate = vi.fn().mockResolvedValue(null);
    const response = await createScanHandler(dependencies)(request(token));
    expect(response.status).toBe(401);
    expect(dependencies.resolveAttendee).not.toHaveBeenCalled();
  });

  it("dispatches the gateway path and rejects unknown checkin routes", async () => {
    const handle = createScanHandler(dependencies);
    expect((await handle(new Request("http://local/checkin/scan", request(token)))).status).toBe(200);
    expect((await handle(new Request("http://local/checkin/other", request(token)))).status).toBe(404);
    expect(dependencies.recordCheckIn).toHaveBeenCalledTimes(1);
  });

  it("returns 422 for a tampered signature", async () => {
    const response = await createScanHandler(dependencies)(request(`${token.slice(0, -1)}x`));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "INVALID_QR_TOKEN" });
  });

  it("rejects callers outside the event authorization scope", async () => {
    dependencies.authorize = vi.fn().mockResolvedValue(null);
    const response = await createScanHandler(dependencies)(request(token));
    expect(response.status).toBe(403);
    expect(dependencies.recordCheckIn).not.toHaveBeenCalled();
  });

  it("returns invalid_token for a signed token without an approved attendee", async () => {
    dependencies.resolveAttendee = vi.fn().mockResolvedValue(null);
    const response = await createScanHandler(dependencies)(request(token));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: "invalid_token", attendee: null, checked_in_at: null, message: "Invalid QR token.",
    });
  });

  it("returns the atomic first-scan result", async () => {
    const response = await createScanHandler(dependencies)(request(token, claims.event_id));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      result: "accepted", checked_in_at: now.toISOString(), message: null,
    });
    expect(dependencies.recordCheckIn).toHaveBeenCalledWith(expect.objectContaining({
      attendeeId: claims.attendee_id,
      eventId: claims.event_id,
    }));
  });

  it("rejects a different selected event even for an organizer who owns both", async () => {
    dependencies.authorize = vi.fn().mockResolvedValue({ actorType: "organizer", actorId: "owner" });
    const response = await createScanHandler(dependencies)(request(token, "88888888-8888-8888-8888-888888888888"));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "EVENT_MISMATCH" });
    expect(dependencies.resolveAttendee).not.toHaveBeenCalled();
    expect(dependencies.recordCheckIn).not.toHaveBeenCalled();
  });

  it("preserves the database timestamp for duplicate scans", async () => {
    const originalTimestamp = "2026-11-09T23:55:00.000Z";
    dependencies.recordCheckIn = vi.fn().mockResolvedValue({
      result: "already_checked_in",
      attendee: { ...attendee, checked_in: true, checked_in_at: originalTimestamp },
      checkedInAt: originalTimestamp,
      totalCheckedIn: 1,
    });
    const response = await createScanHandler(dependencies)(request(token));
    expect(await response.json()).toMatchObject({
      result: "already_checked_in",
      checked_in_at: originalTimestamp,
      message: "This attendee was already checked in.",
    });
  });
});
