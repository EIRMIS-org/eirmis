import type { RegisterPublicRequest } from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

export const registerPublicSchema = z.object({
  event_id: z.string().uuid(),
  email: z.string().trim().email('Enter a valid email address'),
  full_name: z.string().trim().min(1, 'Full name is required'),
}) satisfies z.ZodType<RegisterPublicRequest>

export const registerPublicResolver = createZodResolver(registerPublicSchema)
