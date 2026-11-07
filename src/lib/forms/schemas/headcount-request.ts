import type { HeadcountIncreaseRequestCreate } from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'
import { identifierSchema } from './identifier'

export const headcountRequestCreateSchema = z.object({
  invitation_id: identifierSchema,
  requested_additional_heads: z.coerce.number().int().positive(),
  note: z.string().trim().nullable().optional(),
}) satisfies z.ZodType<HeadcountIncreaseRequestCreate>

export const headcountRequestCreateResolver = createZodResolver(
  headcountRequestCreateSchema,
)
