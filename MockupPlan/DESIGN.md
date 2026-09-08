---
name: EIRMIS Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006a68'
  on-secondary: '#ffffff'
  secondary-container: '#8af1ee'
  on-secondary-container: '#006e6d'
  tertiary: '#41485e'
  on-tertiary: '#ffffff'
  tertiary-container: '#586076'
  on-tertiary-container: '#d4dbf5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#8df3f0'
  secondary-fixed-dim: '#70d7d4'
  on-secondary-fixed: '#00201f'
  on-secondary-fixed-variant: '#00504e'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  page-heading:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  page-heading-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  section-heading:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is engineered for a high-performance Event Invitation and RSVP Management Information System (EIRMIS). The brand personality is **Professional, Efficient, and Enterprise-ready**, prioritizing clarity and trust over decorative elements.

The visual style is **Modern SaaS Minimalism**. It utilizes a "content-first" approach with generous white space, a structured information hierarchy, and high-precision UI elements. The interface avoids unnecessary flair, opting instead for functional clarity that allows event planners and attendees to focus on critical data and workflows. The emotional response should be one of reliability and systematic control.

## Colors
The palette is rooted in a professional **Indigo** primary, symbolizing technology and stability, balanced by a **Teal** secondary for growth and vibrancy. 

- **Primary (#4F46E5):** Used for main actions, active states, and brand recognition.
- **Secondary (#008A88):** Used for accenting specific invitation flows or RSVP status indicators.
- **Tertiary/Dark (#0F172A):** Used for high-level navigation backgrounds or dark-mode headers to provide contrast.
- **Neutrals:** A scale of cool grays (Slate) is used for borders and text to maintain an airy, modern SaaS feel.
- **Semantic Colors:** Reserved strictly for feedback—Green for confirmed RSVPs, Yellow for pending, and Red for declined or over-capacity alerts.

## Typography
The system uses **Hanken Grotesk** for headings to provide a sharp, contemporary edge, while **Inter** is utilized for body text and labels to ensure maximum legibility at small sizes.

- **Headings:** Utilize Hanken Grotesk with tight letter-spacing for a sophisticated, executive look.
- **Body Text:** Inter is used at 14px for data-heavy views and 16px for standard reading. 
- **Accessibility:** Line heights are set to a minimum of 1.5x for body text to ensure WCAG compliance.
- **Mobile Scale:** Page headings scale down to 24px on mobile devices to prevent excessive text wrapping.

## Layout & Spacing
This design system employs an **8px linear grid system** for consistent vertical and horizontal rhythm. 

- **Grid Model:** A 12-column fluid grid is used for desktop dashboards, transitioning to a single-column stacked layout for mobile.
- **Margins & Gutters:** Desktop views use 24px (lg) margins and gutters. Mobile views reduce margins to 16px (md) to maximize screen real estate.
- **In-component Spacing:** Smaller 4px and 8px increments are used for internal padding within buttons and input fields to maintain a tight, professional feel.

## Elevation & Depth
The system uses a **Tonal Layering** approach combined with **Subtle Ambient Shadows** to denote depth without cluttering the UI.

- **Level 0 (Background):** #F8FAFC. The base layer for the application.
- **Level 1 (Surface/Cards):** #FFFFFF with a 1px solid #E2E8F0 border.
- **Level 2 (Dropdowns/Modals):** These elements use a soft shadow: `0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.05)`.
- **Level 3 (Overlays):** High-diffusion shadows to create a clear separation from the background content.

## Shapes
The shape language is structured and "Soft-Rounded," avoiding both sharp corporate corners and overly playful pill shapes.

- **Cards:** Use a 12px radius to create a distinct frame for event details.
- **Interactive Elements:** Buttons and input fields use an 8px radius to signify clickability while maintaining an enterprise aesthetic.
- **Small Components:** Tooltips and badges use a 4px (sm) radius.

## Components

### Buttons
- **Primary:** Solid #4F46E5 background, White text, 8px radius. High-contrast hover state (#4338CA).
- **Secondary:** Transparent background, #4F46E5 border and text.
- **Ghost:** No border, #64748B text, used for less prominent actions.

### Cards
- White background, 12px radius, 1px #E2E8F0 border.
- Subtle drop shadow only on hover for interactive event cards.

### Input Fields
- 8px radius, #E2E8F0 border, Inter 14px text.
- Focused state uses a 2px ring of #4F46E5 with 20% opacity.

### Chips/Badges
- Used for RSVP status.
- Confirmed: Light Green background, Dark Green text.
- Declined: Light Red background, Dark Red text.
- Pending: Light Amber background, Dark Amber text.

### Lists & Tables
- Border-bottom #E2E8F0 between rows.
- Alternating row highlights are not used; instead, use 8px vertical padding to maintain white space.

### RSVP Progress Bar
- A custom component utilizing the Primary Indigo color to show the percentage of responded invitations against the total guest list.