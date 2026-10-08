import { useEffect, useState, type ReactNode } from 'react'
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

const sections = [
  ['typography', 'Typography'],
  ['colors', 'Color palette'],
  ['foundations', 'Foundations'],
  ['buttons', 'Buttons'],
  ['forms', 'Form inputs'],
  ['layout', 'Layout containers'],
  ['primitives', 'Shared primitives'],
  ['navigation', 'Navigation & feedback'],
  ['states', 'Loading & states'],
] as const

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

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="sg-section">
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
  const [activeSection, setActiveSection] = useState('typography')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: [0.1, 0.5, 1] },
    )

    sections.forEach(([id]) => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })

    return () => observer.disconnect()
  }, [])

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

      <div className="sg-guide-layout">
        <aside className="sg-side-nav" aria-label="Styleguide sections">
          <span className="sg-side-nav-title">On this page</span>
          <nav>
            {sections.map(([id, label]) => (
              <a key={id} className={activeSection === id ? 'is-active' : ''} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="sg-content">
        <Section id="typography" title="Typography" description="Semantic roles keep type consistent across portals. Display type is reserved for marketing and major introductions; application screens use compact headings.">
          <div className="sg-type-hierarchy">
            <div className="sg-type-row">
              <span className="sg-label">Display / 48px / 800</span>
              <p className="sg-type-display">Every guest matters.</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Heading 1 / 36px / 800</span>
              <p className="sg-type-h1">Invitation overview</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Heading 2 / 24px / 700</span>
              <p className="sg-type-h2">Manage your guest list</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Heading 3 / 18px / 700</span>
              <p className="sg-type-h3">Event details</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Body / 15px / 400</span>
              <p className="sg-type-body">Track responses, manage attendees, and keep every detail moving forward.</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Label / 13px / 600</span>
              <p className="sg-type-label">Event date and time</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Caption / 12px / 400</span>
              <p className="sg-type-caption">Last updated a few moments ago</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Numeric / tabular</span>
              <p className="sg-type-numeric">128 guests · 72% responded · 09:30</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Mono / technical</span>
              <p className="sg-type-mono">event_7f31 · RSVP-2048</p>
            </div>
          </div>
        </Section>

        <Section id="colors" title="Color palette" description="Cool slate neutrals, indigo actions, teal accents, and accessible semantic feedback.">
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

        <Section id="foundations" title="Spacing, sizing, radius, elevation & motion" description="A compact foundation scale makes layouts predictable and keeps interaction density consistent.">
          <div className="sg-foundation-grid">
            <div className="sg-foundation-group"><span className="sg-label">Spacing / 8px grid</span><div className="sg-token-list">{[['1', '8px'], ['2', '16px'], ['3', '24px'], ['4', '32px'], ['6', '48px'], ['8', '64px']].map(([name, value]) => <div key={name}><code>{name}</code><span className="sg-token-bar" style={{ width: value }} /><b>{value}</b></div>)}</div></div>
            <div className="sg-foundation-group"><span className="sg-label">Control heights</span><div className="sg-metric-list"><div><b>sm</b><span>32px</span></div><div><b>md</b><span>40px</span></div><div><b>lg</b><span>48px</span></div><div><b>row</b><span>48px</span></div></div></div>
            <div className="sg-foundation-group"><span className="sg-label">Radius</span><div className="sg-radius-list"><span className="sg-radius-sm">8</span><span className="sg-radius-md">12</span><span className="sg-radius-lg">16</span><span className="sg-radius-pill">9999</span></div></div>
            <div className="sg-foundation-group"><span className="sg-label">Elevation & motion</span><div className="sg-elevation-list"><div className="sg-elevation-none">Cards / border only</div><div className="sg-elevation-popover">Popover / 150ms</div><div className="sg-elevation-dialog">Dialog / 240ms</div></div></div>
          </div>
        </Section>

        <Section id="buttons" title="Buttons" description="Props control variant, size, and disabled state without changing component markup.">
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

        <Section id="forms" title="Form inputs" description="Focused, disabled, and invalid states preserve clear feedback and keyboard affordances.">
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

        <Section id="layout" title="Layout containers" description="Cards use tonal layering, consistent borders, and soft-rounded corners.">
          <div className="sg-layout-demo">
            <article className="sg-card"><span className="sg-label">Level 1 / Card</span><h3>Spring reception</h3><p>128 guests · Confirmed</p></article>
            <article className="sg-card sg-card-highlight"><span className="sg-label">Interactive card</span><h3>Guest responses</h3><div className="sg-progress"><span /></div><p>72% responded</p></article>
            <article className="sg-dark-card"><span className="sg-label">Dark surface</span><h3>Organizer workspace</h3><p>Manage event details from one focused view.</p></article>
          </div>
        </Section>

        <Section id="primitives" title="Shared primitives" description="Patterns used across Organizer, Admin, Guest, and Check-in Staff portals.">
          <div className="sg-primitives">
            <div><span className="sg-label">Status chips</span><div className="sg-chip-row"><span className="sg-chip sg-chip-success">Confirmed</span><span className="sg-chip sg-chip-warning">Pending</span><span className="sg-chip sg-chip-error">Declined</span><span className="sg-chip sg-chip-info">Invited</span></div></div>
            <div className="sg-empty"><strong>No events yet</strong><p>Create an event to start managing invitations.</p><Button size="sm">Create event</Button></div>
            <div className="sg-toast"><span className="sg-toast-dot" /><div><strong>Invitation sent</strong><p>The guest has been notified.</p></div><button aria-label="Dismiss notification">×</button></div>
          </div>
        </Section>

        <Section id="navigation" title="Navigation & feedback" description="The missing interaction patterns are shown with realistic EIRMIS labels and states.">
          <div className="sg-navigation-demo">
            <div className="sg-tabs"><button className="is-active">Overview</button><button>Guests</button><button>Settings</button></div>
            <div className="sg-breadcrumbs"><span>Events</span><b>/</b><span>Spring reception</span><b>/</b><strong>Guests</strong></div>
            <div className="sg-pagination"><Button size="sm" variant="secondary">Previous</Button><span>Page 1 of 8</span><Button size="sm">Next</Button></div>
            <div className="sg-alert"><strong>RSVP deadline approaching</strong><p>12 invitations are still awaiting a response.</p><Button size="sm">Review guests</Button></div>
          </div>
        </Section>

        <Section id="states" title="Loading, empty & overlay states" description="Every workflow needs a clear state before data, when data is absent, and when a transient action completes.">
          <div className="sg-state-examples">
            <div><span className="sg-label">Skeleton</span><div className="sg-skeleton sg-skeleton-title" /><div className="sg-skeleton sg-skeleton-line" /><div className="sg-skeleton sg-skeleton-line short" /></div>
            <div className="sg-empty"><strong>No invitations yet</strong><p>Invite guests to begin collecting RSVPs.</p><Button size="sm">Invite guests</Button></div>
            <div className="sg-dialog-preview"><span className="sg-label">Dialog / elevated layer</span><strong>Archive this event?</strong><p>Guests will no longer be able to respond.</p><div><Button size="sm" variant="ghost">Cancel</Button><Button size="sm" variant="danger">Archive event</Button></div></div>
          </div>
        </Section>
        </div>
      </div>
    </main>
  )
}

export default Styleguide
