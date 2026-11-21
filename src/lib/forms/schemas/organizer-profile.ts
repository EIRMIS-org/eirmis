import type { components } from '../../../../contract/generated/schema'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

type OrganizerProfileUpdate = components['schemas']['OrganizerProfileUpdate']

export const organizerProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(120, 'Display name must be 120 characters or fewer'),
}) satisfies z.ZodType<OrganizerProfileUpdate>

export const organizerProfileUpdateResolver = createZodResolver(
  organizerProfileUpdateSchema,
)
