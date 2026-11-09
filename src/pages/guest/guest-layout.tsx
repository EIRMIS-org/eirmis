/**
 * src/pages/guest/guest-layout.tsx
 *
 * Task 04 — layout shell. Task 08 (Guest Portal) fills the outlets.
 */

import { AppChrome } from '../shared/app-chrome'

export function GuestLayout() {
    return <AppChrome activePortal="guest" />
}
