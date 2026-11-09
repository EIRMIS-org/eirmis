import { expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import type {
  EventCreate,
  EventUpdate,
  InvitationCreate,
  InvitationRsvpUpdate,
  InvitationOrganizerUpdate,
  AttendeeCreate,
  AttendeeUpdate,
  HeadcountIncreaseRequestCreate,
  OrgSettings,
  OrgSettingsUpdate,
  RegisterPublicRequest,
} from '@/lib/api'
import type {
  eventCreateSchema,
  eventUpdateSchema,
  invitationCreateSchema,
  invitationRsvpUpdateSchema,
  invitationOrganizerUpdateSchema,
  attendeeCreateSchema,
  attendeeUpdateSchema,
  headcountRequestCreateSchema,
  orgSettingsSchema,
  orgSettingsUpdateSchema,
  registerPublicSchema,
} from './index'

it('matches every parsed form payload exactly to the generated contract', () => {
  expectTypeOf<z.output<typeof eventCreateSchema>>().toEqualTypeOf<EventCreate>()
  expectTypeOf<z.output<typeof eventUpdateSchema>>().toEqualTypeOf<EventUpdate>()
  expectTypeOf<z.output<typeof invitationCreateSchema>>().toEqualTypeOf<InvitationCreate>()
  expectTypeOf<z.output<typeof invitationRsvpUpdateSchema>>().toEqualTypeOf<InvitationRsvpUpdate>()
  expectTypeOf<z.output<typeof invitationOrganizerUpdateSchema>>().toEqualTypeOf<InvitationOrganizerUpdate>()
  expectTypeOf<z.output<typeof attendeeCreateSchema>>().toEqualTypeOf<AttendeeCreate>()
  expectTypeOf<z.output<typeof attendeeUpdateSchema>>().toEqualTypeOf<AttendeeUpdate>()
  expectTypeOf<z.output<typeof headcountRequestCreateSchema>>().toEqualTypeOf<HeadcountIncreaseRequestCreate>()
  expectTypeOf<z.output<typeof orgSettingsSchema>>().toEqualTypeOf<OrgSettings>()
  expectTypeOf<z.output<typeof orgSettingsUpdateSchema>>().toEqualTypeOf<OrgSettingsUpdate>()
  expectTypeOf<z.output<typeof registerPublicSchema>>().toEqualTypeOf<RegisterPublicRequest>()
})
