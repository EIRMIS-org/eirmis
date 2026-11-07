import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'

/**
 * Keeps a form's parsed values tied to the output of its Zod schema.
 *
 * Form controls may supply strings for coerced number fields, while consumers
 * work with the contract-shaped output after validation.
 */
export function createZodResolver<Input extends FieldValues, Output extends FieldValues>(
  schema: z.ZodType<Output, Input>,
): Resolver<Input, unknown, Output> {
  return zodResolver<Input, unknown, Output>(schema)
}
