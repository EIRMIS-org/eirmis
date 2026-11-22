import type { ReminderScheduleUpsert } from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'
import { identifierSchema } from './identifier'

const timeOfDaySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM format (e.g. 09:00)')

export const reminderScheduleUpsertSchema = z.object({
  event_id: identifierSchema,
  days_before_event: z.coerce
    .number()
    .int('Days before event must be a whole number')
    .min(0, 'Days before event must be 0 or greater')
    .max(365, 'Days before event must be 365 or fewer'),
  send_time_of_day: timeOfDaySchema.optional(),
  enabled: z.boolean().optional(),
}) satisfies z.ZodType<ReminderScheduleUpsert>

export const reminderScheduleUpsertResolver = createZodResolver(
  reminderScheduleUpsertSchema,
)
