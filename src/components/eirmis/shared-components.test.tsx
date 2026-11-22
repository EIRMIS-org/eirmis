// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlobalNav } from './global-nav'
import { RsvpSelector, type RsvpChoice } from './rsvp-selector'
import { ScanResult } from './scan-result'
import { SsoButton } from './sso-button'
import { ToggleRow } from './toggle-row'
import { WalletPass } from './wallet-pass'

afterEach(() => {
  cleanup()
})

describe('GlobalNav accessibility', () => {
  it('exposes Primary nav landmark and aria-current="page" on the active portal', () => {
    render(<GlobalNav activePortal="organizer" />)

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const organizerBtn = within(nav).getByRole('button', { name: 'Organizer Portal' })
    const hubBtn = within(nav).getByRole('button', { name: 'Public Hub' })

    expect(organizerBtn).toHaveAttribute('aria-current', 'page')
    expect(hubBtn).not.toHaveAttribute('aria-current')
  })

  it('includes a skip-to-main-content link and accessible brand button', () => {
    render(<GlobalNav brandTitle="EIRMIS" />)

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveAttribute('href', '#main-content')

    const brandButton = screen.getByRole('button', { name: 'EIRMIS — Go to home' })
    expect(brandButton).toBeInTheDocument()
  })
})

describe('MobileDrawer focus management', () => {
  it('traps focus inside the drawer, closes on Escape, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<GlobalNav activePortal="hub" />)

    const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: 'Menu' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const closeBtn = within(dialog).getByRole('button', { name: 'Close menu' })
    expect(closeBtn).toHaveFocus()

    // Shift+Tab from first focusable wraps to the last focusable inside the drawer
    const drawerButtons = within(dialog).getAllByRole('button')
    const lastButton = drawerButtons[drawerButtons.length - 1]
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(lastButton).toHaveFocus()

    // Tab from last focusable wraps back to the first focusable
    await user.keyboard('{Tab}')
    expect(closeBtn).toHaveFocus()

    // Escape closes drawer and returns focus to trigger
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })
})

describe('ScanResult live region announcements', () => {
  it('renders a polite status live region for approved scans', () => {
    render(
      <ScanResult
        status="approved"
        attendeeName="Maria Santos"
        ticketCode="TKT-0001"
      />
    )

    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-atomic', 'true')
    expect(region).toHaveTextContent('Access Granted')
    expect(region).toHaveTextContent('Maria Santos')
  })

  it('renders an assertive alert live region for rejected scans', () => {
    render(
      <ScanResult
        status="rejected"
        attendeeName="Unknown Guest"
        ticketCode="TKT-BAD"
      />
    )

    const region = screen.getByRole('alert')
    expect(region).toHaveAttribute('aria-live', 'assertive')
    expect(region).toHaveAttribute('aria-atomic', 'true')
    expect(region).toHaveTextContent('Access Denied')
  })
})

describe('RsvpSelector radio-group semantics', () => {
  it('exposes radiogroup/radio roles and supports arrow-key selection', async () => {
    const user = userEvent.setup()

    function ControlledRsvp() {
      const [choice, setChoice] = useState<RsvpChoice>('accept')
      return <RsvpSelector value={choice} onChange={setChoice} />
    }

    render(<ControlledRsvp />)

    const group = screen.getByRole('radiogroup', { name: 'RSVP response' })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')

    radios[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveFocus()
  })
})

describe('ToggleRow, SsoButton, and WalletPass accessibility', () => {
  it('associates ToggleRow label and description with its switch', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()

    render(
      <ToggleRow
        title="Auto-approve VIPs"
        description="Skip manual review for VIP guests."
        checked={false}
        onCheckedChange={onCheckedChange}
      />
    )

    const toggle = screen.getByRole('switch', { name: 'Auto-approve VIPs' })
    expect(toggle).toHaveAccessibleDescription('Skip manual review for VIP guests.')
    await user.click(toggle)
    expect(onCheckedChange).toHaveBeenCalled()
  })

  it('provides an accessible name for icon-only SsoButton variants', () => {
    render(<SsoButton provider="google" title="" subtitle="" badgeText="" />)
    expect(
      screen.getByRole('button', { name: 'Continue with Google' })
    ).toBeInTheDocument()
  })

  it('provides a descriptive text alternative for the WalletPass QR code', () => {
    render(
      <WalletPass
        attendeeName="Alex Rivera"
        ticketCode="TKT-8942"
        ticketTier="VIP Delegate"
      />
    )
    expect(
      screen.getByRole('img', {
        name: 'QR code pass for Alex Rivera, ticket TKT-8942, VIP Delegate',
      })
    ).toBeInTheDocument()
  })
})
