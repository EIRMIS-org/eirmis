// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/app/providers/session-context'
import { REDIRECT_STORAGE_KEY, RoleGuard } from '@/app/routing/role-guard'
import { server } from '@/mocks/server'
import { LandingPage } from '@/pages/landing/landing-page'
import { PublicRegistrationForm } from './components/public-registration-form'

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  window.sessionStorage.clear()
  server.resetHandlers()
  cleanup()
})

afterAll(() => {
  server.close()
})

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-path">{`${location.pathname}${location.search}${location.hash}`}</div>
}

function renderWithProviders(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>
  )
}

describe('LandingPage accessibility', () => {
  it('renders a single h1, logical h2/h3 heading hierarchy, and footer outside main', async () => {
    renderWithProviders(<LandingPage />)

    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent(/Every invitation, RSVP, and check-in/i)

    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.map((h) => h.textContent)).toEqual([
      'Sign in to EIRMIS',
      'Events open to everyone',
    ])

    // No heading-level skips below the h2s
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0)

    // Footer (contentinfo) is a sibling of main, not nested inside main
    const main = screen.getByRole('main')
    const footer = screen.getByRole('contentinfo')
    expect(main.contains(footer)).toBe(false)
  })

  it('navigates to the event registration page from an event card', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register/:slug" element={<div>Registration page</div>} />
        </Routes>
      </>,
      ['/']
    )

    const eventsList = await screen.findByRole('list')
    const eventLinks = within(eventsList).getAllByRole('link')
    expect(eventLinks.length).toBeGreaterThan(0)

    await user.click(eventLinks[0])

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/register/annual-gala-2026')
    })
  })
})

describe('Redirect memory across RoleGuard and LandingPage', () => {
  it('persists attempted guarded route and restores/clears it on sign-in', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/organizer/events"
            element={
              <RoleGuard allow={['organizer']}>
                <div>Organizer Events Workspace</div>
              </RoleGuard>
            }
          />
        </Routes>
      </>,
      ['/organizer/events?tab=guests']
    )

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/')
    })
    expect(window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBe('/organizer/events?tab=guests')

    await user.click(screen.getByRole('button', { name: /Continue as Organizer/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/organizer/events?tab=guests')
    })
    expect(window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })

  it('ignores malicious protocol-relative redirect targets like //evil.com', async () => {
    const user = userEvent.setup()
    window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, '//evil.com')

    renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/organizer" element={<div>Organizer Home</div>} />
          <Route path="/admin" element={<div>Admin Home</div>} />
          <Route path="/guest" element={<div>Guest Home</div>} />
          <Route path="/staff" element={<div>Staff Home</div>} />
        </Routes>
      </>,
      ['/']
    )

    await user.click(screen.getByRole('button', { name: /Continue as Organizer/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/organizer')
    })
    expect(window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })

  it('ignores a stale redirect saved for a different portal instead of landing on 403', async () => {
    const user = userEvent.setup()
    // An earlier unauthenticated visit to /admin saved this redirect; the
    // user now signs in as Organizer from the landing card.
    window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/admin')

    renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/organizer" element={<div>Organizer Home</div>} />
          <Route path="/admin" element={<div>Admin Home</div>} />
        </Routes>
      </>,
      ['/']
    )

    await user.click(screen.getByRole('button', { name: /Continue as Organizer/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/organizer')
    })
    expect(window.sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })
})

describe('PublicRegistrationForm accessibility', () => {
  it('associates labels programmatically and announces validation errors via role="alert"', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <PublicRegistrationForm
        eventId="55555555-5555-5555-5555-555555555555"
        eventTitle="Annual Gala 2026"
      />
    )

    const nameInput = screen.getByLabelText(/Full name/i)
    const emailInput = screen.getByLabelText(/Email address/i)
    expect(nameInput).toBeInTheDocument()
    expect(emailInput).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Register for this event' }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(2)
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput.getAttribute('aria-describedby')).toBeTruthy()
    expect(emailInput.getAttribute('aria-describedby')).toBeTruthy()
  })
})
