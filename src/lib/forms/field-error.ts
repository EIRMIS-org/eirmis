import type { ErrorSchema } from '@/lib/api'
import type {
  FieldValues,
  Path,
  UseFormSetError,
} from 'react-hook-form'
import type { ZodIssue } from 'zod'

export interface FormFieldIssue {
  name: string
  message: string
  type: 'server' | 'validation'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function messageFromValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string')
  }

  if (isRecord(value) && typeof value.message === 'string') {
    return value.message
  }

  return undefined
}

function fieldIssuesFromRecord(
  record: Record<string, unknown>,
): FormFieldIssue[] {
  return Object.entries(record).flatMap(([name, value]) => {
    const message = messageFromValue(value)
    return message === undefined
      ? []
      : [{ name, message, type: 'server' as const }]
  })
}

function parseServerDetails(details: string | null | undefined): FormFieldIssue[] {
  if (!details) return []

  try {
    const parsed: unknown = JSON.parse(details)

    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => {
        if (!isRecord(item) || typeof item.message !== 'string') return []

        const rawPath = item.path ?? item.field ?? item.name
        const name = Array.isArray(rawPath)
          ? rawPath.map(String).join('.')
          : typeof rawPath === 'string'
            ? rawPath
            : undefined

        return name === undefined
          ? []
          : [{ name, message: item.message, type: 'server' as const }]
      })
    }

    if (isRecord(parsed)) {
      const nested = parsed.field_errors ?? parsed.errors
      return isRecord(nested)
        ? fieldIssuesFromRecord(nested)
        : []
    }
  } catch {
    // PostgREST commonly returns human-readable details rather than JSON.
  }

  return []
}

/** Converts Zod paths into the dot notation expected by React Hook Form. */
export function mapZodIssues(issues: readonly ZodIssue[]): FormFieldIssue[] {
  return issues.map((issue) => ({
    name:
      issue.path.length > 0
        ? issue.path.map(String).join('.')
        : 'root.validation',
    message: issue.message,
    type: 'validation',
  }))
}

/**
 * Extracts field errors from a contract Error body.
 *
 * `Error.details` is nullable text in the current contract. JSON field maps are
 * supported when an endpoint provides them; otherwise the error is attached to
 * `root.server` so an unstructured server message is never assigned to the
 * wrong input.
 */
export function mapContractError(error: ErrorSchema): FormFieldIssue[] {
  const fieldIssues = parseServerDetails(error.details)
  if (fieldIssues.length > 0) return fieldIssues

  return [{
    name: 'root.server',
    message: error.message,
    type: 'server',
  }]
}

function applyIssues<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  issues: readonly FormFieldIssue[],
) {
  for (const issue of issues) {
    setError(issue.name as Path<TFieldValues>, {
      type: issue.type,
      message: issue.message,
    })
  }
}

export function applyZodIssues<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  issues: readonly ZodIssue[],
) {
  applyIssues(setError, mapZodIssues(issues))
}

export function applyContractError<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  error: ErrorSchema,
) {
  applyIssues(setError, mapContractError(error))
}
