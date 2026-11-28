import { describe, expect, it } from 'vitest';
import { reminderScheduleUpsertSchema } from './reminder-schedule';

const valid = { event_id: '55555555-5555-5555-5555-555555555555', days_before_event: 1 };

describe('reminder schedule validation', () => {
    it.each([0, -1, 1.5, 366])('rejects invalid day offset %s', (days) => {
        expect(reminderScheduleUpsertSchema.safeParse({ ...valid, days_before_event: days }).success).toBe(false);
    });
    it.each([1, 7, 365])('accepts day offset %s', (days) => {
        expect(reminderScheduleUpsertSchema.safeParse({ ...valid, days_before_event: days }).success).toBe(true);
    });
    it.each(['00:00', '09:00', '09:00:00', '23:59:59'])('accepts time %s', (time) => {
        expect(reminderScheduleUpsertSchema.parse({ ...valid, send_time_of_day: time }).send_time_of_day).toBe(time);
    });
    it.each(['24:00', '12:60', '09:00:60', '9:00', '09:00:'])('rejects time %s', (time) => {
        expect(reminderScheduleUpsertSchema.safeParse({ ...valid, send_time_of_day: time }).success).toBe(false);
    });
});
