import type { AttendeeCreate, AttendeeUpdate } from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

const optionalEmailSchema = z
  .union([z.string().trim().email(), z.literal('')])
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()

export const attendeeCreateSchema = z.object({
  invitation_id: z.string().uuid(),
  full_name: z.string().trim().min(1, 'Attendee name is required'),
  email: optionalEmailSchema,
}) satisfies z.ZodType<AttendeeCreate>

export const attendeeUpdateSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Attendee name is required').optional(),
    email: optionalEmailSchema,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one attendee field must be updated',
  }) satisfies z.ZodType<AttendeeUpdate>

export const attendeeCreateResolver = createZodResolver(attendeeCreateSchema)
export const attendeeUpdateResolver = createZodResolver(attendeeUpdateSchema)
