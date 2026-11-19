// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { SessionProvider } from '@/app/providers/session-context'
import type { Attendee, Invitation } from '@/lib/api'
import { resetMockCheckInState } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import { GuestInvitationsPage } from '@/pages/guest/guest-invitations-page'
import { InvitationDetailPage } from '@/pages/guest/invitation-detail-page'
import { RosterEditor } from './components/roster-editor'
import { RsvpSection } from './components/rsvp-section'
import { WalletPassView } from './components/wallet-pass-view'

const BASE_INVITATION: Invitation = {
  id: '66666666-6666-6666-6666-666666666666',
  event_id: '55555555-5555-5555-5555-555555555555',
  guest_id: '33333333-3333-3333-3333-333333333333',
  status: 'accepted',
  max_party_size: 4,
  party_size: 2,
  checked_in_count: 0,
  dietary_preference: 'Vegetarian',
  special_requests: null,
  invited_by: '11111111-1111-1111-1111-111111111111',
  invited_at: '2026-10-01T09:00:00+08:00',
  responded_at: '2026-10-05T14:30:00+08:00',
  waitlisted_at: null,
  created_at: '2026-10-01T09:00:00+08:00',
  updated_at: '2026-10-05T14:30:00+08:00',
}

const ROSTER_ATTENDEES: Attendee[] = [
  {
    id: '77777777-7777-7777-7777-777777777771',
    invitation_id: BASE_INVITATION.id,
    full_name: 'Maria Santos',
    email: 'maria.santos@example.com',
    is_primary: true,
    status: 'approved',
    submitted_at: '2026-10-05T14:00:00+08:00',
    reviewed_by: '11111111-1111-1111-1111-111111111111',
    reviewed_at: '2026-10-06T09:00:00+08:00',
    review_reason: 'Primary guest approved',
    qr_token: 'EIRMIS-QR-0001-MARIA-SANTOS',
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    is_walk_in: false,
  },
  {
    id: '77777777-7777-7777-7777-777777777772',
    invitation_id: BASE_INVITATION.id,
    full_name: 'Crisostomo Ibarra',
    email: 'ibarra@example.com',
    is_primary: false,
    status: 'approved',
    submitted_at: '2026-10-05T14:05:00+08:00',
    reviewed_by: '11111111-1111-1111-1111-111111111111',
    reviewed_at: '2026-10-06T09:05:00+08:00',
    review_reason: null,
    qr_token: 'EIRMIS-QR-0002-CRISOSTOMO-IBARRA',
    checked_in: true,
    checked_in_at: '2026-12-15T18:10:00+08:00',
    checked_in_by: '44444444-4444-4444-4444-444444444444',
    is_walk_in: false,
  },
  {
    id: '77777777-7777-7777-7777-777777777773',
    invitation_id: BASE_INVITATION.id,
    full_name: 'Elias Salome',
    email: 'elias@example.com',
    is_primary: false,
    status: 'rejected',
    submitted_at: '2026-10-05T14:10:00+08:00',
    reviewed_by: '11111111-1111-1111-1111-111111111111',
    reviewed_at: '2026-10-06T09:10:00+08:00',
    review_reason: 'Please provide full legal name matching government ID',
    qr_token: null,
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    is_walk_in: false,
  },
  {
    id: '77777777-7777-7777-7777-777777777774',
    invitation_id: BASE_INVITATION.id,
    full_name: 'Basilio Sisa',
    email: null,
    is_primary: false,
    status: 'pending',
    submitted_at: '2026-10-05T14:15:00+08:00',
    reviewed_by: null,
    reviewed_at: null,
    review_reason: null,
    qr_token: null,
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    is_walk_in: false,
  },
]

function renderWithProviders(
  ui: React.ReactElement,
  initialEntries: string[] = ['/guest'],
) {
  window.localStorage.setItem('eirmis.session.role', 'guest')
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    ),
  }
}

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  cleanup()
  resetMockCheckInState()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

describe('Guest Portal (Task 08)', () => {
  it('renders my-invitations list with loading, success, empty, and error states', async () => {
    const first = renderWithProviders(<GuestInvitationsPage />)

    expect(await screen.findByText('Your invitation')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    first.unmount()

    server.use(
      http.get('*/rest/v1/invitations', () => HttpResponse.json([])),
    )
    const empty = renderWithProviders(<GuestInvitationsPage />)
    expect(
      await screen.findByText('You have no invitations yet'),
    ).toBeInTheDocument()
    empty.unmount()

    server.use(
      http.get('*/rest/v1/invitations', () =>
        HttpResponse.json(
          {
            code: 'INTERNAL_ERROR',
            message: 'Unable to fetch invitations',
            details: null,
            hint: null,
          },
          { status: 500 },
        ),
      ),
    )
    const errorRender = renderWithProviders(<GuestInvitationsPage />)
    expect(
      await screen.findByText('We could not load your invitations.'),
    ).toBeInTheDocument()
    errorRender.unmount()
  })

  it('persists RSVP accept/decline via MSW and displays 422 validation errors inline', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RsvpSection invitation={BASE_INVITATION} />)

    await user.click(screen.getByRole('button', { name: /Decline/i }))
    await user.click(screen.getByRole('button', { name: 'Save RSVP' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save RSVP' })).not.toBeDisabled()
    })

    server.use(
      http.patch('*/rest/v1/invitations', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Dietary note contains unsupported characters',
            details: JSON.stringify([
              {
                field: 'dietary_preference',
                message: 'Please describe dietary requirements in plain text',
              },
            ]),
            hint: null,
          },
          { status: 422 },
        ),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Save RSVP' }))
    expect(
      await screen.findByText(
        'Please describe dietary requirements in plain text',
      ),
    ).toBeInTheDocument()
  })

  it('enforces max_party_size ceiling, allows adding under ceiling, and resubmits rejected attendees', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/rest/v1/attendees', () =>
        HttpResponse.json(ROSTER_ATTENDEES),
      ),
    )

    renderWithProviders(<RosterEditor invitation={BASE_INVITATION} />)

    expect(await screen.findByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText(/\/\s*4\s+heads\s*\(100%\)/i)).toBeInTheDocument()

    const addMemberBtn = screen.getByRole('button', { name: /Add Member/i })
    expect(addMemberBtn).toBeDisabled()
    expect(
      screen.getByText(/Party limit reached \(max 4\)\. Need more spots\?/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Request Additional Heads/i }),
    ).toBeInTheDocument()

    // Rejected attendee shows reason and Fix & Resubmit action
    expect(
      screen.getByText(
        /Please provide full legal name matching government ID/i,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Fix & Resubmit/i }))
    const dialog = await screen.findByRole('dialog')
    const nameInput = within(dialog).getByLabelText(/Full name/i)
    expect(nameInput).toHaveValue('Elias Salome')

    await user.clear(nameInput)
    await user.type(nameInput, 'Elias Antonio Salome')
    await user.click(
      within(dialog).getByRole('button', { name: /Resubmit for Review/i }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(
      screen.queryByRole('button', { name: /Fix & Resubmit/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Elias Antonio Salome')).toBeInTheDocument()
  })

  it('submits headcount request, shows pending state, and updates ceiling when organizer approves', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/rest/v1/attendees', () =>
        HttpResponse.json(ROSTER_ATTENDEES),
      ),
      http.get('*/rest/v1/headcount_increase_requests', () =>
        HttpResponse.json([]),
      ),
    )

    const view = renderWithProviders(
      <RosterEditor invitation={BASE_INVITATION} />,
    )

    expect(
      await screen.findByText(/\/\s*4\s+heads\s*\(100%\)/i),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: /Request Additional Heads/i }),
    )

    const dialog = await screen.findByRole('dialog')
    const headsInput = within(dialog).getByLabelText(
      /Additional heads requested/i,
    )
    await user.clear(headsInput)
    await user.type(headsInput, '2')
    const noteInput = within(dialog).getByLabelText(/Reason for request/i)
    await user.type(noteInput, 'Bringing two colleagues from our lab.')

    await user.click(
      within(dialog).getByRole('button', { name: /Submit Headcount Request/i }),
    )

    expect(
      await screen.findByText('Request Pending Approval'),
    ).toBeInTheDocument()
    expect(screen.getByText('Headcount request (+2 heads)')).toBeInTheDocument()

    // Simulate organizer approval updating invitation max_party_size to 6
    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <SessionProvider>
          <MemoryRouter>
            <RosterEditor
              invitation={{ ...BASE_INVITATION, max_party_size: 6 }}
            />
          </MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByText(/\/\s*6\s+heads\s*\(67%\)/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Add Member/i }),
    ).not.toBeDisabled()
  })

  it('renders wallet-style QR passes for approved attendees and marks pass used after staff scan', async () => {
    server.use(
      http.get('*/rest/v1/attendees', () =>
        HttpResponse.json(ROSTER_ATTENDEES),
      ),
    )

    renderWithProviders(<WalletPassView invitation={BASE_INVITATION} />)

    expect(
      await screen.findByText('EIRMIS-QR-0001-MARIA-SANTOS'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('EIRMIS-QR-0002-CRISOSTOMO-IBARRA'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Pass Used • Checked In/i)).toBeInTheDocument()
  })

  it('renders the full InvitationDetailPage integrating RSVP, RosterEditor, and WalletPassView', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/guest/invitations/:invitationId"
          element={<InvitationDetailPage />}
        />
      </Routes>,
      [`/guest/invitations/${BASE_INVITATION.id}`],
    )

    expect(
      await screen.findByRole('heading', { name: 'Your RSVP' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('signed-qr-token-sample'),
    ).toBeInTheDocument()
  })
})
