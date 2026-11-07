import type { OrgSettings, OrgSettingsUpdate } from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

const orgNameSchema = z.string().trim().min(1, 'Organization name is required')
const timezoneSchema = z.string().trim().min(1, 'Default timezone is required')
const senderDomainSchema = z.string().trim().min(1, 'Sender domain is required')
const capacitySchema = z.coerce.number().int().positive()

export const orgSettingsSchema = z.object({
  id: z.string().uuid(),
  org_name: orgNameSchema,
  default_timezone: timezoneSchema,
  default_capacity_ceiling: capacitySchema,
  sender_domain: senderDomainSchema,
  malware_sandbox_enabled: z.boolean(),
  self_registration_gate_enabled: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
}) satisfies z.ZodType<OrgSettings>

export const orgSettingsUpdateSchema = z
  .object({
    org_name: orgNameSchema.optional(),
    default_timezone: timezoneSchema.optional(),
    default_capacity_ceiling: capacitySchema.optional(),
    sender_domain: senderDomainSchema.optional(),
    malware_sandbox_enabled: z.boolean().optional(),
    self_registration_gate_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one organization setting must be updated',
  }) satisfies z.ZodType<OrgSettingsUpdate>

export const orgSettingsResolver = createZodResolver(orgSettingsSchema)
export const orgSettingsUpdateResolver = createZodResolver(
  orgSettingsUpdateSchema,
)
