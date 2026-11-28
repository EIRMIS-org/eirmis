import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { createQueryClient } from './query-client'

type RetryPredicate = (failureCount: number, error: unknown) => boolean

function getRetryPredicate(): RetryPredicate {
  const client = createQueryClient()
  const retry = client.getDefaultOptions().queries?.retry
  if (typeof retry !== 'function') {
    throw new Error('Expected createQueryClient() queries.retry to be a function')
  }
  return retry as RetryPredicate
}

function makeApiError(status: number, message = `HTTP ${status}`): ApiError {
  return new ApiError(
    {
      code: String(status),
      message,
      details: null,
      hint: null,
    },
    status,
  )
}

describe('createQueryClient retry policy', () => {
  it('returns false immediately for 400 and 404 status errors', () => {
    const retry = getRetryPredicate()

    // Core 4xx client errors (ApiError & Response)
    expect(retry(0, makeApiError(400, 'Bad Request'))).toBe(false)
    expect(retry(0, makeApiError(404, 'Not Found'))).toBe(false)
    expect(retry(0, new Response(null, { status: 400 }))).toBe(false)
    expect(retry(0, new Response(null, { status: 404 }))).toBe(false)

    // Other contract-documented 4xx errors never retry
    for (const status of [401, 403, 409, 422, 429]) {
      expect(retry(0, makeApiError(status))).toBe(false)
    }
  })

  it('retries once for 503 and network errors', () => {
    const retry = getRetryPredicate()

    // 503 and other transient 5xx responses retry once (failureCount 0 -> true, 1 -> false)
    for (const status of [500, 502, 503, 504]) {
      expect(retry(0, makeApiError(status))).toBe(true)
      expect(retry(1, makeApiError(status))).toBe(false)
      expect(retry(0, new Response(null, { status }))).toBe(true)
      expect(retry(1, new Response(null, { status }))).toBe(false)
    }

    // Network errors without an HTTP status retry once
    const networkError = new TypeError('Failed to fetch')
    expect(retry(0, networkError)).toBe(true)
    expect(retry(1, networkError)).toBe(false)
  })

  it('executes one retry for 503 and zero retries for 404 through QueryClient', async () => {
    const client = createQueryClient()

    const flaky503 = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(makeApiError(503, 'Service Unavailable'))
      .mockResolvedValueOnce('recovered')

    const result = await client.fetchQuery({
      queryKey: ['test-503-recovery'],
      queryFn: flaky503,
      retryDelay: 0,
    })

    expect(result).toBe('recovered')
    expect(flaky503).toHaveBeenCalledTimes(2)

    const notFound404 = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(makeApiError(404, 'Not Found'))

    await expect(
      client.fetchQuery({
        queryKey: ['test-404-no-retry'],
        queryFn: notFound404,
        retryDelay: 0,
      }),
    ).rejects.toThrow('Not Found')
    expect(notFound404).toHaveBeenCalledTimes(1)
  })
})
