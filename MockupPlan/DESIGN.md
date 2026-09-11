---
name: EIRMIS Design System
colors:
  primary: '#4F46E5'
  primary-hover: '#4338CA'
  primary-subtle: '#EEF2FF'
  primary-border: '#C7D2FE'
  secondary: '#0D9488'
  secondary-hover: '#0F766E'
  dark: '#0F172A'
  dark-surface: '#1E293B'
  background: '#F8FAFC'
  surface: '#FFFFFF'
  border: '#E2E8F0'
  border-subtle: '#F1F5F9'
  text-main: '#0F172A'
  text-muted: '#64748B'
  text-subtle: '#94A3B8'
  success: '#10B981'
  success-bg: '#ECFDF5'
  success-border: '#A7F3D0'
  warning: '#F59E0B'
  warning-bg: '#FFFBEB'
  warning-border: '#FDE68A'
  error: '#EF4444'
  error-bg: '#FEF2F2'
  error-border: '#FECACA'
typography:
  heading:
    fontFamily: Hanken Grotesk / Plus Jakarta Sans
    fontWeight: '700-800'
    letterSpacing: -0.02em
  body:
    fontFamily: Inter
    fontSize: 13.5px
    lineHeight: 1.5
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is engineered for a high-performance Event Invitation and RSVP Management Information System (EIRMIS). The brand personality is **Professional, Efficient, and Enterprise-ready**, prioritizing clarity and trust over decorative elements.

The visual style is **Modern SaaS Minimalism** with a glassmorphic chrome: frosted-glass navigation bars (`backdrop-filter: blur`), generous white space, a structured information hierarchy, and high-precision UI elements. The interface avoids unnecessary flair, opting instead for functional clarity that allows event planners and attendees to focus on critical data and workflows. The emotional response should be one of reliability and systematic control.

## Colors
The palette is rooted in a professional **Indigo** primary, symbolizing technology and stability, balanced by a **Teal** secondary for growth and vibrancy.

- **Primary (#4F46E5):** Used for main actions, active states, and brand recognition. Hover state is **#4338CA**.
- **Secondary (#008A88 → #0D9488):** Used for accenting specific invitation flows or RSVP status indicators. Hover state is **#0F766E**.
- **Tertiary/Dark (#0F172A):** Used for high-level navigation backgrounds, dark headers, and the digital-wallet pass to provide contrast. Dark surface is **#1E293B**.
- **Neutrals:** A scale of cool grays (Slate) is used for borders and text to maintain an airy, modern SaaS feel — background **#F8FAFC**, surface **#FFFFFF**, borders **#E2E8F0**, muted text **#64748B**.
- **Semantic Colors:** Reserved strictly for feedback — Green for confirmed RSVPs/approved, Amber for pending/tentative, and Red for declined or over-capacity alerts.

## Typography
The system uses **Hanken Grotesk** (Landing and Admin portals) and **Plus Jakarta Sans** (Organizer, Guest, and Check-in Staff portals) for headings to provide a sharp, contemporary edge, while **Inter** is utilized for body text and labels to ensure maximum legibility at small sizes.

- **Headings:** Use the display font with tight letter-spacing (`-0.02em`) and weights 700–800 for a sophisticated, executive look.
- **Body Text:** Inter is used at 13.5px for data-heavy views and 16px for standard reading.
- **Accessibility:** Line heights are set to a minimum of 1.5x for body text to ensure WCAG compliance.
- **Mobile Scale:** Page headings scale down on mobile devices to prevent excessive text wrapping.

## Layout & Spacing
This design system employs an **8px linear grid system** for consistent vertical and horizontal rhythm.

- **Grid Model:** A 12-column fluid grid is used for desktop dashboards, transitioning to a single-column stacked layout for mobile.
- **Margins & Gutters:** Desktop views use 24px margins and gutters. Mobile views reduce margins to 16px to maximize screen real estate.
- **In-component Spacing:** Smaller 4px and 8px increments are used for internal padding within buttons and input fields to maintain a tight, professional feel.
- **Container:** Content is centered with a max-width of 1280px (desktop portals) or 500–680px (mobile-first Guest and Check-in Staff portals).

## Elevation & Depth
The system uses a **Tonal Layering** approach combined with **Subtle Ambient Shadows** to denote depth without cluttering the UI.

- **Level 0 (Background):** #F8FAFC. The base layer for the application.
- **Level 1 (Surface/Cards):** #FFFFFF with a 1px solid #E2E8F0 border.
- **Level 2 (Dropdowns/Modals):** These elements use a soft shadow: `0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.03)`.
- **Level 3 (Overlays):** High-diffusion shadows (`0 16px 32px -4px rgba(15, 23, 42, 0.12)`) to create a clear separation from the background content.
- **Glassmorphism:** Navigation bars and sidebars use a translucent surface (`rgba(255, 255, 255, 0.85–0.94)`) with `backdrop-filter: blur(16–20px)`.

## Shapes
The shape language is structured and "Soft-Rounded," avoiding both sharp corporate corners and overly playful pill shapes.

- **Cards:** Use a 12–20px radius to create a distinct frame for event details.
- **Interactive Elements:** Buttons and input fields use an 8px radius to signify clickability while maintaining an enterprise aesthetic.
- **Small Components:** Tooltips and badges use a pill radius (9999px) for status chips.

## Components

### Buttons
- **Primary:** Solid #4F46E5 background, White text, 8px radius. High-contrast hover state (#4338CA).
- **Secondary:** Transparent background, #4F46E5 border and text.
- **Ghost:** No border, #64748B text, used for less prominent actions.
- **Teal:** Solid #0D9488 background, used for invitation/RSVP accents.

### Cards
- White background, 12–20px radius, 1px #E2E8F0 border.
- Subtle drop shadow only on hover for interactive event cards.

### Input Fields
- 8px radius, #E2E8F0 border, Inter 13.5px text.
- Focused state uses a 3px ring of #4F46E5 with ~12% opacity.

### Chips/Badges
- Used for RSVP status and lifecycle states.
- Confirmed/Approved: Light Green background, Dark Green text.
- Declined/Rejected: Light Red background, Dark Red text.
- Pending/Tentative: Light Amber background, Dark Amber text.

### Lists & Tables
- Border-bottom #E2E8F0 between rows.
- Alternating row highlights are not used; instead, use 8px vertical padding to maintain white space.

### RSVP Progress Bar
- A custom component utilizing the Primary Indigo color to show the percentage of responded invitations against the total guest list. A segmented variant (accepted/declined/tentative/no-response) uses green/red/amber/gray segments.