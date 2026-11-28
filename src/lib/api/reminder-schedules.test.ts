import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { API_BASE, listReminderSchedules, setRole, updateReminderSchedule, upsertReminderSchedule } from './index';
import { server } from '@/mocks/server';
import { resetMockOrganizerState } from '@/mocks/handlers';

const eventId = '55555555-5555-5555-5555-555555555555';

describe('reminder schedule transport', () => {
    beforeAll(() => server.listen());
    afterEach(() => { resetMockOrganizerState(); server.resetHandlers(); setRole('organizer'); });
    afterAll(() => server.close());

    it('updates time and day in place and preserves untouched fields', async () => {
        const [original, ...remaining] = await listReminderSchedules(eventId);
        expect(await updateReminderSchedule(original.id, { send_time_of_day: '10:30:15' }))
            .toEqual([{ ...original, send_time_of_day: '10:30:15' }]);
        await updateReminderSchedule(original.id, { days_before_event: 4 });
        expect(await listReminderSchedules(eventId)).toEqual([
            { ...original, days_before_event: 4, send_time_of_day: '10:30:15' }, ...remaining,
        ]);
    });

    it('merges creates by event/day while keeping different events independent', async () => {
        const [original, ...remaining] = await listReminderSchedules(eventId);
        const [merged] = await upsertReminderSchedule({ event_id: eventId, days_before_event: 7, enabled: false });
        expect(merged).toEqual({ ...original, enabled: false });
        expect(remaining).toHaveLength(1);
        expect(await listReminderSchedules(eventId)).toHaveLength(2);
        const otherEvent = '55555555-5555-5555-5555-555555555599';
        const [other] = await upsertReminderSchedule({ event_id: otherEvent, days_before_event: 7 });
        expect(other.id).not.toBe(original.id);
        expect(await listReminderSchedules(otherEvent)).toEqual([other]);
    });

    it('rejects an occupied day without changing either schedule', async () => {
        const [created] = await upsertReminderSchedule({ event_id: eventId, days_before_event: 3 });
        const before = await listReminderSchedules(eventId);
        await expect(updateReminderSchedule(created.id, { days_before_event: 7 }))
            .rejects.toMatchObject({ status: 409, code: '23505' });
        expect(await listReminderSchedules(eventId)).toEqual(before);
    });

    it.each([
        ['', 'return=representation'],
        ['', 'resolution=merge-duplicates,return=representation'],
        ['?on_conflict=event_id,days_before_event', 'return=representation'],
    ])('rejects duplicate POST without both upsert options (%s, %s)', async (query, prefer) => {
        const response = await fetch(`${API_BASE}/rest/v1/reminder_schedules${query}`, {
            method: 'POST',
            headers: { Authorization: 'Bearer fake-organizer-jwt', 'Content-Type': 'application/json', Prefer: prefer },
            body: JSON.stringify({ event_id: eventId, days_before_event: 7 }),
        });
        expect(response.status).toBe(409);
        expect(await listReminderSchedules(eventId)).toHaveLength(2);
    });

    it('returns no rows for a missing ID and requires authentication', async () => {
        expect(await updateReminderSchedule('00000000-0000-0000-0000-000000000000', { enabled: false })).toEqual([]);
        setRole('public');
        await expect(updateReminderSchedule('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', { enabled: false }))
            .rejects.toMatchObject({ status: 401 });
    });
});

