import type { components } from '../../../../contract/generated/schema'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'
import { identifierSchema } from './identifier'

type InvitationDesignCreate = components['schemas']['InvitationDesignCreate']
type InvitationImageCreate = components['schemas']['InvitationImageCreate']
type InvitationImageUpdate = components['schemas']['InvitationImageUpdate']

const designTypeSchema = z.enum(['html', 'images'])
const nullableTextSchema = z.string().trim().nullable().optional()

export const invitationDesignCreateSchema = z.object({
  event_id: identifierSchema,
  design_type: designTypeSchema,
}) satisfies z.ZodType<InvitationDesignCreate>

export const invitationImageCreateSchema = z.object({
  event_id: identifierSchema,
  storage_path: z
    .string()
    .trim()
    .min(1, 'Image path is required'),
  sort_order: z.coerce
    .number()
    .int('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater'),
  caption: nullableTextSchema,
}) satisfies z.ZodType<InvitationImageCreate>

export const invitationImageUpdateSchema = z
  .object({
    sort_order: z.coerce
      .number()
      .int('Sort order must be a whole number')
      .min(0, 'Sort order must be 0 or greater')
      .optional(),
    caption: nullableTextSchema,
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: 'At least one image field must be updated' },
  ) satisfies z.ZodType<InvitationImageUpdate>

export const invitationDesignCreateResolver = createZodResolver(
  invitationDesignCreateSchema,
)
export const invitationImageCreateResolver = createZodResolver(
  invitationImageCreateSchema,
)
export const invitationImageUpdateResolver = createZodResolver(
  invitationImageUpdateSchema,
)
