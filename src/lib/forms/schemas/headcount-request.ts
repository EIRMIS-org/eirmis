import type { HeadcountIncreaseRequestCreate } from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

export const headcountRequestCreateSchema = z.object({
  invitation_id: z.string().uuid(),
  requested_additional_heads: z.coerce.number().int().positive(),
  note: z.string().trim().nullable().optional(),
}) satisfies z.ZodType<HeadcountIncreaseRequestCreate>

export const headcountRequestCreateResolver = createZodResolver(
  headcountRequestCreateSchema,
)
