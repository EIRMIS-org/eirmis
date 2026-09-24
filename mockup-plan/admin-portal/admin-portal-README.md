# Admin Portal — Mockup

> **Purpose:** The System Administrator's workspace — verify newly self-registered organizers and manage org-wide settings. The admin is the **sole trust gate** for who can create events.

## 1. What this mockup covers

A single interactive `admin-portal.html` simulating the Admin routes from the main [`README.md`](../../README.md) §8:

| Route (README §8) | Feature |
|---|---|
| `/admin/organizers` | Organizer verification queue |
| `/admin/settings` | Org-wide settings |

## 2. Design system applied (from [`design.md`](../design.md))

- **Layout:** desktop-first; top header with brand + user profile badge.
- **Primary Indigo `#4F46E5`** for the "Activate" action.
- **Semantic colors:** Amber = `pending` organizer, Green = `active` organizer.
- **Tables:** border-bottom `#E2E8F0`, 8px row padding, no alternating colors.
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.

## 3. Screen structure (single-page, two views)

1. **Organizer verification queue** — a table of `pending` organizers (name, email, org, sign-up date) with an **Activate** action that flips `pending → active`. A KPI strip shows pending/active/total counts, and a segmented control switches between the Organizers and Settings tabs.
2. **Org-wide settings** — a settings panel (org name, default timezone, security toggles) with a save action.

## 4. Shared runtime integration

This portal loads the shared runtime [`eirmis.js`](../assets/eirmis.js) and design system [`eirmis.css`](../assets/eirmis.css):

- **Global navigation bar** — cross-portal chrome injected at the top.
- **Session management** — preset user switching and sign-out, persisted to `localStorage`.
- **Boot loading shimmer** — branded loading overlay on first load.
- **Toast notifications** — production toasts with progress bars, icons, and auto-dismiss.
- **Cross-portal state sync** — activating an organizer updates the shared store, so the organizer's status is consistent across portals.

## 5. Production-ready behaviors

- **Verification queue** — Activate button opens a confirmation modal (audited action) before flipping `pending → active`.
- **KPI strip** — live counts of pending/active organizers.
- **Segmented tabs** — Organizers ↔ Settings switching.
- **Zero-knowledge boundary** — the mockup deliberately includes **no** guest-list, RSVP, or attendee screens, reinforcing the admin's access boundary.
- **Accessibility** — ARIA roles on dialogs, `:focus-visible` rings, keyboard-operable controls.
- **Responsive** — desktop-first layout.

## 6. Important boundary to document (from README §6)

The admin has **no access** to any event's guest list, RSVP content, or attendee data. The mockup visually reinforces this by *not* including any such screens — only the verification queue and settings.

## 7. How to run the mockup flow

1. Start from `MockupPlan/landing/landing.html`.
2. Click the **Admin** role card → simulated Google Sign-In → lands on this portal's `admin-portal.html`.
3. Alternatively open `MockupPlan/admin-portal/admin-portal.html` directly.

## 8. Files in this folder

- `admin-portal.html` — the interactive admin mockup.
- `admin-portal-README.md` — this documentation.

## 9. Acceptance checklist

- [x] Verification queue with `pending → active` transition.
- [x] Status chips use semantic colors from `design.md`.
- [x] No guest-list/RSVP/attendee screens present (respects the access boundary).
- [x] Desktop-first layout.
- [x] Shared runtime provides global nav, session switching, toasts, and cross-portal sync.