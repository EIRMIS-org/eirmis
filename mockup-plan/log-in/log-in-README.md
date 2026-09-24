# Log-in Page - SSO Mockup

> **Purpose:** An isolated SSO entry screen for EIRMIS. This folder contains the login work independently from the public landing hub so the authentication design can evolve without changing other mockup pages.

## 1. What this mockup covers

A standalone `log-in.html` that presents the EIRMIS organization sign-in experience:

- Google SSO as the primary action.
- Google account-selection modal with a demo account.
- Use another account flow with email validation.
- Organizer and Administrator sign-in cards.
- Guest, Staff, and Event Registration alternatives.
- Required agreement checkbox that opens one combined Terms and Privacy Policy modal.
- Responsive 40/60 editorial split layout.
- Lower-right Back to home link.

## 2. Design direction

- **Layout:** dark editorial information panel at 40% and light authentication panel at 60%.
- **Primary:** Indigo `#4F46E5` for secure actions and organizer access.
- **Google:** original four-color Google mark in the primary button and modal.
- **Typography:** Hanken Grotesk for headings and Inter for interface text.
- **Responsive:** role cards collapse into a single column on narrow screens.

## 3. Interactions

| Action | Behavior |
|---|---|
| Continue with Google | Opens the Google account modal and continues to the Organizer Portal. |
| Use another account | Replaces the demo account with an email field before continuing. |
| Sign in as Organizer | Opens the Organizer Portal. |
| Sign in as Administrator | Opens the Admin Portal. |
| Continue as Guest | Opens `../landing/landing.html#guest-login`. |
| Continue as Staff | Opens `../landing/landing.html#staff-login`. |
| Register for an Event | Opens `../landing/landing.html#register`. |
| Terms and Privacy checkbox | Opens the combined policy modal; consent is recorded after selecting "I Agree". |
| Back to home | Returns to `../landing/landing.html`. |

## 4. How to run

1. Open `log-in.html` directly in a browser, or serve the `mockup-plan` folder statically.
2. Test the Google modal, alternate-account state, and role cards from the first screen.

## 5. Files in this folder

- `log-in.html` - The isolated SSO login mockup.
- `log-in-README.md` - Documentation for this page.

## 6. Scope

This isolated page is intentionally self-contained. It does not modify the shared runtime or other portal folders.
