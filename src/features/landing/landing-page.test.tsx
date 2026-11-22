// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { SessionProvider } from '@/app/providers/session-context'
import { server } from '@/mocks/server'
import { LandingPage } from '@/pages/landing/landing-page'
import { PublicRegistrationForm } from './components/public-registration-form'

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  cleanup()
})

afterAll(() => {
  server.close()
})

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter>{ui}</MemoryRouter>
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
