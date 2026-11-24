// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/app/providers/session-context'
import { REDIRECT_STORAGE_KEY, RoleGuard } from '@/app/routing/role-guard'
import { server } from '@/mocks/server'
import { HeroCarousel } from '@/pages/landing/components/hero-carousel'
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

function mockMatchMedia(matchesReducedMotion: boolean) {
  const listeners = new Set<() => void>()
  const mediaQueryList = {
    matches: matchesReducedMotion,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_event: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.delete(listener)
    },
    addListener: (listener: () => void) => {
      listeners.add(listener)
    },
    removeListener: (listener: () => void) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => true,
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn(() => mediaQueryList as unknown as MediaQueryList),
  })
  return mediaQueryList
}

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
    expect(h1s[0]).toHaveTextContent(/Manage every event invitation/i)

    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.map((h) => h.textContent)).toEqual([
      'Four portals, one platform',
      'Events open to everyone',
    ])

    // Role cards use h3 under the h2 (no h2 -> h4 heading skip)
    const h3s = screen.getAllByRole('heading', { level: 3 })
    expect(h3s.length).toBeGreaterThanOrEqual(4)
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0)

    // Footer (contentinfo) is a sibling of main, not nested inside main
    const main = screen.getByRole('main')
    const footer = screen.getByRole('contentinfo')
    expect(main.contains(footer)).toBe(false)
  })

  it('opens the public event drawer from an event card and returns focus on Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LandingPage />)

    const eventsList = await screen.findByRole('list')
    const eventButtons = within(eventsList).getAllByRole('button')
    expect(eventButtons.length).toBeGreaterThan(0)

    const firstCardBtn = eventButtons[0]
    await user.click(firstCardBtn)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Register your interest' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(firstCardBtn).toHaveFocus()
    })
  })
})

describe('HeroCarousel behavior', () => {
  it('changes the active slide with ArrowRight and ArrowLeft keyboard navigation', () => {
    mockMatchMedia(false)
    render(<HeroCarousel />)

    const carousel = screen.getByRole('region', { name: /Event moments/i })
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(carousel, { key: 'ArrowRight' })
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(carousel, { key: 'ArrowLeft' })
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('does not auto-advance when prefers-reduced-motion: reduce is set', () => {
    mockMatchMedia(true)
    vi.useFakeTimers()
    render(<HeroCarousel />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    act(() => {
      vi.advanceTimersByTime(15000)
    })

    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('pauses auto-advance on focus and resumes after focus leaves the carousel', () => {
    mockMatchMedia(false)
    vi.useFakeTimers()
    render(
      <div>
        <HeroCarousel />
        <button type="button">Outside button</button>
      </div>
    )

    const carousel = screen.getByRole('region', { name: /Event moments/i })
    const outsideButton = screen.getByRole('button', { name: 'Outside button' })
    const tabs = screen.getAllByRole('tab')

    act(() => {
      carousel.focus()
      fireEvent.focusIn(carousel, { relatedTarget: outsideButton })
    })

    act(() => {
      vi.advanceTimersByTime(6500)
    })
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    act(() => {
      outsideButton.focus()
      fireEvent.focusOut(carousel, { relatedTarget: outsideButton })
    })

    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
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

    const signInButton = screen.getByRole('button', { name: /Continue as Organizer/i })
    await user.click(signInButton)

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

    const signInButton = screen.getByRole('button', { name: /Continue as Organizer/i })
    await user.click(signInButton)

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
