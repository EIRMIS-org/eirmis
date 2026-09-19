# EIRMIS — Mockup Plan (UI/UX Prototype Suite)

> **Purpose:** A complete, interactive, production-polished UI/UX prototype of the EIRMIS event-invitation platform. It simulates the full user journey across all four roles — **Organizer, Admin, Guest, and Check-in Staff** — using zero-dependency vanilla HTML/CSS/JS. This is the visual contract that guides the production React/TypeScript + Supabase build.

## 1. What this is

The `MockupPlan/` folder is a **clickable prototype**, not the production codebase. It demonstrates every screen, flow, and interaction from the main [`README.md`](../README.md) specification before they are built in `src/` and `supabase/`.

- **No build step** — every portal is a single HTML file that opens directly in a browser.
- **Shared runtime** — all portals load the same [`assets/eirmis.js`](assets/eirmis.js) and [`assets/eirmis.css`](assets/eirmis.css) for consistent chrome, state, and styling.
- **Cross-portal sync** — a shared `localStorage` store makes actions in one portal appear in the others, simulating a real backend.

## 2. Folder structure

```
MockupPlan/
├── README.md              ← this guide (overview & flow)
├── design.md              ← design tokens & system (colors, type, spacing)
├── assets/
│   ├── eirmis.js          ← shared runtime (state, session, nav, toasts)
│   ├── eirmis.css         ← design system (tokens, components, responsive)
│   └── README.md          ← how the shared runtime & design system work
├── landing/               ← public hub + auth (entry point)
├── organizer-portal/      ← event organizer workspace
├── admin-portal/          ← system admin verification & settings
├── guest-portal/          ← guest self-service (RSVP, roster, QR)
└── checkin-staff-portal/  ← event-day scanning surface
```

## 3. The user flow (how the pieces connect)

The prototype is designed to be walked through as a **single journey**, starting at the LandingPage:

```
LandingPage (public hub)
   │
   ├── Organizer card ──► Google Sign-In ──► Organizer Portal
   │                        (create event, build guest list, approve,
   │                         configure reminders, upload design, run check-in)
   │
   ├── Admin card ──────► Google Sign-In ──► Admin Portal
   │                        (verify & activate organizers, org settings)
   │
   ├── Guest card ──────► magic link ──────► Guest Portal
   │                        (RSVP, submit roster, request heads, download QR)
   │
   └── Staff card ──────► magic link ──────► Check-in Staff Portal
                            (scan/search attendees, walk-ins)
```

**Cross-portal handoffs** (the key demo value):

| Action in one portal | Visible effect in another |
|---|---|
| Organizer approves an attendee | Guest sees the updated RSVP/roster status |
| Check-in Staff checks someone in | Organizer attendance dashboard count updates |
| Admin activates an organizer | Organizer's account becomes `active` everywhere |
| Guest submits a roster / requests heads | Organizer approval & headcount queues update |

## 4. The four roles & their portals

| Role | Portal | What it demonstrates |
|---|---|---|
| **Organizer** | [`organizer-portal/`](organizer-portal/) | Event CRUD + 4-step create wizard, guest list, approval queue with audited capacity override, reminders, invitation design validation, live attendance, waitlist FIFO, check-in config, staff assignments, email/audit logs |
| **Admin** | [`admin-portal/`](admin-portal/) | Organizer verification queue (`pending → active`), org-wide settings, zero-knowledge access boundary |
| **Guest** | [`guest-portal/`](guest-portal/) | Mobile-first RSVP, roster submission with `max_party_size` ceiling, rejected-attendee resubmit, headcount requests, wallet-style QR pass |
| **Check-in Staff** | [`checkin-staff-portal/`](checkin-staff-portal/) | Scoped scanning screen, scan-result state machine, manual search, walk-in registration |

## 5. How to run it

**Option A — open directly (no setup):**
1. Open [`landing/landing.html`](landing/landing.html) in a browser.
2. Click a role card to walk through that role's auth flow and portal.

**Option B — static server (recommended for full cross-portal sync):**
```bash
# from the repo root
npx serve MockupPlan
# then open http://localhost:3000/landing/landing.html
```

> **Tip:** Use the **global navigation bar** (injected at the top of every portal) to jump between all 5 portals instantly. Use the **session pill** to switch identities (Organizer / Admin / Guest / Staff) without re-authenticating.

## 6. Shared runtime & design system

All portals share two files that provide production-grade behavior out of the box:

- **[`assets/eirmis.js`](assets/eirmis.js)** — global nav, session management, toast notifications, boot loading overlay, and the shared `localStorage` state store that powers cross-portal sync.
- **[`assets/eirmis.css`](assets/eirmis.css)** — the authoritative design tokens (Indigo/Teal/Slate), component primitives (buttons, chips, skeletons, empty states), and responsive rules.

See [`assets/README.md`](assets/README.md) for the full API and how to extend it.

## 7. Design system

The visual language is defined in [`design.md`](design.md) and implemented as CSS custom properties in [`assets/eirmis.css`](assets/eirmis.css):

- **Brand:** Modern SaaS Minimalism — professional, efficient, enterprise-ready.
- **Primary:** Indigo `#4F46E5` · **Secondary:** Teal `#0D9488` · **Dark:** `#0F172A`
- **Neutrals:** Slate scale (`#F8FAFC` bg → `#0F172A` text)
- **Typography:** Hanken Grotesk / Plus Jakarta Sans (headings) + Inter (body)
- **Radii:** 8px (sm) / 12px (md) / 16px (lg) · **8px grid** layout

## 8. Production-ready behaviors

Every portal includes production-grade polish:

- **Async simulation** — auth, approvals, and check-ins show realistic loading states.
- **Real-time feel** — attendance and approval queues update live.
- **Cross-portal sync** — shared state via `localStorage`.
- **Form validation** — inline error states with the design system's error color.
- **Accessibility** — ARIA roles, `:focus-visible` rings, keyboard navigation, live regions.
- **Micro-interactions** — toasts with progress bars, modals with focus management, debounced search.
- **Responsive** — desktop-first for Organizer/Admin, mobile-first for Guest/Staff.

## 9. Relationship to the production build

| Layer | Mockup (this folder) | Production |
|---|---|---|
| UI | Vanilla HTML/CSS/JS, single-file portals | React 19 + TypeScript + Vite |
| State | `localStorage` shared store | Supabase (Postgres + RLS + Realtime) |
| Auth | Simulated Google / magic link | Supabase Auth |
| Data | Seed objects in `eirmis.js` | Supabase migrations in `supabase/` |

The mockups are the **visual contract**; the production code in `src/` and `supabase/` implements the same flows with real infrastructure.

## 10. Documentation map

| File | What it documents |
|---|---|
| [`README.md`](README.md) | This overview & usage guide |
| [`design.md`](design.md) | Design tokens & system |
| [`assets/README.md`](assets/README.md) | Shared runtime & design system implementation |
| [`landing/landing-README.md`](landing/landing-README.md) | Public hub & auth mockup |
| [`organizer-portal/organizer-portal-README.md`](organizer-portal/organizer-portal-README.md) | Organizer workspace mockup |
| [`admin-portal/admin-portal-README.md`](admin-portal/admin-portal-README.md) | Admin verification & settings mockup |
| [`guest-portal/guest-portal-README.md`](guest-portal/guest-portal-README.md) | Guest self-service mockup |
| [`checkin-staff-portal/checkin-staff-portal-README.md`](checkin-staff-portal/checkin-staff-portal-README.md) | Check-in scanning mockup |