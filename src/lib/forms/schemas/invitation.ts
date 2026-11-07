import type {
  InvitationCreate,
  InvitationOrganizerUpdate,
  InvitationRsvpUpdate,
} from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

const invitationStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'tentative',
  'waitlisted',
])
const nullableTextSchema = z.string().trim().nullable().optional()
const hasDefinedField = (value: object) =>
  Object.values(value).some((field) => field !== undefined)

export const invitationCreateSchema = z.object({
  event_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  max_party_size: z.coerce.number().int().positive().optional(),
  status: invitationStatusSchema.optional(),
  dietary_preference: nullableTextSchema,
  special_requests: nullableTextSchema,
}) satisfies z.ZodType<InvitationCreate>

export const invitationRsvpUpdateSchema = z
  .object({
    status: invitationStatusSchema.optional(),
    dietary_preference: nullableTextSchema,
    special_requests: nullableTextSchema,
  })
  .refine(hasDefinedField, {
    message: 'At least one RSVP field must be updated',
  }) satisfies z.ZodType<InvitationRsvpUpdate>

export const invitationOrganizerUpdateSchema = z
  .object({
    max_party_size: z.coerce.number().int().positive().optional(),
    status: invitationStatusSchema.optional(),
  })
  .refine(hasDefinedField, {
    message: 'At least one invitation field must be updated',
  }) satisfies z.ZodType<InvitationOrganizerUpdate>

export const invitationCreateResolver = createZodResolver(
  invitationCreateSchema,
)
export const invitationRsvpUpdateResolver = createZodResolver(
  invitationRsvpUpdateSchema,
)
export const invitationOrganizerUpdateResolver = createZodResolver(
  invitationOrganizerUpdateSchema,
)
