// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { listAttendees, setRole, type Attendee, type Invitation } from '@/lib/api'
import { resetMockCheckInState } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import { StaffScanPage } from '@/pages/staff/staff-scan-page'
import { StaffSearchPage } from '@/pages/staff/staff-search-page'
import { WalkInModal } from './components/walk-in-modal'
import {
    countScanSessionLog,
    initialScanSessionState,
    initialScanState,
    scanResultReducer,
    scanSessionReducer,
} from './lib/scan-result-machine'

const ASSIGNED_EVENT_ID = '55555555-5555-5555-5555-555555555555'
const OTHER_EVENT_ID = '55555555-5555-5555-5555-555555555599'
const ASSIGNED_INVITATION_ID = '66666666-6666-6666-6666-666666666666'
const OTHER_INVITATION_ID = '66666666-6666-6666-6666-666666666699'

function renderWithProviders(ui: React.ReactElement, initialRoute = '/staff') {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
        </QueryClientProvider>,
    )
}

describe('check-in staff portal hardening', () => {
    beforeAll(() => server.listen())

    afterEach(() => {
        cleanup()
        window.sessionStorage.clear()
        resetMockCheckInState()
        server.resetHandlers()
        setRole('checkin')
    })

    afterAll(() => {
        setRole('public')
        server.close()
    })

    describe('scan-result-machine additive session reducer', () => {
        it('keeps existing scanResultReducer transitions untouched and logs terminal outcomes most-recent-first', () => {
            const started = scanResultReducer(initialScanState, {
                type: 'SCAN_START',
                token: 'tok-1',
            })
            expect(started).toEqual({ status: 'resolving', ticketCode: 'tok-1' })
            expect(scanResultReducer(started, { type: 'SCAN_RESET' })).toEqual(
                initialScanState,
            )

            let state = initialScanSessionState
            state = scanSessionReducer(state, { type: 'SCAN_START', token: 'tok-1' })
            expect(state.log).toHaveLength(0)

            state = scanSessionReducer(state, {
                type: 'SCAN_RESOLVED_SUCCESS',
                payload: {
                    result: 'accepted',
                    attendee: {
                        id: 'att-1',
                        invitation_id: ASSIGNED_INVITATION_ID,
                        full_name: 'Maria Santos',
                        email: 'maria@example.com',
                        is_primary: true,
                        status: 'approved',
                        submitted_at: '2026-10-05T14:00:00+08:00',
                        reviewed_by: null,
                        reviewed_at: null,
                        review_reason: null,
                        qr_token: 'tok-1',
                        checked_in: true,
                        checked_in_at: '2026-12-15T18:00:00+08:00',
                        checked_in_by: null,
                        is_walk_in: false,
                    },
                    checked_in_at: '2026-12-15T18:00:00+08:00',
                    message: null,
                },
            })
            state = scanSessionReducer(state, { type: 'SCAN_START', token: 'bad-tok' })
            state = scanSessionReducer(state, {
                type: 'SCAN_FAILED_INVALID_TOKEN',
                message: 'Bad signature',
            })
            state = scanSessionReducer(state, { type: 'SCAN_RESET' })

            expect(state.current).toEqual(initialScanState)
            expect(state.log).toHaveLength(2)
            expect(state.log[0]).toMatchObject({
                subject: 'bad-tok',
                outcome: 'invalid-token',
            })
            expect(state.log[1]).toMatchObject({
                subject: 'Maria Santos',
                outcome: 'success',
            })
            expect(countScanSessionLog(state.log)).toEqual({ ok: 1, total: 2 })

            state = scanSessionReducer(state, { type: 'SESSION_LOG_CLEAR' })
            expect(state.log).toEqual([])
            expect(countScanSessionLog(state.log)).toEqual({ ok: 0, total: 0 })
        })
    })

    describe('walk-in modal searchable invitation lookup', () => {
        it(
            'selects an accepted invitation without typing a UUID, creates the walk-in, and checks them in',
            async () => {
                setRole('checkin')
                const user = userEvent.setup()

                renderWithProviders(<WalkInModal eventId={ASSIGNED_EVENT_ID} />, '/staff/search')

                await user.click(screen.getByRole('button', { name: /register walk-in/i }))

                const filterInput = await screen.findByLabelText(
                    /filter accepted invitations/i,
                    undefined,
                    { timeout: 5000 },
                )
                const selectTrigger = screen.getByRole('combobox', {
                    name: /accepted invitation/i,
                })

                await waitFor(
                    () => {
                        expect(selectTrigger).toBeEnabled()
                    },
                    { timeout: 5000 },
                )

                await user.type(filterInput, 'maria')
                await user.click(selectTrigger)

                const mariaOption = await screen.findByRole(
                    'option',
                    { name: /maria santos.*party 2\/4/i },
                    { timeout: 5000 },
                )
                expect(
                    screen.queryByRole('option', { name: /jose rizal/i }),
                ).not.toBeInTheDocument()

                await user.click(mariaOption)

                await user.type(screen.getByLabelText(/full name/i), 'Walk-in Guest')
                await user.type(screen.getByLabelText(/email/i), 'walkin@example.com')
                await user.click(
                    screen.getByRole('button', { name: /register and check in/i }),
                )

                await waitFor(
                    () => {
                        expect(
                            screen.queryByRole('heading', { name: /register a walk-in/i }),
                        ).not.toBeInTheDocument()
                    },
                    { timeout: 5000 },
                )

                const attendees = await listAttendees({
                    invitation_id: `eq.${ASSIGNED_INVITATION_ID}`,
                })
                expect(
                    attendees.find((attendee) => attendee.full_name === 'Walk-in Guest'),
                ).toMatchObject({
                    is_walk_in: true,
                    checked_in: true,
                })
            },
            15_000,
        )

        it(
            'falls back to a shortened invitation ID when no guest or attendee name exists',
            async () => {
                setRole('checkin')
                const user = userEvent.setup()

                server.use(
                    http.get('*/rest/v1/guests', () => HttpResponse.json([])),
                    http.get('*/rest/v1/attendees', () => HttpResponse.json([])),
                )

                renderWithProviders(<WalkInModal eventId={ASSIGNED_EVENT_ID} />, '/staff/search')

                await user.click(screen.getByRole('button', { name: /register walk-in/i }))

                const selectTrigger = await screen.findByRole(
                    'combobox',
                    { name: /accepted invitation/i },
                    { timeout: 5000 },
                )
                await waitFor(
                    () => {
                        expect(selectTrigger).toBeEnabled()
                    },
                    { timeout: 5000 },
                )

                await user.click(selectTrigger)

                expect(
                    await screen.findByRole(
                        'option',
                        { name: /invitation 66666666.*party 2\/4/i },
                        { timeout: 5000 },
                    ),
                ).toBeInTheDocument()
            },
            15_000,
        )

        it(
            'preserves retry state if initial check-in fails after walk-in creation',
            async () => {
                setRole('checkin')
                const user = userEvent.setup()

                server.use(
                    http.post('*/functions/v1/checkin/scan', () =>
                        HttpResponse.json({
                            result: 'invalid_token',
                            attendee: null,
                            message: 'Temporary scanner outage',
                        }),
                    ),
                )

                renderWithProviders(<WalkInModal eventId={ASSIGNED_EVENT_ID} />, '/staff/search')

                await user.click(screen.getByRole('button', { name: /register walk-in/i }))

                const selectTrigger = await screen.findByRole(
                    'combobox',
                    { name: /accepted invitation/i },
                    { timeout: 5000 },
                )
                await waitFor(
                    () => {
                        expect(selectTrigger).toBeEnabled()
                    },
                    { timeout: 5000 },
                )

                await user.click(selectTrigger)
                await user.click(
                    await screen.findByRole(
                        'option',
                        { name: /maria santos/i },
                        { timeout: 5000 },
                    ),
                )
                await user.type(screen.getByLabelText(/full name/i), 'Retry Guest')
                await user.click(
                    screen.getByRole('button', { name: /register and check in/i }),
                )

                expect(
                    await screen.findByText(/temporary scanner outage/i, undefined, {
                        timeout: 5000,
                    }),
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('button', { name: /retry check-in/i }),
                ).toBeInTheDocument()
                expect(selectTrigger).toBeDisabled()
            },
            15_000,
        )
    })

    describe('scan session log on StaffScanPage', () => {
        it(
            'records all 5 outcomes most-recent-first, updates the counter, clears, and persists across reload',
            async () => {
                setRole('checkin')
                const user = userEvent.setup()

                const { unmount } = renderWithProviders(
                    <StaffScanPage eventId={ASSIGNED_EVENT_ID} />,
                    '/staff',
                )

                expect(
                    await screen.findByText('Annual Gala 2026', undefined, {
                        timeout: 5000,
                    }),
                ).toBeInTheDocument()
                expect(screen.getByText('0 OK / 0 total')).toBeInTheDocument()

                await user.click(screen.getByRole('button', { name: /1\. valid qr/i }))
                await waitFor(
                    () => {
                        expect(screen.getByText('1 OK / 1 total')).toBeInTheDocument()
                    },
                    { timeout: 5000 },
                )

                await user.click(screen.getByRole('button', { name: /2\. duplicate/i }))
                await waitFor(
                    () => {
                        expect(screen.getByText('1 OK / 2 total')).toBeInTheDocument()
                    },
                    { timeout: 5000 },
                )

                await user.click(screen.getByRole('button', { name: /3\. bad token/i }))
                await waitFor(
                    () => {
                        expect(screen.getByText('1 OK / 3 total')).toBeInTheDocument()
                    },
                    { timeout: 5000 },
                )

                await user.click(screen.getByRole('button', { name: /4\. wrong event/i }))
                await waitFor(
                    () => {
                        expect(screen.getByText('1 OK / 4 total')).toBeInTheDocument()
                    },
                    { timeout: 5000 },
                )

                await user.click(screen.getByRole('button', { name: /5\. capacity full/i }))
                await waitFor(
                    () => {
                        expect(screen.getByText('1 OK / 5 total')).toBeInTheDocument()
                    },
                    { timeout: 5000 },
                )

                const logList = screen.getByRole('list', { name: /recent session scans/i })
                const items = within(logList).getAllByRole('listitem')
                expect(items).toHaveLength(5)
                expect(items[0]).toHaveTextContent(/capacity full/i)
                expect(items[1]).toHaveTextContent(/wrong event/i)
                expect(items[2]).toHaveTextContent(/invalid/i)
                expect(items[3]).toHaveTextContent(/already checked in/i)
                expect(items[4]).toHaveTextContent(/maria santos/i)
                expect(items[4]).toHaveTextContent(/success/i)

                // Verify sessionStorage persistence across remount
                unmount()
                renderWithProviders(<StaffScanPage eventId={ASSIGNED_EVENT_ID} />, '/staff')
                expect(
                    await screen.findByText('1 OK / 5 total', undefined, {
                        timeout: 5000,
                    }),
                ).toBeInTheDocument()

                // Clear log and confirm subsequent scans record cleanly
                await user.click(screen.getByRole('button', { name: /clear log/i }))
                expect(screen.getByText('0 OK / 0 total')).toBeInTheDocument()
                expect(
                    screen.getByText(/no scans recorded in this session yet/i),
                ).toBeInTheDocument()

                await user.click(screen.getByRole('button', { name: /3\. bad token/i }))
                await waitFor(
                    () => {
                        expect(screen.getByText('0 OK / 1 total')).toBeInTheDocument()
                    },
                    { timeout: 5000 },
                )
            },
            15_000,
        )
    })

    describe('event-scoped manual search', () => {
        it('lists only attendees belonging to the assigned event with a count line and allows check-in', async () => {
            setRole('checkin')
            const user = userEvent.setup()

            const eventAInvitation: Invitation = {
                id: ASSIGNED_INVITATION_ID,
                event_id: ASSIGNED_EVENT_ID,
                guest_id: '33333333-3333-3333-3333-333333333333',
                status: 'accepted',
                max_party_size: 4,
                party_size: 1,
                checked_in_count: 0,
                dietary_preference: null,
                special_requests: null,
                invited_by: '11111111-1111-1111-1111-111111111111',
                invited_at: '2026-10-01T09:00:00+08:00',
                responded_at: '2026-10-05T14:30:00+08:00',
                waitlisted_at: null,
                created_at: '2026-10-01T09:00:00+08:00',
                updated_at: '2026-10-05T14:30:00+08:00',
            }
            const eventBInvitation: Invitation = {
                ...eventAInvitation,
                id: OTHER_INVITATION_ID,
                event_id: OTHER_EVENT_ID,
            }

            let attendeesStore: Attendee[] = [
                {
                    id: '77777777-7777-7777-7777-777777777777',
                    invitation_id: ASSIGNED_INVITATION_ID,
                    full_name: 'Maria Santos',
                    email: 'maria.santos@example.com',
                    is_primary: true,
                    status: 'approved',
                    submitted_at: '2026-10-05T14:00:00+08:00',
                    reviewed_by: '11111111-1111-1111-1111-111111111111',
                    reviewed_at: '2026-10-06T09:00:00+08:00',
                    review_reason: null,
                    qr_token: 'signed-qr-token-sample',
                    checked_in: false,
                    checked_in_at: null,
                    checked_in_by: null,
                    is_walk_in: false,
                },
                {
                    id: '77777777-7777-7777-7777-777777777799',
                    invitation_id: OTHER_INVITATION_ID,
                    full_name: 'Event B Intruder',
                    email: 'other.event@example.com',
                    is_primary: true,
                    status: 'approved',
                    submitted_at: '2026-10-05T14:00:00+08:00',
                    reviewed_by: '11111111-1111-1111-1111-111111111111',
                    reviewed_at: '2026-10-06T09:00:00+08:00',
                    review_reason: null,
                    qr_token: 'other-event-token',
                    checked_in: false,
                    checked_in_at: null,
                    checked_in_by: null,
                    is_walk_in: false,
                },
            ]

            server.use(
                http.get('*/rest/v1/invitations', ({ request }) => {
                    const eventFilter = new URL(request.url).searchParams.get('event_id')
                    const all = [eventAInvitation, eventBInvitation]
                    const filtered = eventFilter?.startsWith('eq.')
                        ? all.filter((inv) => inv.event_id === eventFilter.slice(3))
                        : all
                    return HttpResponse.json(filtered)
                }),
                http.get('*/rest/v1/attendees', () => HttpResponse.json(attendeesStore)),
                http.post('*/functions/v1/checkin/scan', async ({ request }) => {
                    const body = (await request.json()) as { qr_token?: string }
                    const matched = attendeesStore.find(
                        (item) => item.qr_token === body.qr_token,
                    )
                    if (!matched) {
                        return HttpResponse.json({
                            result: 'invalid_token',
                            attendee: null,
                            message: 'Not found',
                        })
                    }
                    const updated: Attendee = {
                        ...matched,
                        checked_in: true,
                        checked_in_at: '2026-12-15T18:10:00+08:00',
                    }
                    attendeesStore = attendeesStore.map((item) =>
                        item.id === updated.id ? updated : item,
                    )
                    return HttpResponse.json({
                        result: 'accepted',
                        attendee: updated,
                        checked_in_at: updated.checked_in_at,
                        message: null,
                    })
                }),
            )

            renderWithProviders(
                <StaffSearchPage eventId={ASSIGNED_EVENT_ID} />,
                '/staff/search',
            )

            expect(await screen.findByText('Maria Santos')).toBeInTheDocument()
            expect(screen.getByText('1 attendee for this event')).toBeInTheDocument()
            expect(screen.queryByText('Event B Intruder')).not.toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: /^check in$/i }))

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: /checked in/i }),
                ).toBeDisabled()
            })
        })
    })

    describe('empty-assignment guidance', () => {
        it('renders actionable guidance and hides the manual search link when no event is assigned', async () => {
            setRole('checkin')

            server.use(
                http.get('*/rest/v1/events', () => HttpResponse.json([])),
            )

            renderWithProviders(<StaffScanPage eventId={ASSIGNED_EVENT_ID} />, '/staff')

            expect(
                await screen.findByText(
                    /no check-in assignment found for your account — ask an organizer to assign you to an event/i,
                ),
            ).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /manual search/i }),
            ).not.toBeInTheDocument()
        })
    })
})
