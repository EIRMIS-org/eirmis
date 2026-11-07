// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import userEvent from '@testing-library/user-event'

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

  it('submits the selected value from a custom registered control', async () => {
    const onSubmit = vi.fn()
    function StatusForm() {
      const { register, handleSubmit } = useForm({ defaultValues: { status: 'draft' } })
      return (
        <form onSubmit={handleSubmit(values => onSubmit(values))}>
          <FormRow id="status" label="Status" renderControl={props => (
            <select {...props} {...register('status')}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          )} />
          <button>Save</button>
        </form>
      )
    }
    const user = userEvent.setup()
    render(<StatusForm />)
    await user.selectOptions(screen.getByLabelText('Status'), 'published')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ status: 'published' })
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
