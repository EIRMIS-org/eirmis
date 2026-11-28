import { expect, expectTypeOf, it } from 'vitest'
import type { Resolver } from 'react-hook-form'
import type { z } from 'zod'
import { headcountRequestCreateResolver, headcountRequestCreateSchema } from './schemas/headcount-request'

it('accepts raw headcount input and returns the parsed numeric value', async () => {
  type Input = z.input<typeof headcountRequestCreateSchema>
  type Output = z.output<typeof headcountRequestCreateSchema>
  expectTypeOf(headcountRequestCreateResolver).toEqualTypeOf<Resolver<Input, unknown, Output>>()
  const raw = { invitation_id: '68d26a7e-5a92-407f-b559-75e0555b03eb', requested_additional_heads: '2' }
  const result = await headcountRequestCreateResolver(raw, undefined, {
    fields: {}, shouldUseNativeValidation: false,
  })
  expect(result).toEqual({ values: { ...raw, requested_additional_heads: 2 }, errors: {} })
})
