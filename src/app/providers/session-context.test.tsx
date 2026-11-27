// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionCacheGuard } from '@/App'
import { getRole, setRole } from '@/lib/api'
import { SessionProvider } from './session-context'
import { useSession } from './use-session'

const STORAGE_KEY = 'eirmis.session.role'

function RoleSwitchHarness() {
  const { role, signIn, signOut } = useSession()

  return (
    <div>
      <span data-testid="active-role">{role}</span>
      <button type="button" onClick={() => signIn('organizer')}>
        Sign in organizer
      </button>
      <button type="button" onClick={() => signIn('guest')}>
        Sign in guest
      </button>
      <button type="button" onClick={() => signIn('admin')}>
        Sign in admin
      </button>
      <button type="button" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}

function renderSessionGuard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SessionCacheGuard />
        <RoleSwitchHarness />
      </SessionProvider>
    </QueryClientProvider>,
  )

  return { queryClient }
}

describe('SessionProvider + SessionCacheGuard cache isolation', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.removeItem(STORAGE_KEY)
    setRole('public')
  })

  it('purges TanStack Query cache when switching role from organizer to guest', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderSessionGuard()

    // Sign in as organizer and populate organizer-scoped cache entries
    await user.click(screen.getByRole('button', { name: /sign in organizer/i }))
    expect(screen.getByTestId('active-role')).toHaveTextContent('organizer')
    expect(getRole()).toBe('organizer')

    queryClient.setQueryData(['events'], [{ id: 'evt-1', title: 'Private Gala' }])
    queryClient.setQueryData(['attendees', 'evt-1'], [{ id: 'att-1', full_name: 'VIP Guest' }])
    expect(queryClient.getQueryData(['events'])).toHaveLength(1)
    expect(queryClient.getQueryData(['attendees', 'evt-1'])).toHaveLength(1)

    // Direct role transition organizer -> guest without signing out first
    await user.click(screen.getByRole('button', { name: /sign in guest/i }))
    expect(screen.getByTestId('active-role')).toHaveTextContent('guest')
    expect(getRole()).toBe('guest')

    // All organizer-cached queries must be purged immediately
    expect(queryClient.getQueryData(['events'])).toBeUndefined()
    expect(queryClient.getQueryData(['attendees', 'evt-1'])).toBeUndefined()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('purges TanStack Query cache when transitioning public -> organizer and organizer -> public', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderSessionGuard()

    // Anonymous public cache entry
    queryClient.setQueryData(['public-events'], [{ id: 'pub-1' }])
    expect(queryClient.getQueryData(['public-events'])).toBeDefined()

    // Transition public -> organizer clears prior public cache
    await user.click(screen.getByRole('button', { name: /sign in organizer/i }))
    expect(queryClient.getQueryData(['public-events'])).toBeUndefined()

    // Seed organizer data, then sign out -> public clears organizer cache
    queryClient.setQueryData(['organizer-profile'], { id: 'org-1' })
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(screen.getByTestId('active-role')).toHaveTextContent('public')
    expect(queryClient.getQueryData(['organizer-profile'])).toBeUndefined()
  })

  it('preserves TanStack Query cache when signing in with the already active role', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderSessionGuard()

    await user.click(screen.getByRole('button', { name: /sign in organizer/i }))
    queryClient.setQueryData(['events'], [{ id: 'evt-1' }])

    // Re-selecting the same active role should not wipe the cache
    await user.click(screen.getByRole('button', { name: /sign in organizer/i }))
    expect(queryClient.getQueryData(['events'])).toEqual([{ id: 'evt-1' }])
  })
})
