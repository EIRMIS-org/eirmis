/**
 * src/app/routing/router.tsx
 *
 * Task 04 — Routing & Role Guards (M4 Frontend Week 1)
 *
 * Single source of truth for the route table (plan §task-04). Portal
 * tasks (06–10) fill the layout outlets with real pages — they request
 * route changes on the task board instead of editing this file, keeping
 * the README conflict map honest.
 *
 * Guards are declarative: each portal subtree is wrapped in RoleGuard
 * with the roles allowed inside. Signed-out users are redirected to `/`;
 * wrong-role users get the shared 403 screen.
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RoleGuard } from './role-guard'
import { NotFoundPage } from './not-found-page'
import { LandingLayout } from '@/pages/landing/landing-layout'
import { OrganizerLayout } from '@/pages/organizer/organizer-layout'
import { EventsPage } from '@/pages/organizer/events-page'
import { CreateEventPage } from '@/pages/organizer/create-event-page'
import { EventWorkspacePage } from '@/pages/organizer/event-workspace-page'
import { GuestLayout } from '@/pages/guest/guest-layout'
import { StaffLayout } from '@/pages/staff/staff-layout'
import { StaffScanPage } from '@/pages/staff/staff-scan-page'
import { StaffSearchPage } from '@/pages/staff/staff-search-page'
import { AdminLayout } from '@/pages/admin/admin-layout'
import { PlaceholderPage } from '@/pages/shared/placeholder-page'
import { DocsPage } from '@/pages/shared/docs-page'
import { GuestInvitationsPage } from '@/pages/guest/guest-invitations-page'
import { InvitationDetailPage } from '@/pages/guest/invitation-detail-page'

const Styleguide = lazy(() => import('@/Styleguide'))

export const router = createBrowserRouter([
  // ── Public: landing (task 06 fills the outlet) ────────────────────────
  {
    path: "/",
    element: <LandingLayout />,
    children: [
      {
        index: true,
        element: (
          <PlaceholderPage
            title="Public Hub"
            note="Filled by task 06 — Landing & Auth"
          />
        ),
      },
    ],
  },

  // ── Public: migrated from App.tsx ─────────────────────────────────────
  { path: "/docs", element: <DocsPage /> },
  {
    path: "/styleguide",
    element: (
      <Suspense fallback={<p>Loading style guide...</p>}>
        <Styleguide />
      </Suspense>
    ),
  },

  // ── Organizer portal (task 07) ────────────────────────────────────────
  {
    element: (
      <RoleGuard allow={['organizer']}>
        <OrganizerLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'organizer', element: <EventsPage /> },
      { path: 'organizer/events/new', element: <CreateEventPage /> },
      { path: 'organizer/events/:eventId', element: <EventWorkspacePage /> },
    ],
  },

  // ── Guest portal (task 08) ────────────────────────────────────────────
  {
    element: (
      <RoleGuard allow={['guest']}>
        <GuestLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'guest', element: <GuestInvitationsPage /> },
      {
        path: 'guest/invitations/:invitationId',
        element: <InvitationDetailPage />,
      },
    ],
  },

  // ── Check-in staff portal (task 09) ───────────────────────────────────
  {
    element: (
      <RoleGuard allow={['checkin']}>
        <StaffLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'staff', element: <StaffScanPage /> },
      { path: 'staff/search', element: <StaffSearchPage /> },
    ],
  },

  // ── Admin portal (task 10) ────────────────────────────────────────────
  {
    element: (
      <RoleGuard allow={["admin"]}>
        <AdminLayout />
      </RoleGuard>
    ),
    children: [
      {
        path: "admin",
        element: (
          <PlaceholderPage
            title="Admin — Verification Queue"
            note="Filled by task 10 — Admin Portal"
          />
        ),
      },
      {
        path: "admin/settings",
        element: (
          <PlaceholderPage
            title="Admin — Org Settings"
            note="Filled by task 10"
          />
        ),
      },
    ],
  },

  // ── 404 catch-all ─────────────────────────────────────────────────────
  { path: "*", element: <NotFoundPage /> },
])

/** App entry renders this — keeps App.tsx a one-liner. */
export function AppRouter() {
  return <RouterProvider router={router} />
}
