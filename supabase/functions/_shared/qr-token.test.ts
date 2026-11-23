import { describe, expect, it } from "vitest";
import { signQrToken, verifyQrToken } from "./qr-token.ts";

const claims = {
  attendee_id: "77777777-7777-7777-7777-777777777777",
  event_id: "55555555-5555-5555-5555-555555555555",
  invitation_id: "66666666-6666-6666-6666-666666666666",
};
const secret = "test-signing-secret-with-sufficient-entropy";
const now = new Date("2026-11-10T00:00:00Z");

describe("QR token signing", () => {
  it("round-trips event-bound attendee claims", async () => {
    const token = await signQrToken(claims, secret, { now, expiresInSeconds: 60 });
    await expect(verifyQrToken(token, secret, { now })).resolves.toMatchObject(claims);
  });

  it("rejects a tampered payload", async () => {
    const token = await signQrToken(claims, secret, { now });
    const segments = token.split(".");
    segments[1] = `${segments[1].slice(0, -1)}${segments[1].endsWith("a") ? "b" : "a"}`;
    await expect(verifyQrToken(segments.join("."), secret, { now })).rejects.toThrow("signature");
  });

  it("rejects an expired token", async () => {
    const token = await signQrToken(claims, secret, { now, expiresInSeconds: 1 });
    const later = new Date(now.getTime() + 1_000);
    await expect(verifyQrToken(token, secret, { now: later })).rejects.toThrow("expired");
  });
});
