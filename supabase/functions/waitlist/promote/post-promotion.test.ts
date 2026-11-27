import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  processPromotedInvitations,
  type PostPromotionDependencies,
  type PromotedInvitationRow,
} from "./post-promotion.ts";

const EVENT_ID = "55555555-5555-5555-5555-555555555555";
const INV_1 = "11111111-1111-1111-1111-111111111111";
const INV_2 = "22222222-2222-2222-2222-222222222222";
const INV_3 = "33333333-3333-3333-3333-333333333333";
const GUEST_1 = "aaaa1111-1111-1111-1111-111111111111";
const GUEST_2 = "bbbb2222-2222-2222-2222-222222222222";
const GUEST_3 = "cccc3333-3333-3333-3333-333333333333";
const ORGANIZER_ID = "99999999-9999-9999-9999-999999999999";

const BATCH: PromotedInvitationRow[] = [
  { id: INV_1, event_id: EVENT_ID, guest_id: GUEST_1 },
  { id: INV_2, event_id: EVENT_ID, guest_id: GUEST_2 },
  { id: INV_3, event_id: EVENT_ID, guest_id: GUEST_3 },
];

const EMAILS: Record<string, string | null> = {
  [GUEST_1]: "alice@example.com",
  [GUEST_2]: "bob@example.com",
  [GUEST_3]: "cara@example.com",
};

describe("processPromotedInvitations", () => {
  let deps: PostPromotionDependencies;

  beforeEach(() => {
    deps = {
      actorType: "organizer",
      actorId: ORGANIZER_ID,
      now: () => new Date("2026-11-25T14:00:00.000Z"),
      fetchGuestEmail: vi.fn().mockImplementation(async (guestId: string) => ({
        email: EMAILS[guestId] ?? null,
        error: null,
      })),
      sendPromotionEmail: vi.fn().mockImplementation(async (email: string) => ({
        providerMessageId: `msg_${email}`,
      })),
      insertEmailLog: vi.fn().mockResolvedValue({ error: null }),
      insertAuditLog: vi.fn().mockResolvedValue({ error: null }),
    };
  });

  it("continues notifying and auditing remaining guests when one email fails mid-batch", async () => {
    deps.sendPromotionEmail = vi.fn().mockImplementation(async (email: string) => {
      if (email === "bob@example.com") {
        throw new Error("Resend returned non-OK response: 502");
      }
      return { providerMessageId: `msg_${email}` };
    });

    const summary = await processPromotedInvitations(BATCH, deps);

    expect(summary.promoted_count).toBe(3);
    expect(summary.promoted_invitation_ids).toEqual([INV_1, INV_2, INV_3]);
    expect(summary.results).toEqual([
      {
        invitation_id: INV_1,
        guest_id: GUEST_1,
        promoted: true,
        email_status: "sent",
        email_logged: true,
        audit_logged: true,
        error: null,
      },
      {
        invitation_id: INV_2,
        guest_id: GUEST_2,
        promoted: true,
        email_status: "failed",
        email_logged: true,
        audit_logged: false,
        error: "Resend returned non-OK response: 502",
      },
      {
        invitation_id: INV_3,
        guest_id: GUEST_3,
        promoted: true,
        email_status: "sent",
        email_logged: true,
        audit_logged: true,
        error: null,
      },
    ]);

    // Guest 1 and Guest 3 both received emails and audit logs; Guest 2 logged failed email.
    expect(deps.sendPromotionEmail).toHaveBeenCalledTimes(3);
    expect(deps.insertAuditLog).toHaveBeenCalledTimes(2);
    expect(deps.insertEmailLog).toHaveBeenCalledWith(
      expect.objectContaining({
        invitation_id: INV_2,
        status: "failed",
      }),
    );
  });

  it("handles missing guest email per guest without blocking later guests", async () => {
    deps.fetchGuestEmail = vi.fn().mockImplementation(async (guestId: string) => ({
      email: guestId === GUEST_1 ? null : EMAILS[guestId] ?? null,
      error: null,
    }));

    const summary = await processPromotedInvitations(BATCH.slice(0, 2), deps);

    expect(summary.promoted_count).toBe(2);
    expect(summary.promoted_invitation_ids).toEqual([INV_1, INV_2]);
    expect(summary.results[0]).toEqual({
      invitation_id: INV_1,
      guest_id: GUEST_1,
      promoted: true,
      email_status: "failed",
      email_logged: false,
      audit_logged: false,
      error: "Promoted invitation is missing guest email.",
    });
    expect(summary.results[1]).toMatchObject({
      invitation_id: INV_2,
      email_status: "sent",
      email_logged: true,
      audit_logged: true,
      error: null,
    });
  });

  it("isolates email_logs and audit_log_entries errors per guest", async () => {
    deps.insertEmailLog = vi.fn().mockImplementation(async (entry) => ({
      error: entry.invitation_id === INV_1 ? { message: "email log err" } : null,
    }));
    deps.insertAuditLog = vi.fn().mockImplementation(async (entry) => ({
      error: entry.entity_id === INV_2 ? { message: "audit log err" } : null,
    }));

    const summary = await processPromotedInvitations(BATCH, deps);

    expect(summary.promoted_count).toBe(3);
    expect(summary.results[0]).toMatchObject({
      invitation_id: INV_1,
      email_status: "sent",
      email_logged: false,
      audit_logged: true,
      error: "Email sent, but email logging failed.",
    });
    expect(summary.results[1]).toMatchObject({
      invitation_id: INV_2,
      email_status: "sent",
      email_logged: true,
      audit_logged: false,
      error: "Promotion succeeded, but audit logging failed.",
    });
    expect(summary.results[2]).toMatchObject({
      invitation_id: INV_3,
      email_status: "sent",
      email_logged: true,
      audit_logged: true,
      error: null,
    });
  });

  it("returns empty summary when no invitations were promoted", async () => {
    const summary = await processPromotedInvitations([], deps);

    expect(summary).toEqual({
      promoted_count: 0,
      promoted_invitation_ids: [],
      results: [],
    });
  });
});
