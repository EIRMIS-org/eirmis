import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { SessionProvider } from '@/app/providers/session-context'
import { server } from '@/mocks/server'
import { PublicEventPage } from './public-event-page'

const EVENT_ID = '55555555-5555-5555-5555-555555555555'
const GUEST_ID = '33333333-3333-3333-3333-333333333333'

function invitation(status: 'accepted' | 'waitlisted') {
  return {
    id: '66666666-6666-6666-6666-666666666666',
    event_id: EVENT_ID,
    guest_id: GUEST_ID,
    status,
    max_party_size: 1,
    party_size: status === 'accepted' ? 1 : 0,
    checked_in_count: 0,
    dietary_preference: null,
    special_requests: null,
    invited_by: null,
    invited_at: null,
    responded_at: null,
    waitlisted_at: status === 'waitlisted' ? '2026-11-27T10:00:00+08:00' : null,
    created_at: '2026-11-27T10:00:00+08:00',
    updated_at: '2026-11-27T10:00:00+08:00',
  }
}

function renderPublicEventPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/register/annual-gala-2026']}>
          <Routes>
            <Route path="/register/:slug" element={<PublicEventPage />} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  )
}

async function submitRegistration(email = 'jordan.cruz@example.com') {
  const user = userEvent.setup()

  await screen.findByRole('heading', { name: 'Annual Gala 2026' })
  await user.type(screen.getByLabelText(/full name/i), 'Jordan Cruz')
  await user.type(screen.getByLabelText(/email address/i), email)
  await user.click(
    screen.getByRole('button', { name: /register for this event/i }),
  )
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  window.localStorage.clear()
})

afterAll(() => {
  server.close()
})

describe('Public event registration outcomes', () => {
  it('renders waitlist notice when registration returns waitlisted invitation', async () => {
    server.use(
      http.post('*/functions/v1/register-public', () =>
        HttpResponse.json(invitation('waitlisted'), { status: 201 }),
      ),
    )
    renderPublicEventPage()

    await submitRegistration()

    expect(
      await screen.findByText(
        'You have been added to the waitlist for Annual Gala 2026. The event is currently at capacity. We will notify you if a place becomes available.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Registration confirmed')).not.toBeInTheDocument()
  })

  it('renders confirmed notice when registration returns accepted invitation', async () => {
    server.use(
      http.post('*/functions/v1/register-public', () =>
        HttpResponse.json(invitation('accepted'), { status: 201 }),
      ),
    )
    renderPublicEventPage()

    await submitRegistration()

    expect(await screen.findByText('Registration confirmed')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Your mock registration for Annual Gala 2026 was successful. Check your email - your invitation is on its way.',
      ),
    ).toBeInTheDocument()
  })

  it('handles 502 by showing registration saved notice with email failure note', async () => {
    server.use(
      http.post('*/functions/v1/register-public', () =>
        HttpResponse.json(
          {
            error: 'Registration was created, but the confirmation email could not be sent.',
            registration_created: true,
            invitation: invitation('waitlisted'),
          },
          { status: 502 },
        ),
      ),
    )
    renderPublicEventPage()

    await submitRegistration()

    expect(await screen.findByText('Registration saved!')).toBeInTheDocument()
    expect(
      screen.getByText(
        'You have been added to the waitlist for Annual Gala 2026. The event is currently at capacity. We will notify you if a place becomes available. However, we could not deliver your confirmation email. You can sign in to your guest portal directly.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Registration confirmed')).not.toBeInTheDocument()
  })

  it('displays form banner error on 409 event not accepting registrations', async () => {
    const serverMessage =
      'This event is not currently accepting public registrations.'
    server.use(
      http.post('*/functions/v1/register-public', () =>
        HttpResponse.json({ error: serverMessage }, { status: 409 }),
      ),
    )
    renderPublicEventPage()

    await submitRegistration()

    expect(await screen.findByRole('alert')).toHaveTextContent(serverMessage)
    expect(
      screen.getByLabelText(/email address/i),
    ).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('displays email field error on 409 duplicate email', async () => {
    server.use(
      http.post('*/functions/v1/register-public', () =>
        HttpResponse.json(
          { error: 'This guest has already registered for this event.' },
          { status: 409 },
        ),
      ),
    )
    renderPublicEventPage()

    await submitRegistration()

    expect(
      await screen.findByText('This email is already registered for this event.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
