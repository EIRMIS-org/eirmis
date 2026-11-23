import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

export const guestProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(120, 'Full name must be 120 characters or fewer'),
})

export const guestProfileUpdateResolver = createZodResolver(
  guestProfileUpdateSchema,
)
