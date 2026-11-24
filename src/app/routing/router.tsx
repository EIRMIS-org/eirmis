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

/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RoleGuard } from './role-guard'
import { NotFoundPage } from './not-found-page'
import { StyleguideRoute } from './styleguide-route'
import { LandingLayout } from '@/pages/landing/landing-layout'
import { LandingPage } from '@/pages/landing/landing-page'
import { PendingVerificationPage } from '@/pages/landing/pending-verification-page'
import { PublicEventPage } from '@/pages/landing/public-event-page'
import { OrganizerLayout } from '@/pages/organizer/organizer-layout'
const EventsPage = lazy(() =>
  import('@/pages/organizer/events-page').then((m) => ({ default: m.EventsPage })),
)
const CreateEventPage = lazy(() =>
  import('@/pages/organizer/create-event-page').then((m) => ({ default: m.CreateEventPage })),
)
const EventWorkspacePage = lazy(() =>
  import('@/pages/organizer/event-workspace-page').then((m) => ({ default: m.EventWorkspacePage })),
)
const OrganizerSettingsPage = lazy(() =>
  import('@/pages/organizer/organizer-settings-page').then((m) => ({ default: m.OrganizerSettingsPage })),
)
import { GuestLayout } from '@/pages/guest/guest-layout'
import { StaffLayout } from '@/pages/staff/staff-layout'
const StaffScanPage = lazy(() =>
  import('@/pages/staff/staff-scan-page').then((m) => ({ default: m.StaffScanPage })),
)
const StaffSearchPage = lazy(() =>
  import('@/pages/staff/staff-search-page').then((m) => ({ default: m.StaffSearchPage })),
)
import { AdminLayout } from '@/pages/admin/admin-layout'
import { DocsPage } from '@/pages/shared/docs-page'
const GuestInvitationsPage = lazy(() =>
  import('@/pages/guest/guest-invitations-page').then((m) => ({ default: m.GuestInvitationsPage })),
)
const InvitationDetailPage = lazy(() =>
  import('@/pages/guest/invitation-detail-page').then((m) => ({ default: m.InvitationDetailPage })),
)
const GuestProfilePage = lazy(() =>
  import('@/pages/guest/guest-profile-page').then((m) => ({ default: m.GuestProfilePage })),
)
const AdminSettingsPage = lazy(() =>
  import('@/pages/admin/admin-settings-page').then((m) => ({ default: m.AdminSettingsPage })),
)
const AdminVerificationQueuePage = lazy(() =>
  import('@/pages/admin/admin-verification-queue-page').then((m) => ({ default: m.AdminVerificationQueuePage })),
)
const AdminAuditLogPage = lazy(() =>
  import('@/pages/admin/admin-audit-log-page').then((m) => ({ default: m.AdminAuditLogPage })),
)

const portalFallback = (
  <div
    role="status"
    aria-label="Loading portal view"
    className="flex flex-1 items-center justify-center p-12 text-sm text-muted-foreground"
  >
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
      />
      <span>Loading view…</span>
    </div>
  </div>
)

export const router = createBrowserRouter([
  // ── Public: landing (task 06 fills the outlet) ────────────────────────
  {
    path: "/",
    element: <LandingLayout />,
    children: [
      {
        index: true,
        element: (
          <LandingPage />
        ),
      },
      {
        path: 'pending-verification',
        element: <PendingVerificationPage />,
      },
      {
        // Public registration entry point per the contract's /register/:slug flow.
        path: 'register/:slug',
        element: <PublicEventPage />,
      },
    ],
  },

  // ── Public: migrated from App.tsx ─────────────────────────────────────
  { path: "/docs", element: <DocsPage /> },
  { path: "/styleguide", element: <StyleguideRoute /> },

  // ── Organizer portal (task 07) ────────────────────────────────────────
  {
    element: (
      <RoleGuard allow={['organizer']}>
        <OrganizerLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'organizer', element: <Suspense fallback={portalFallback}><EventsPage /></Suspense> },
      { path: 'organizer/events/new', element: <Suspense fallback={portalFallback}><CreateEventPage /></Suspense> },
      { path: 'organizer/events/:eventId', element: <Suspense fallback={portalFallback}><EventWorkspacePage /></Suspense> },
      { path: 'organizer/settings', element: <Suspense fallback={portalFallback}><OrganizerSettingsPage /></Suspense> },
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
      { path: 'guest', element: <Suspense fallback={portalFallback}><GuestInvitationsPage /></Suspense> },
      { path: 'guest/profile', element: <Suspense fallback={portalFallback}><GuestProfilePage /></Suspense> },
      {
        path: 'guest/invitations/:invitationId',
        element: <Suspense fallback={portalFallback}><InvitationDetailPage /></Suspense>,
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
      { path: 'staff', element: <Suspense fallback={portalFallback}><StaffScanPage /></Suspense> },
      { path: 'staff/search', element: <Suspense fallback={portalFallback}><StaffSearchPage /></Suspense> },
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
        element: <Suspense fallback={portalFallback}><AdminVerificationQueuePage /></Suspense>,
      },
      {
        path: "admin/settings",
        element: <Suspense fallback={portalFallback}><AdminSettingsPage /></Suspense>,
      },
      {
        path: "admin/audit-log",
        element: <Suspense fallback={portalFallback}><AdminAuditLogPage /></Suspense>,
      },
    ],
  },

  // ── 404 catch-all ─────────────────────────────────────────────────────
  { path: "*", element: <NotFoundPage /> },
])
