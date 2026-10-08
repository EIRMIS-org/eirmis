import { useState, type ReactNode } from 'react'
import './styleguide.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'teal' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const colors = [
  ['Primary', '#4F46E5', 'Main actions and active states'],
  ['Secondary', '#0D9488', 'Invitation and RSVP accents'],
  ['Dark', '#0F172A', 'Navigation and high contrast surfaces'],
  ['Background', '#F8FAFC', 'Level 0 application background'],
  ['Surface', '#FFFFFF', 'Cards and panels'],
  ['Border', '#E2E8F0', 'Dividers and control borders'],
  ['Text muted', '#64748B', 'Supporting labels and descriptions'],
  ['Success', '#15803D', 'Confirmed and approved status'],
  ['Warning', '#B45309', 'Pending and tentative status'],
  ['Error', '#B91C1C', 'Declined and invalid status'],
]

function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
}: {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
}) {
  return (
    <button className={`sg-button sg-button-${variant} sg-button-${size}`} disabled={disabled}>
      {children}
    </button>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="sg-section">
      <div className="sg-section-heading">
        <div>
          <p className="sg-eyebrow">Component primitive</p>
          <h2>{title}</h2>
        </div>
        {description && <p className="sg-section-description">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Styleguide() {
  const [buttonVariant, setButtonVariant] = useState<ButtonVariant>('primary')
  const [buttonSize, setButtonSize] = useState<ButtonSize>('md')
  const [inputError, setInputError] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)

  return (
    <main className="styleguide-page">
      <header className="sg-header">
        <div>
          <p className="sg-eyebrow">EIRMIS / Internal reference</p>
          <h1>Design system</h1>
          <p className="sg-lede">
            Professional, efficient interface foundations for event invitation and RSVP management.
          </p>
        </div>
        <span className="sg-version">v1.0</span>
      </header>

      <div className="sg-content">
        <Section title="Typography" description="Hanken Grotesk for display hierarchy and Inter for legible interface text.">
          <div className="sg-type-grid">
            <div className="sg-type-sample">
              <span className="sg-label">Display / 48px / 800</span>
              <h3 className="sg-display">Every guest matters.</h3>
            </div>
            <div className="sg-type-sample">
              <span className="sg-label">Heading / 24px / 700</span>
              <h3>Invitation overview</h3>
              <p>Coordinate your event with a clear, reliable workspace.</p>
            </div>
            <div className="sg-type-sample">
              <span className="sg-label">Body / 15px / 400</span>
              <p>Track responses, manage attendees, and keep every detail moving forward.</p>
              <small>Caption / 12px / 600</small>
            </div>
          </div>
        </Section>

        <Section title="Color palette" description="Cool slate neutrals, indigo actions, teal accents, and accessible semantic feedback.">
          <div className="sg-color-grid">
            {colors.map(([name, value, use]) => (
              <div className="sg-color-card" key={name}>
                <div className="sg-swatch" style={{ backgroundColor: value }} />
                <div>
                  <strong>{name}</strong>
                  <code>{value}</code>
                  <p>{use}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons" description="Props control variant, size, and disabled state without changing component markup.">
          <div className="sg-controls">
            <label>
              Variant
              <select value={buttonVariant} onChange={(event) => setButtonVariant(event.target.value as ButtonVariant)}>
                {(['primary', 'secondary', 'ghost', 'teal', 'danger'] as ButtonVariant[]).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Size
              <select value={buttonSize} onChange={(event) => setButtonSize(event.target.value as ButtonSize)}>
                {(['sm', 'md', 'lg'] as ButtonSize[]).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="sg-demo-row">
            <Button variant={buttonVariant} size={buttonSize}>Preview action</Button>
            <Button variant={buttonVariant} size={buttonSize} disabled>Disabled</Button>
          </div>
          <div className="sg-state-grid">
            {(['primary', 'secondary', 'ghost', 'teal', 'danger'] as ButtonVariant[]).map((variant) => (
              <div key={variant}><span className="sg-label">{variant}</span><Button variant={variant}>Continue</Button></div>
            ))}
          </div>
        </Section>

        <Section title="Form inputs" description="Focused, disabled, and invalid states preserve clear feedback and keyboard affordances.">
          <div className="sg-form-grid">
            <label className="sg-field">
              <span>Email address</span>
              <input type="email" placeholder="you@example.com" />
              <small>We'll use this for event updates.</small>
            </label>
            <label className={`sg-field ${inputError ? 'sg-field-error' : ''}`}>
              <span>Event name</span>
              <input defaultValue={inputError ? 'A' : ''} aria-invalid={inputError} />
              <small>{inputError ? 'Event name must be at least 3 characters.' : 'Required field'}</small>
            </label>
          </div>
          <div className="sg-controls">
            <label className="sg-check"><input type="checkbox" checked={inputError} onChange={(event) => setInputError(event.target.checked)} /> Show error state</label>
            <label className="sg-check"><input type="checkbox" checked={inputDisabled} onChange={(event) => setInputDisabled(event.target.checked)} /> Show disabled state</label>
          </div>
          <input className="sg-input-disabled" disabled={inputDisabled} placeholder="Disabled input preview" />
        </Section>

        <Section title="Layout containers" description="Cards use tonal layering, consistent borders, and soft-rounded corners.">
          <div className="sg-layout-demo">
            <article className="sg-card"><span className="sg-label">Level 1 / Card</span><h3>Spring reception</h3><p>128 guests · Confirmed</p></article>
            <article className="sg-card sg-card-highlight"><span className="sg-label">Interactive card</span><h3>Guest responses</h3><div className="sg-progress"><span /></div><p>72% responded</p></article>
            <article className="sg-dark-card"><span className="sg-label">Dark surface</span><h3>Organizer workspace</h3><p>Manage event details from one focused view.</p></article>
          </div>
        </Section>

        <Section title="Shared primitives" description="Patterns used across Organizer, Admin, Guest, and Check-in Staff portals.">
          <div className="sg-primitives">
            <div><span className="sg-label">Status chips</span><div className="sg-chip-row"><span className="sg-chip sg-chip-success">Confirmed</span><span className="sg-chip sg-chip-warning">Pending</span><span className="sg-chip sg-chip-error">Declined</span><span className="sg-chip sg-chip-info">Invited</span></div></div>
            <div className="sg-empty"><strong>No events yet</strong><p>Create an event to start managing invitations.</p><Button size="sm">Create event</Button></div>
            <div className="sg-toast"><span className="sg-toast-dot" /><div><strong>Invitation sent</strong><p>The guest has been notified.</p></div><button aria-label="Dismiss notification">×</button></div>
          </div>
        </Section>
      </div>
    </main>
  )
}

export default Styleguide
