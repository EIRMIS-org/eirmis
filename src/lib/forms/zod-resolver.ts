import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'

/**
 * Keeps a form's parsed values tied to the output of its Zod schema.
 *
 * Form controls may supply strings for coerced number fields, while consumers
 * work with the contract-shaped output after validation. The cast is isolated
 * here so form screens never need to weaken their own resolver types.
 */
export function createZodResolver<TValues extends FieldValues>(
  schema: z.ZodType<TValues>,
): Resolver<TValues> {
  return zodResolver(
    schema as z.ZodType<TValues, TValues>,
  ) as Resolver<TValues>
}
