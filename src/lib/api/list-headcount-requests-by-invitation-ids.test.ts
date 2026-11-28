import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
    HEADCOUNT_IN_LIST_CHUNK_SIZE,
    listHeadcountRequestsByInvitationIds,
    setRole,
    type HeadcountIncreaseRequest,
} from './index';
import { server } from '@/mocks/server';

function makeUuid(index: number): string {
    return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function makeHeadcountRequest(index: number, invitationId: string): HeadcountIncreaseRequest {
    return {
        id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        invitation_id: invitationId,
        requested_additional_heads: 2,
        note: `Need seats ${index}`,
        status: 'pending',
        requested_at: '2026-10-05T14:00:00+08:00',
        reviewed_by: null,
        reviewed_at: null,
        review_reason: null,
    };
}

function parseInList(filter: string | null): string[] {
    if (!filter || !filter.startsWith('in.(') || !filter.endsWith(')')) {
        return [];
    }
    return filter
        .slice(4, -1)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
}

describe('listHeadcountRequestsByInvitationIds', () => {
    beforeAll(() => server.listen());

    afterEach(() => {
        server.resetHandlers();
        setRole('organizer');
    });

    afterAll(() => {
        server.close();
    });

    it('chunks 200 invitation IDs into multiple bounded requests and merges all requests', async () => {
        setRole('organizer');

        const invitationIds = Array.from({ length: 200 }, (_, i) => makeUuid(i + 1));
        const allRequests = invitationIds.map((invId, i) => makeHeadcountRequest(i + 1, invId));
        const capturedChunkSizes: number[] = [];

        server.use(
            http.get('*/rest/v1/headcount_increase_requests', ({ request }) => {
                const url = new URL(request.url);
                const ids = parseInList(url.searchParams.get('invitation_id'));
                capturedChunkSizes.push(ids.length);

                const idSet = new Set(ids);
                return HttpResponse.json(
                    allRequests.filter((req) => idSet.has(req.invitation_id)),
                );
            }),
        );

        const result = await listHeadcountRequestsByInvitationIds(invitationIds);

        expect(capturedChunkSizes).toHaveLength(3);
        expect(
            capturedChunkSizes.slice().sort((a, b) => b - a),
        ).toEqual([75, 75, 50]);
        for (const size of capturedChunkSizes) {
            expect(size).toBeLessThanOrEqual(HEADCOUNT_IN_LIST_CHUNK_SIZE);
        }

        expect(result).toHaveLength(200);
    });

    it('respects a custom chunkSize parameter', async () => {
        setRole('organizer');

        const invitationIds = Array.from({ length: 100 }, (_, i) => makeUuid(i + 1));
        const allRequests = invitationIds.map((invId, i) => makeHeadcountRequest(i + 1, invId));
        const customChunkSize = 25;
        const capturedChunkSizes: number[] = [];

        server.use(
            http.get('*/rest/v1/headcount_increase_requests', ({ request }) => {
                const url = new URL(request.url);
                const ids = parseInList(url.searchParams.get('invitation_id'));
                capturedChunkSizes.push(ids.length);

                const idSet = new Set(ids);
                return HttpResponse.json(
                    allRequests.filter((req) => idSet.has(req.invitation_id)),
                );
            }),
        );

        const result = await listHeadcountRequestsByInvitationIds(invitationIds, customChunkSize);

        expect(capturedChunkSizes).toHaveLength(4);
        for (const size of capturedChunkSizes) {
            expect(size).toBe(customChunkSize);
        }
        expect(result).toHaveLength(100);
    });

    it('deduplicates duplicate invitation IDs and strips empty values', async () => {
        setRole('organizer');

        const inv1 = makeUuid(1);
        const inv2 = makeUuid(2);
        const allRequests = [
            makeHeadcountRequest(1, inv1),
            makeHeadcountRequest(2, inv2),
        ];
        let requestCount = 0;

        server.use(
            http.get('*/rest/v1/headcount_increase_requests', ({ request }) => {
                requestCount += 1;
                const url = new URL(request.url);
                const ids = parseInList(url.searchParams.get('invitation_id'));
                const idSet = new Set(ids);
                return HttpResponse.json(
                    allRequests.filter((req) => idSet.has(req.invitation_id)),
                );
            }),
        );

        const result = await listHeadcountRequestsByInvitationIds([inv1, inv1, inv2, ''], 1);

        expect(requestCount).toBe(2);
        expect(result).toHaveLength(2);
    });

    it('returns an empty array immediately when invitationIds is empty', async () => {
        setRole('organizer');

        let requestMade = false;
        server.use(
            http.get('*/rest/v1/headcount_increase_requests', () => {
                requestMade = true;
                return HttpResponse.json([]);
            }),
        );

        const result = await listHeadcountRequestsByInvitationIds([]);

        expect(result).toEqual([]);
        expect(requestMade).toBe(false);
    });
});
