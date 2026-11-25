import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  runPostDecisionDispatch,
  type PostDecisionDependencies,
} from "./post-decision.ts";

const INVITATION_ID = "66666666-6666-6666-6666-666666666666";
const EVENT_ID = "55555555-5555-5555-5555-555555555555";
const GUEST_EMAIL = "guest@example.com";

describe("runPostDecisionDispatch", () => {
  let deps: PostDecisionDependencies;

  beforeEach(() => {
    deps = {
      countPendingAttendees: vi
        .fn()
        .mockResolvedValue({ count: 0, error: null }),
      countApprovedAttendees: vi
        .fn()
        .mockResolvedValue({ count: 1, error: null }),
      fetchNotificationRecipient: vi.fn().mockResolvedValue({
        data: { event_id: EVENT_ID, recipient_email: GUEST_EMAIL },
        error: null,
      }),
      queueStatusUpdateEmail: vi.fn().mockResolvedValue({ error: null }),
      invokeQrBundle: vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    };
  });

  it("does nothing when pending attendees still remain (e.g. A approved while B is still pending)", async () => {
    deps.countPendingAttendees = vi
      .fn()
      .mockResolvedValue({ count: 1, error: null });

    const result = await runPostDecisionDispatch(INVITATION_ID, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.fetchNotificationRecipient).not.toHaveBeenCalled();
    expect(deps.queueStatusUpdateEmail).not.toHaveBeenCalled();
    expect(deps.countApprovedAttendees).not.toHaveBeenCalled();
    expect(deps.invokeQrBundle).not.toHaveBeenCalled();
  });

  it("queues status update and invokes qr-bundle when 0 pending remain and >=1 attendee is approved (e.g. A approved, then B rejected)", async () => {
    const result = await runPostDecisionDispatch(INVITATION_ID, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.queueStatusUpdateEmail).toHaveBeenCalledWith({
      event_id: EVENT_ID,
      invitation_id: INVITATION_ID,
      recipient_email: GUEST_EMAIL,
    });
    expect(deps.invokeQrBundle).toHaveBeenCalledTimes(1);
    expect(deps.invokeQrBundle).toHaveBeenCalledWith(INVITATION_ID);
  });

  it("queues status update but skips qr-bundle when 0 pending and 0 approved attendees remain", async () => {
    deps.countApprovedAttendees = vi
      .fn()
      .mockResolvedValue({ count: 0, error: null });

    const result = await runPostDecisionDispatch(INVITATION_ID, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.queueStatusUpdateEmail).toHaveBeenCalledTimes(1);
    expect(deps.invokeQrBundle).not.toHaveBeenCalled();
  });

  it("retries qr-bundle once on 503/546 and succeeds if retry succeeds", async () => {
    deps.invokeQrBundle = vi
      .fn()
      .mockResolvedValueOnce(new Response("transient", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await runPostDecisionDispatch(INVITATION_ID, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.invokeQrBundle).toHaveBeenCalledTimes(2);
  });

  it("returns 502 when qr-bundle fails", async () => {
    deps.invokeQrBundle = vi
      .fn()
      .mockResolvedValue(new Response("boom", { status: 500 }));

    const result = await runPostDecisionDispatch(INVITATION_ID, deps);

    expect(result).toEqual({
      ok: false,
      status: 502,
      error: "Decision saved, but the QR bundle request failed.",
    });
  });

  it("returns 500 when pending count query fails", async () => {
    deps.countPendingAttendees = vi
      .fn()
      .mockResolvedValue({ count: null, error: { message: "db error" } });

    const result = await runPostDecisionDispatch(INVITATION_ID, deps);

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Decision saved, but failed to check remaining attendees.",
    });
    expect(deps.invokeQrBundle).not.toHaveBeenCalled();
  });

  it("returns 500 when approved count query fails", async () => {
    deps.countApprovedAttendees = vi
      .fn()
      .mockResolvedValue({ count: null, error: { message: "db error" } });

    const result = await runPostDecisionDispatch(INVITATION_ID, deps);

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Decision saved, but failed to check approved attendees.",
    });
    expect(deps.invokeQrBundle).not.toHaveBeenCalled();
  });
});
