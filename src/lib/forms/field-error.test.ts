import { z } from 'zod'
import { describe, expect, it, vi } from 'vitest'

import {
  applyContractError,
  applyZodIssues,
  mapContractError,
  mapZodIssues,
} from './field-error'

describe('form field error adapters', () => {
  it('maps Zod paths to React Hook Form dot notation', () => {
    const result = z.object({
      attendee: z.object({ email: z.string().email() }),
    }).safeParse({ attendee: { email: 'invalid' } })

    expect(result.success).toBe(false)
    if (result.success) return

    expect(mapZodIssues(result.error.issues)).toEqual([
      expect.objectContaining({
        name: 'attendee.email',
        type: 'validation',
      }),
    ])
  })

  it('maps structured contract details to individual fields', () => {
    expect(mapContractError({
      code: 'VALIDATION_ERROR',
      message: 'The request is invalid',
      details: JSON.stringify({
        field_errors: {
          email: 'This email is already registered',
        },
      }),
      hint: null,
    })).toEqual([{
      name: 'email',
      message: 'This email is already registered',
      type: 'server',
    }])
  })

  it('uses a root error when contract details are unstructured', () => {
    expect(mapContractError({
      code: 'P0001',
      message: 'Registration is closed',
      details: 'The RSVP deadline has passed',
      hint: null,
    })).toEqual([{
      name: 'root.server',
      message: 'Registration is closed',
      type: 'server',
    }])
  })

  it('applies mapped issues with the RHF setError signature', () => {
    const setError = vi.fn()
    const result = z.object({ name: z.string().min(1) }).safeParse({ name: '' })

    expect(result.success).toBe(false)
    if (result.success) return

    applyZodIssues(setError, result.error.issues)
    applyContractError(setError, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: null,
      hint: null,
    })

    expect(setError).toHaveBeenCalledWith(
      'name',
      expect.objectContaining({ type: 'validation' }),
    )
    expect(setError).toHaveBeenCalledWith(
      'root.server',
      { type: 'server', message: 'Invalid request' },
    )
  })
})
