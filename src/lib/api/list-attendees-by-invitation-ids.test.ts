import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
    ATTENDEE_IN_LIST_CHUNK_SIZE,
    listAttendeesByInvitationIds,
    setRole,
    type Attendee,
} from './index';
import { server } from '@/mocks/server';

function makeUuid(index: number): string {
    return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function makeAttendee(index: number, invitationId: string): Attendee {
    return {
        id: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        invitation_id: invitationId,
        full_name: `Attendee ${index}`,
        email: `attendee-${index}@example.com`,
        is_primary: true,
        status: 'approved',
        submitted_at: '2026-10-05T14:00:00+08:00',
        reviewed_by: null,
        reviewed_at: null,
        review_reason: null,
        qr_token: `qr-${index}`,
        checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
        is_walk_in: false,
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

describe('listAttendeesByInvitationIds', () => {
    beforeAll(() => server.listen());

    afterEach(() => {
        server.resetHandlers();
        setRole('organizer');
    });

    afterAll(() => server.close());

    it('chunks 200 invitation IDs into multiple bounded requests and merges all attendees', async () => {
        setRole('organizer');
        const invitationIds = Array.from({ length: 200 }, (_, i) => makeUuid(i + 1));
        const allAttendees = invitationIds.map((invId, i) => makeAttendee(i + 1, invId));
        const observedChunks: string[][] = [];
        const observedUrlLengths: number[] = [];

        server.use(
            http.get('*/rest/v1/attendees', ({ request }) => {
                observedUrlLengths.push(request.url.length);
                const filter = new URL(request.url).searchParams.get('invitation_id');
                const ids = parseInList(filter);
                observedChunks.push(ids);
                const idSet = new Set(ids);
                return HttpResponse.json(
                    allAttendees.filter((attendee) => idSet.has(attendee.invitation_id)),
                );
            }),
        );

        const result = await listAttendeesByInvitationIds(invitationIds);

        expect(observedChunks).toHaveLength(
            Math.ceil(invitationIds.length / ATTENDEE_IN_LIST_CHUNK_SIZE),
        );
        expect(
            observedChunks.map((chunk) => chunk.length).sort((a, b) => b - a),
        ).toEqual([75, 75, 50]);
        for (const chunk of observedChunks) {
            expect(chunk.length).toBeLessThanOrEqual(ATTENDEE_IN_LIST_CHUNK_SIZE);
        }
        for (const urlLength of observedUrlLengths) {
            expect(urlLength).toBeLessThan(4096);
        }
        expect(result).toHaveLength(200);
        expect(new Set(result.map((a) => a.id)).size).toBe(200);
    });

    it('deduplicates repeated invitation IDs and overlapping attendee rows across chunks', async () => {
        setRole('organizer');
        const inv1 = makeUuid(1);
        const inv2 = makeUuid(2);
        const sharedAttendee = makeAttendee(1, inv1);
        const secondAttendee = makeAttendee(2, inv2);
        const observedChunks: string[][] = [];

        server.use(
            http.get('*/rest/v1/attendees', ({ request }) => {
                const ids = parseInList(
                    new URL(request.url).searchParams.get('invitation_id'),
                );
                observedChunks.push(ids);
                // Intentionally return sharedAttendee in every chunk to test deduplication
                return HttpResponse.json(
                    ids.includes(inv2)
                        ? [sharedAttendee, secondAttendee]
                        : [sharedAttendee],
                );
            }),
        );

        const result = await listAttendeesByInvitationIds([inv1, inv1, inv2, ''], 1);

        expect(observedChunks).toHaveLength(2);
        expect(observedChunks).toEqual(expect.arrayContaining([[inv1], [inv2]]));
        expect(result).toHaveLength(2);
        expect(result).toEqual(
            expect.arrayContaining([sharedAttendee, secondAttendee]),
        );
    });

    it('returns an empty array without making HTTP requests when given no invitation IDs', async () => {
        let requestCount = 0;
        server.use(
            http.get('*/rest/v1/attendees', () => {
                requestCount += 1;
                return HttpResponse.json([]);
            }),
        );

        const result = await listAttendeesByInvitationIds([]);

        expect(result).toEqual([]);
        expect(requestCount).toBe(0);
    });

    it('respects a custom chunkSize parameter', async () => {
        const invitationIds = Array.from({ length: 200 }, (_, i) => makeUuid(i + 1));
        const chunkSizes: number[] = [];

        server.use(
            http.get('*/rest/v1/attendees', ({ request }) => {
                const ids = parseInList(
                    new URL(request.url).searchParams.get('invitation_id'),
                );
                chunkSizes.push(ids.length);
                return HttpResponse.json([]);
            }),
        );

        await listAttendeesByInvitationIds(invitationIds, 50);

        expect(chunkSizes).toEqual([50, 50, 50, 50]);
    });
});
