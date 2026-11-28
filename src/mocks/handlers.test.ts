// @vitest-environment jsdom

/**
 * MSW strictness tests (Issue 07 — Blocking 1 & 2).
 *
 * Real PostgREST rejects:
 *   - filters without a valid operator (`?invitation_id=<uuid>` → PGRST100)
 *   - unknown columns (`?event_id=eq.<id>` on attendees → 42703)
 *
 * The mock handlers must mirror both behaviors so contract violations surface
 * in tests instead of being silently swallowed.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setRole } from "@/lib/api";
import { resetMockOrganizerState } from "@/mocks/handlers";
import { server } from "@/mocks/server";

const INVITATION_ID = "66666666-6666-6666-6666-666666666666";
const EVENT_ID = "55555555-5555-5555-5555-555555555555";

async function getJson(path: string): Promise<Response> {
    return fetch(`http://127.0.0.1:4010${path}`, {
        headers: { Authorization: "Bearer fake-organizer-jwt" },
    });
}

describe("MSW strict PostgREST filter validation", () => {
    beforeAll(() => server.listen());

    afterEach(() => {
        resetMockOrganizerState();
        server.resetHandlers();
    });

    afterAll(() => server.close());

    it("returns 400 PGRST100 for ?invitation_id=<uuid> without eq. operator", async () => {
        setRole("organizer");
        const response = await getJson(
            `/rest/v1/attendees?invitation_id=${INVITATION_ID}`,
        );

        expect(response.status).toBe(400);
        const body = (await response.json()) as { code?: string };
        expect(body.code).toBe("PGRST100");
    });

    it("returns 400 PGRST100 for ?status=pending without eq. operator", async () => {
        setRole("organizer");
        const response = await getJson(
            "/rest/v1/headcount_increase_requests?status=pending",
        );

        expect(response.status).toBe(400);
        const body = (await response.json()) as { code?: string };
        expect(body.code).toBe("PGRST100");
    });

    it("returns 400 42703 for GET /rest/v1/attendees?event_id=eq.<id> (column does not exist)", async () => {
        setRole("organizer");
        const response = await getJson(
            `/rest/v1/attendees?event_id=eq.${EVENT_ID}`,
        );

        expect(response.status).toBe(400);
        const body = (await response.json()) as { code?: string };
        expect(body.code).toBe("42703");
    });

    it("accepts operator-valid filters (eq. and in.) on attendees", async () => {
        setRole("organizer");

        const eqResponse = await getJson(
            `/rest/v1/attendees?invitation_id=eq.${INVITATION_ID}`,
        );
        expect(eqResponse.status).toBe(200);

        const inResponse = await getJson(
            `/rest/v1/attendees?invitation_id=in.(${INVITATION_ID})`,
        );
        expect(inResponse.status).toBe(200);
    });
});
