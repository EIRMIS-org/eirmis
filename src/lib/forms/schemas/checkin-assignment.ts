import type { components } from '../../../../contract/generated/schema'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'
import { identifierSchema } from './identifier'

type CheckInAssignmentCreate = components['schemas']['CheckInAssignmentCreate']

export const checkInAssignmentCreateSchema = z.object({
  event_id: identifierSchema,
  staff_email: z
    .string()
    .trim()
    .min(1, 'Staff email is required')
    .email('Enter a valid email address'),
}) satisfies z.ZodType<CheckInAssignmentCreate>

export const checkInAssignmentCreateResolver = createZodResolver(
  checkInAssignmentCreateSchema,
)
