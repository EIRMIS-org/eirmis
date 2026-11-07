import type { EventCreate, EventUpdate } from '@/lib/api'
import { z } from 'zod'

import { createZodResolver } from '../zod-resolver'

const eventStatusSchema = z.enum(['draft', 'published', 'closed', 'archived'])
const eventVisibilitySchema = z.enum(['open_registration', 'invite_only'])
const dateTimeSchema = z.string().datetime({ offset: true })
const nullableTextSchema = z.string().trim().nullable().optional()
const slugSchema = z
  .string()
  .trim()
  .min(1, 'Event slug is required')
  .regex(
    /^[A-Za-z0-9._~-]+$/,
    'Event slug may only contain URL-safe letters, numbers, dots, underscores, tildes, and hyphens',
  )

const eventShape = {
  title: z.string().trim().min(1, 'Event title is required'),
  slug: slugSchema,
  description: nullableTextSchema,
  cover_image_url: nullableTextSchema,
  starts_at: dateTimeSchema,
  ends_at: dateTimeSchema,
  event_timezone: z.string().trim().min(1, 'Event timezone is required'),
  venue_name: nullableTextSchema,
  address: nullableTextSchema,
  city: nullableTextSchema,
  location_url: nullableTextSchema,
  capacity: z.coerce.number().int().positive(),
  rsvp_deadline: dateTimeSchema,
  visibility_mode: eventVisibilitySchema,
  status: eventStatusSchema.optional(),
} as const

function validateChronology(
  value: { starts_at?: string; ends_at?: string; rsvp_deadline?: string },
  context: z.RefinementCtx,
) {
  if (value.starts_at && value.rsvp_deadline &&
      Date.parse(value.rsvp_deadline) > Date.parse(value.starts_at)) {
    context.addIssue({
      code: 'custom',
      path: ['rsvp_deadline'],
      message: 'RSVP deadline must be at or before the start time',
    })
  }
  if (
    value.starts_at !== undefined &&
    value.ends_at !== undefined &&
    Date.parse(value.ends_at) <= Date.parse(value.starts_at)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['ends_at'],
      message: 'End time must be after the start time',
    })
  }
}

export const eventCreateSchema = z
  .object(eventShape)
  .superRefine(validateChronology) satisfies z.ZodType<EventCreate>

export const eventUpdateSchema = z
  .object({
    title: eventShape.title.optional(),
    slug: eventShape.slug.optional(),
    description: eventShape.description,
    cover_image_url: eventShape.cover_image_url,
    starts_at: eventShape.starts_at.optional(),
    ends_at: eventShape.ends_at.optional(),
    event_timezone: eventShape.event_timezone.optional(),
    venue_name: eventShape.venue_name,
    address: eventShape.address,
    city: eventShape.city,
    location_url: eventShape.location_url,
    capacity: eventShape.capacity.optional(),
    rsvp_deadline: eventShape.rsvp_deadline.optional(),
    visibility_mode: eventShape.visibility_mode.optional(),
    status: eventShape.status,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one event field must be updated',
  })
  .superRefine(validateChronology) satisfies z.ZodType<EventUpdate>

export const eventCreateResolver = createZodResolver(eventCreateSchema)
export const eventUpdateResolver = createZodResolver(eventUpdateSchema)
