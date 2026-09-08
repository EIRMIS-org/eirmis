# Admin Portal — Mockup Implementation Plan

> **Purpose:** The System Administrator's workspace — verify newly self-registered organizers and manage org-wide settings. The admin is the **sole trust gate** for who can create events.

## 1. What this mockup covers

A single interactive `index.html` simulating the Admin routes from the main [`README.md`](../../README.md) §8:

| Route (README §8) | Feature |
|---|---|
| `/admin/organizers` | Organizer verification queue |
| `/admin/settings` | Org-wide settings |

## 2. Design system to apply (from [`DESIGN.md`](../DESIGN.md))

- **Layout:** desktop-first; top or left nav (Tertiary `#0F172A`).
- **Primary Indigo `#4F46E5`** for the "Activate" action.
- **Semantic colors:** Amber = `pending` organizer, Green = `active` organizer.
- **Tables:** border-bottom `#E2E8F0`, 8px row padding, no alternating colors.
- **Cards:** 12px radius, white, 1px `#E2E8F0` border.

## 3. Screen structure (single-page, two views)

1. **Organizer verification queue** — a table of `pending` organizers (name, email, sign-up date) with an **Activate** action that flips `pending → active`.
2. **Org-wide settings** — a settings panel (org name, default timezone, etc.) — read-only-ish in the mockup.

## 4. Interactivity (vanilla JS)

- Toggle between the two views.
- Activate button updates the organizer's status chip from amber (`pending`) to green (`active`).
- A confirmation modal before activation (audited action).

## 5. Important boundary to document (from README §6)

The admin has **no access** to any event's guest list, RSVP content, or attendee data. The mockup should visually reinforce this by *not* including any such screens — only the verification queue and settings.

## 6. How to start the mockup flow

1. Start from `MockupPlan/LandingPage/index.html`.
2. Click the **Admin** role card → simulated Google Sign-In → lands on this portal's `index.html`.
3. Alternatively open `MockupPlan/Admin Portal/index.html` directly.

## 7. Files to create in this folder

- `index.html` — the interactive admin mockup (to be built next).
- `README.md` — this plan.

## 8. Acceptance checklist

- [ ] Verification queue with `pending → active` transition.
- [ ] Status chips use semantic colors from `DESIGN.md`.
- [ ] No guest-list/RSVP/attendee screens present (respects the access boundary).
- [ ] Desktop-first layout.