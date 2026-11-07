// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { FormRow } from './form-row'

describe('FormRow', () => {
  it('associates its label, description, and error with the input', () => {
    render(
      <FormRow
        id="guest-email"
        label="Guest email"
        description="Used to send the invitation"
        error="Enter a valid email"
        required
      />,
    )

    const input = screen.getByLabelText('Guest email*')
    const alert = screen.getByRole('alert')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute(
      'aria-describedby',
      'guest-email-description guest-email-error',
    )
    expect(alert).toHaveTextContent('Enter a valid email')
  })

  it('passes accessibility attributes to a custom control renderer', () => {
    render(
      <FormRow
        id="event-status"
        label="Event status"
        error={{ type: 'server', message: 'Choose a status' }}
        renderControl={(props) => <select {...props} />}
      />,
    )

    expect(screen.getByLabelText('Event status')).toHaveAttribute(
      'aria-describedby',
      'event-status-error',
    )
  })
})
