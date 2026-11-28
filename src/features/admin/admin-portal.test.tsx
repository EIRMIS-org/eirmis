// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/app/providers/session-context'
import { setRole } from '@/lib/api'
import { resetMockOrganizerState } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import { AdminAuditLogPage } from '@/pages/admin/admin-audit-log-page'
import { AdminSettingsPage } from '@/pages/admin/admin-settings-page'
import { AdminVerificationQueuePage } from '@/pages/admin/admin-verification-queue-page'

function renderAdminApp(initialPath = '/admin') {
    window.localStorage.setItem('eirmis.session.role', 'admin')
    setRole('admin')

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

    const router = createMemoryRouter(
        [
            { path: '/admin', element: <AdminVerificationQueuePage /> },
            { path: '/admin/audit-log', element: <AdminAuditLogPage /> },
            { path: '/admin/settings', element: <AdminSettingsPage /> },
        ],
        { initialEntries: [initialPath] },
    )

    return {
        queryClient,
        router,
        ...render(
            <QueryClientProvider client={queryClient}>
                <SessionProvider>
                    <RouterProvider router={router} />
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
    vi.restoreAllMocks()
    window.localStorage.removeItem('eirmis.session.role')
    resetMockOrganizerState()
    server.resetHandlers()
})

afterAll(() => {
    server.close()
})

describe('Admin Portal', () => {
    describe('Admin sub-navigation', () => {
        it('links between Verification queue, Audit log, and Settings with active state', async () => {
            const user = userEvent.setup()
            renderAdminApp('/admin')

            const nav = await screen.findByRole('navigation', {
                name: /admin portal navigation/i,
            })
            const queueLink = within(nav).getByRole('link', {
                name: /verification queue/i,
            })
            const auditLink = within(nav).getByRole('link', {
                name: /audit log/i,
            })
            const settingsLink = within(nav).getByRole('link', {
                name: /settings/i,
            })

            expect(queueLink).toHaveAttribute('aria-current', 'page')
            expect(auditLink).not.toHaveAttribute('aria-current', 'page')
            expect(settingsLink).not.toHaveAttribute('aria-current', 'page')

            await user.click(auditLink)
            expect(
                await screen.findByRole('heading', { name: /^audit log$/i }),
            ).toBeInTheDocument()
            expect(
                within(
                    screen.getByRole('navigation', {
                        name: /admin portal navigation/i,
                    }),
                ).getByRole('link', { name: /audit log/i }),
            ).toHaveAttribute('aria-current', 'page')

            await user.click(
                within(
                    screen.getByRole('navigation', {
                        name: /admin portal navigation/i,
                    }),
                ).getByRole('link', { name: /settings/i }),
            )
            expect(
                await screen.findByRole('heading', {
                    name: /organization settings/i,
                }),
            ).toBeInTheDocument()
            expect(
                within(
                    screen.getByRole('navigation', {
                        name: /admin portal navigation/i,
                    }),
                ).getByRole('link', { name: /settings/i }),
            ).toHaveAttribute('aria-current', 'page')
        })

        it('renders the pending-count badge with accessible name, hides it at 0, and stays silent on error', async () => {
            server.use(
                http.get('*/rest/v1/organizer_profiles', () =>
                    HttpResponse.json([
                        {
                            id: '11111111-1111-1111-1111-000000000001',
                            email: 'one@example.com',
                            full_name: 'Pending One',
                            status: 'pending',
                            created_at: '2026-09-01T08:00:00+08:00',
                            updated_at: '2026-09-01T08:00:00+08:00',
                        },
                        {
                            id: '11111111-1111-1111-1111-000000000002',
                            email: 'two@example.com',
                            full_name: 'Pending Two',
                            status: 'pending',
                            created_at: '2026-09-02T08:00:00+08:00',
                            updated_at: '2026-09-02T08:00:00+08:00',
                        },
                        {
                            id: '11111111-1111-1111-1111-000000000003',
                            email: 'three@example.com',
                            full_name: 'Pending Three',
                            status: 'pending',
                            created_at: '2026-09-03T08:00:00+08:00',
                            updated_at: '2026-09-03T08:00:00+08:00',
                        },
                    ]),
                ),
            )

            renderAdminApp('/admin/audit-log')

            const nav = await screen.findByRole('navigation', {
                name: /admin portal navigation/i,
            })
            const queueLink = await within(nav).findByRole('link', {
                name: 'Verification queue, 3 pending',
            })
            expect(within(queueLink).getByText('3')).toBeInTheDocument()

            // Zero pending hides the badge and omits the pending suffix from the accessible name
            cleanup()
            server.use(
                http.get('*/rest/v1/organizer_profiles', () =>
                    HttpResponse.json([]),
                ),
            )
            renderAdminApp('/admin/audit-log')
            await screen.findByText('organizer.verified')

            const emptyNav = screen.getByRole('navigation', {
                name: /admin portal navigation/i,
            })
            const emptyQueueLink = within(emptyNav).getByRole('link', {
                name: 'Verification queue',
            })
            expect(within(emptyQueueLink).queryByText('0')).not.toBeInTheDocument()

            // Error state stays silent in the nav (no alert, no badge)
            cleanup()
            server.use(
                http.get('*/rest/v1/organizer_profiles', () =>
                    HttpResponse.json(
                        {
                            code: 'INTERNAL_ERROR',
                            message: 'Queue unavailable',
                            details: null,
                            hint: null,
                        },
                        { status: 500 },
                    ),
                ),
            )
            renderAdminApp('/admin/audit-log')
            await screen.findByText('organizer.verified')

            const errorNav = screen.getByRole('navigation', {
                name: /admin portal navigation/i,
            })
            expect(
                within(errorNav).getByRole('link', {
                    name: 'Verification queue',
                }),
            ).toBeInTheDocument()
            expect(within(errorNav).queryByRole('alert')).not.toBeInTheDocument()
        })
    })

    describe('Audit log viewer (/admin/audit-log)', () => {
        it('renders audit entries and filters rows client-side by actor and action', async () => {
            const user = userEvent.setup()
            renderAdminApp('/admin/audit-log')

            expect(
                screen.getByLabelText('Loading audit log entries'),
            ).toBeInTheDocument()

            expect(
                await screen.findByText('organizer.verified'),
            ).toBeInTheDocument()
            expect(screen.getByText('attendee.approved')).toBeInTheDocument()
            expect(
                screen.getByText('checkin.attendee_scanned'),
            ).toBeInTheDocument()
            expect(
                screen.getByText('invitation_design.uploaded'),
            ).toBeInTheDocument()

            const filterInput = screen.getByRole('searchbox', {
                name: /filter audit log by actor or action/i,
            })

            // Filter by action
            await user.type(filterInput, 'organizer.verified')
            expect(screen.getByText('organizer.verified')).toBeInTheDocument()
            expect(
                screen.queryByText('attendee.approved'),
            ).not.toBeInTheDocument()
            expect(
                screen.queryByText('checkin.attendee_scanned'),
            ).not.toBeInTheDocument()

            // Clear and filter by actor
            await user.click(
                screen.getByRole('button', { name: /clear audit log filter/i }),
            )
            expect(screen.getByText('attendee.approved')).toBeInTheDocument()

            await user.type(filterInput, 'check-in staff')
            expect(
                screen.getByText('checkin.attendee_scanned'),
            ).toBeInTheDocument()
            expect(
                screen.queryByText('organizer.verified'),
            ).not.toBeInTheDocument()

            // Non-matching query displays empty filter state with Clear filter action
            await user.clear(filterInput)
            await user.type(filterInput, 'no-such-action-xyz')
            expect(
                screen.getByText(/no matching audit entries/i),
            ).toBeInTheDocument()
            await user.click(
                screen.getByRole('button', { name: /clear filter/i }),
            )
            expect(screen.getByText('organizer.verified')).toBeInTheDocument()
        })

        it('renders error state with retry and empty state', async () => {
            const user = userEvent.setup()
            let shouldFail = true
            server.use(
                http.get('*/rest/v1/audit_log_entries', () => {
                    if (shouldFail) {
                        shouldFail = false
                        return HttpResponse.json(
                            {
                                code: 'INTERNAL_ERROR',
                                message: 'Audit service unavailable',
                                details: null,
                                hint: null,
                            },
                            { status: 500 },
                        )
                    }
                    return HttpResponse.json([])
                }),
            )

            renderAdminApp('/admin/audit-log')

            expect(
                await screen.findByText(/audit log entries could not be loaded/i),
            ).toBeInTheDocument()
            expect(
                screen.getByText('Audit service unavailable'),
            ).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: /retry/i }))
            expect(
                await screen.findByText(/no audit log entries yet/i),
            ).toBeInTheDocument()
        })

        it('exports the filtered audit log entries as CSV with expected columns and filename', async () => {
            const user = userEvent.setup()
            let capturedBlob: Blob | null = null
            vi.spyOn(URL, 'createObjectURL').mockImplementation((obj) => {
                capturedBlob = obj as Blob
                return 'blob:audit-csv'
            })
            const revokeSpy = vi
                .spyOn(URL, 'revokeObjectURL')
                .mockImplementation(() => {})
            let downloadedFilename = ''
            vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
                function (this: HTMLAnchorElement) {
                    downloadedFilename = this.download
                },
            )

            renderAdminApp('/admin/audit-log')

            const exportButton = screen.getByRole('button', {
                name: /export csv/i,
            })
            expect(exportButton).toBeDisabled()

            expect(
                await screen.findByText('organizer.verified'),
            ).toBeInTheDocument()
            expect(exportButton).toBeEnabled()

            // Filter to a single entry and export
            const filterInput = screen.getByRole('searchbox', {
                name: /filter audit log by actor or action/i,
            })
            await user.type(filterInput, 'organizer.verified')
            await user.click(exportButton)

            expect(downloadedFilename).toMatch(
                /^eirmis-audit-log-\d{4}-\d{2}-\d{2}\.csv$/,
            )
            expect(revokeSpy).toHaveBeenCalledWith('blob:audit-csv')
            expect(capturedBlob).not.toBeNull()

            const csvText = await capturedBlob!.text()
            const lines = csvText.trim().split('\r\n')
            expect(lines).toHaveLength(2)
            expect(lines[0]).toBe(
                'Timestamp,Actor Type,Actor ID,Action,Entity Type,Entity ID,Summary,Reason',
            )
            expect(lines[1]).toContain('2026-12-10T09:15:00+08:00')
            expect(lines[1]).toContain('Admin')
            expect(lines[1]).toContain('22222222-2222-2222-2222-222222222222')
            expect(lines[1]).toContain('organizer.verified')
            expect(lines[1]).toContain('organizer_profile')
            expect(lines[1]).toContain('11111111-1111-1111-1111-111111111111')
            expect(lines[1]).toContain(
                'Completed identity and domain verification · status: pending → active',
            )
            expect(lines[1]).toContain(
                'Completed identity and domain verification',
            )
            expect(csvText).not.toContain('attendee.approved')

            // Zero filtered entries disables Export CSV
            await user.clear(filterInput)
            await user.type(filterInput, 'nonexistent-audit-query')
            expect(exportButton).toBeDisabled()
        })
    })

    describe('Verification queue (/admin)', () => {
        it('exposes only contract-defined OrganizerStatus filters and updates query params via MSW', async () => {
            const user = userEvent.setup()
            const capturedQueries: Array<{
                status: string | null
                limit: string | null
                offset: string | null
            }> = []

            server.use(
                http.get('*/rest/v1/organizer_profiles', ({ request }) => {
                    const url = new URL(request.url)
                    const status = url.searchParams.get('status')
                    const limit = url.searchParams.get('limit')
                    const offset = url.searchParams.get('offset')
                    capturedQueries.push({ status, limit, offset })

                    if (status === 'eq.active') {
                        return HttpResponse.json([
                            {
                                id: '11111111-1111-1111-1111-000000000099',
                                email: 'active.org@example.com',
                                full_name: 'Active Organizer',
                                status: 'active',
                                created_at: '2026-09-01T08:00:00+08:00',
                                updated_at: '2026-09-02T08:00:00+08:00',
                            },
                        ])
                    }
                    return HttpResponse.json([
                        {
                            id: '11111111-1111-1111-1111-111111111111',
                            email: 'organizer@example.com',
                            full_name: 'Jomari Barrera',
                            status: 'pending',
                            created_at: '2026-09-01T08:00:00+08:00',
                            updated_at: '2026-09-10T12:30:00+08:00',
                        },
                    ])
                }),
            )

            renderAdminApp('/admin')

            const filterGroup = screen.getByRole('group', {
                name: /filter by organizer status/i,
            })
            const filterButtons = within(filterGroup).getAllByRole('button')
            expect(filterButtons.map((btn) => btn.textContent)).toEqual([
                'Pending',
                'Active',
            ])
            expect(
                within(filterGroup).queryByRole('button', {
                    name: /suspended|rejected|approved/i,
                }),
            ).not.toBeInTheDocument()

            expect(
                await screen.findByText('Jomari Barrera'),
            ).toBeInTheDocument()
            expect(capturedQueries[0]).toEqual({
                status: 'eq.pending',
                limit: '20',
                offset: '0',
            })

            await user.click(
                within(filterGroup).getByRole('button', { name: /^active$/i }),
            )
            expect(
                await screen.findByText('Active Organizer'),
            ).toBeInTheDocument()
            expect(
                screen.queryByText('Jomari Barrera'),
            ).not.toBeInTheDocument()
            expect(capturedQueries.at(-1)).toEqual({
                status: 'eq.active',
                limit: '20',
                offset: '0',
            })
        })

        it('paginates with Previous/Next controls, inspects offset/limit queries, and enforces bounds', async () => {
            const user = userEvent.setup()
            const capturedRequests: Array<{
                status: string | null
                limit: string | null
                offset: string | null
            }> = []

            const onRequest = ({ request }: { request: Request }) => {
                const url = new URL(request.url)
                if (url.pathname.endsWith('/rest/v1/organizer_profiles')) {
                    capturedRequests.push({
                        status: url.searchParams.get('status'),
                        limit: url.searchParams.get('limit'),
                        offset: url.searchParams.get('offset'),
                    })
                }
            }
            server.events.on('request:start', onRequest)

            try {
                renderAdminApp('/admin')

                expect(
                    await screen.findByText('Jomari Barrera'),
                ).toBeInTheDocument()
                expect(screen.getByText('Page 1')).toBeInTheDocument()

                const prevButton = screen.getByRole('button', {
                    name: /previous/i,
                })
                const nextButton = screen.getByRole('button', {
                    name: /next/i,
                })
                expect(prevButton).toBeDisabled()
                expect(nextButton).toBeEnabled()

                await user.click(nextButton)

                expect(
                    await screen.findByText('Organizer 20'),
                ).toBeInTheDocument()
                expect(screen.getByText('Page 2')).toBeInTheDocument()
                expect(prevButton).toBeEnabled()
                expect(nextButton).toBeDisabled()

                expect(capturedRequests).toContainEqual({
                    status: 'eq.pending',
                    limit: '20',
                    offset: '0',
                })
                expect(capturedRequests).toContainEqual({
                    status: 'eq.pending',
                    limit: '20',
                    offset: '20',
                })

                await user.click(prevButton)
                expect(
                    await screen.findByText('Jomari Barrera'),
                ).toBeInTheDocument()
                expect(screen.getByText('Page 1')).toBeInTheDocument()
                expect(prevButton).toBeDisabled()
            } finally {
                server.events.removeListener('request:start', onRequest)
            }
        })

        it('approves a pending organizer, refreshes the filtered view, and records an audit entry', async () => {
            const user = userEvent.setup()
            renderAdminApp('/admin')

            expect(
                await screen.findByText('Jomari Barrera'),
            ).toBeInTheDocument()

            const row = screen.getByText('Jomari Barrera').closest('tr')
            expect(row).not.toBeNull()
            await user.click(
                within(row!).getByRole('button', { name: /approve/i }),
            )

            const dialog = await screen.findByRole('dialog')
            await user.click(
                within(dialog).getByRole('button', {
                    name: /confirm change/i,
                }),
            )

            await waitFor(() => {
                expect(
                    screen.queryByRole('dialog'),
                ).not.toBeInTheDocument()
            })

            // Still on Pending filter — approved organizer no longer appears in Pending
            await waitFor(() => {
                expect(
                    screen.queryByText('Jomari Barrera'),
                ).not.toBeInTheDocument()
            })

            // Switching to Active displays the newly approved organizer
            const filterGroup = screen.getByRole('group', {
                name: /filter by organizer status/i,
            })
            await user.click(
                within(filterGroup).getByRole('button', { name: /^active$/i }),
            )
            expect(
                await screen.findByText('Jomari Barrera'),
            ).toBeInTheDocument()

            // Navigate to Audit log via sub-nav and confirm status-change entry appears
            const nav = screen.getByRole('navigation', {
                name: /admin portal navigation/i,
            })
            await user.click(within(nav).getByRole('link', { name: /audit log/i }))

            expect(
                await screen.findByText('organizer.status_updated'),
            ).toBeInTheDocument()
            expect(
                screen.getByText(/administrator verification decision/i),
            ).toBeInTheDocument()
        })

        it('renders error state with retry and dashed empty state', async () => {
            const user = userEvent.setup()
            let shouldFail = true
            server.use(
                http.get('*/rest/v1/organizer_profiles', () => {
                    if (shouldFail) {
                        shouldFail = false
                        return HttpResponse.json(
                            {
                                code: 'INTERNAL_ERROR',
                                message: 'Profiles service down',
                                details: null,
                                hint: null,
                            },
                            { status: 500 },
                        )
                    }
                    return HttpResponse.json([])
                }),
            )

            renderAdminApp('/admin')

            expect(
                await screen.findByText(
                    /organizer profiles could not be loaded/i,
                ),
            ).toBeInTheDocument()
            await user.click(screen.getByRole('button', { name: /retry/i }))
            expect(
                await screen.findByRole('heading', {
                    name: /no pending organizer profiles/i,
                }),
            ).toBeInTheDocument()
        })

        it('searches current-page organizers by name and email, updates result count, and resets on status filter change', async () => {
            const user = userEvent.setup()
            const { router } = renderAdminApp('/admin')

            expect(
                await screen.findByText('Jomari Barrera'),
            ).toBeInTheDocument()
            expect(screen.getByText('20 organizers')).toBeInTheDocument()

            const searchLandmark = screen.getByRole('search', {
                name: /search organizer verification queue/i,
            })
            const searchInput = within(searchLandmark).getByRole('searchbox', {
                name: /search organizers by name or email/i,
            })

            // Filter by name
            await user.type(searchInput, 'Jomari')
            expect(screen.getByText('Jomari Barrera')).toBeInTheDocument()
            expect(screen.queryByText('Organizer 01')).not.toBeInTheDocument()
            expect(
                screen.getByText('20 organizers (1 matching)'),
            ).toBeInTheDocument()
            // Search stays ephemeral (not written to URL params)
            expect(router.state.location.search).toBe('')

            // Clear and filter by email
            await user.click(
                within(searchLandmark).getByRole('button', {
                    name: /clear organizer search/i,
                }),
            )
            expect(screen.getByText('20 organizers')).toBeInTheDocument()

            await user.type(searchInput, 'organizer05@example.com')
            expect(screen.getByText('Organizer 05')).toBeInTheDocument()
            expect(screen.queryByText('Jomari Barrera')).not.toBeInTheDocument()
            expect(
                screen.getByText('20 organizers (1 matching)'),
            ).toBeInTheDocument()

            // Non-matching query displays empty search state with Clear search button
            await user.clear(searchInput)
            await user.type(searchInput, 'no-matching-organizer-xyz')
            expect(
                screen.getByText('20 organizers (0 matching)'),
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: /no matching organizers/i }),
            ).toBeInTheDocument()
            await user.click(
                screen.getByRole('button', { name: /clear search/i }),
            )
            expect(screen.getByText('Jomari Barrera')).toBeInTheDocument()

            // Switching status filter resets the search input
            await user.type(searchInput, 'Jomari')
            expect(searchInput).toHaveValue('Jomari')
            const filterGroup = screen.getByRole('group', {
                name: /filter by organizer status/i,
            })
            await user.click(
                within(filterGroup).getByRole('button', { name: /^active$/i }),
            )
            expect(searchInput).toHaveValue('')
            expect(router.state.location.search).toBe('?status=active')

            // Navigating status via browser history (Back) also resets the search input
            await user.type(searchInput, 'Active')
            expect(searchInput).toHaveValue('Active')
            await act(async () => {
                await router.navigate(-1)
            })
            await waitFor(() => {
                expect(router.state.location.search).toBe('')
                expect(searchInput).toHaveValue('')
            })
        })
    })

    describe('Organization settings (/admin/settings)', () => {
        it('warns on unsaved-changes navigation and persists updates via PATCH', async () => {
            const user = userEvent.setup()
            let patchPayload: Record<string, unknown> | null = null
            let storedSettings = {
                id: '00000000-0000-0000-0000-000000000001',
                org_name: 'EIRMIS Enterprise Cloud Platform',
                default_timezone: 'Asia/Manila',
                default_capacity_ceiling: 150,
                sender_domain: 'invites.eirmis.org',
                malware_sandbox_enabled: true,
                self_registration_gate_enabled: true,
                created_at: '2026-09-01T08:00:00+08:00',
                updated_at: '2026-09-10T12:30:00+08:00',
            }

            server.use(
                http.get('*/rest/v1/org_settings', () =>
                    HttpResponse.json([storedSettings]),
                ),
                http.patch('*/rest/v1/org_settings', async ({ request }) => {
                    patchPayload = (await request.json()) as Record<
                        string,
                        unknown
                    >
                    storedSettings = {
                        ...storedSettings,
                        ...patchPayload,
                        updated_at: new Date().toISOString(),
                    }
                    return HttpResponse.json(storedSettings)
                }),
            )

            renderAdminApp('/admin/settings')

            const orgNameInput = await screen.findByLabelText(
                /organization \/ system instance name/i,
            )
            expect(orgNameInput).toHaveValue(
                'EIRMIS Enterprise Cloud Platform',
            )
            const saveButton = screen.getByRole('button', {
                name: /save organization settings/i,
            })
            expect(saveButton).toBeDisabled()

            // Edit org name → form becomes dirty
            await user.clear(orgNameInput)
            await user.type(orgNameInput, 'EIRMIS Civic Events Hub')
            expect(
                screen.getByText(/you have unsaved changes/i),
            ).toBeInTheDocument()
            expect(saveButton).toBeEnabled()

            // Browser reload / tab close triggers beforeunload prevention while dirty
            const beforeUnloadEvent = new Event('beforeunload', {
                cancelable: true,
            })
            window.dispatchEvent(beforeUnloadEvent)
            expect(beforeUnloadEvent.defaultPrevented).toBe(true)

            // Attempt in-app navigation via sub-nav → blocked with confirmation dialog
            const nav = screen.getByRole('navigation', {
                name: /admin portal navigation/i,
            })
            await user.click(
                within(nav).getByRole('link', { name: /audit log/i }),
            )
            const guardDialog = await screen.findByRole('dialog')
            expect(
                within(guardDialog).getByText(/leave with unsaved changes/i),
            ).toBeInTheDocument()

            // Stay on page keeps edited value
            await user.click(
                within(guardDialog).getByRole('button', {
                    name: /stay on page/i,
                }),
            )
            await waitFor(() => {
                expect(
                    screen.queryByRole('dialog'),
                ).not.toBeInTheDocument()
            })
            expect(orgNameInput).toHaveValue('EIRMIS Civic Events Hub')

            // Save persists via PATCH and re-syncs clean form state
            await user.click(saveButton)

            await waitFor(() => {
                expect(patchPayload).toMatchObject({
                    org_name: 'EIRMIS Civic Events Hub',
                })
            })
            await waitFor(() => {
                expect(saveButton).toBeDisabled()
            })
            expect(
                screen.queryByText(/you have unsaved changes/i),
            ).not.toBeInTheDocument()
            expect(orgNameInput).toHaveValue('EIRMIS Civic Events Hub')

            // Clean navigation away now succeeds without warning dialog
            await user.click(
                within(nav).getByRole('link', { name: /audit log/i }),
            )
            expect(
                await screen.findByRole('heading', { name: /^audit log$/i }),
            ).toBeInTheDocument()
        })
    })
})
