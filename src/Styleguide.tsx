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
  ['elevation', 'Elevation & radius'],
  ['buttons', 'Buttons'],
  ['forms', 'Form inputs'],
  ['controls', 'Controls & toggles'],
  ['overlays', 'Modals & popups'],
  ['cards', 'Card taxonomy'],
  ['tables', 'Tables & lists'],
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
  onClick,
}: {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button className={`sg-button sg-button-${variant} sg-button-${size}`} disabled={disabled} onClick={onClick}>
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [toggleOn, setToggleOn] = useState(true)
  const [approval, setApproval] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [modalOpen, setModalOpen] = useState(false)
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
              <p className="sg-display-font font-heading text-5xl font-extrabold leading-none tracking-tight max-[768px]:text-4xl">Every guest matters.</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Heading 1 / 36px / 800</span>
              <p className="font-heading text-4xl font-extrabold leading-tight tracking-tight">Invitation overview</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Heading 2 / 24px / 700</span>
              <p className="font-heading text-2xl font-bold leading-tight tracking-tight">Manage your guest list</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Heading 3 / 18px / 700</span>
              <p className="font-heading text-lg font-bold leading-snug tracking-tight">Event details</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Body / 15px / 400</span>
              <p className="font-sans text-base leading-relaxed">Track responses, manage attendees, and keep every detail moving forward.</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Label / 13px / 600</span>
              <p className="font-sans text-sm font-semibold">Event date and time</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Caption / 12px / 400</span>
              <p className="font-sans text-xs text-muted-foreground">Last updated a few moments ago</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Numeric / tabular</span>
              <p className="font-sans text-sm tabular-nums">128 guests · 72% responded · 09:30</p>
            </div>
            <div className="sg-type-row">
              <span className="sg-label">Mono / technical</span>
              <p className="font-mono text-xs">event_7f31 · RSVP-2048</p>
            </div>
          </div>
          <div className="sg-type-utility-map">
            <span className="sg-label">Utility mapping</span>
            <code>display: text-5xl font-heading font-extrabold tracking-tight</code>
            <code>heading: text-2xl font-heading font-bold tracking-tight</code>
            <code>body: text-base font-sans leading-relaxed</code>
            <code>label: text-sm font-sans font-semibold</code>
            <code>caption: text-xs text-muted-foreground</code>
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

        <Section id="elevation" title="Elevation & radius" description="Use tonal layering first. Reserve shadows for floating containers, dialogs, dropdowns, and toasts.">
          <div className="sg-elevation-demo">
            <div className="sg-elevation-card sg-elevation-level-1"><span className="sg-label">Level 1 / Card</span><strong>Event summary</strong><p>Border, no shadow.</p></div>
            <div className="sg-elevation-card sg-elevation-level-2"><span className="sg-label">Level 2 / Popover</span><strong>Filter menu</strong><p>0 4px 16px -2px</p></div>
            <div className="sg-elevation-card sg-elevation-level-3"><span className="sg-label">Level 3 / Dialog</span><strong>Confirm action</strong><p>0 16px 32px -4px</p></div>
          </div>
          <div className="sg-radius-demo"><span className="sg-radius-example sg-radius-sm-example">8px / controls</span><span className="sg-radius-example sg-radius-md-example">12px / cards</span><span className="sg-radius-example sg-radius-lg-example">16px / feature cards</span><span className="sg-radius-example sg-radius-pill-example">9999px / chips</span></div>
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

        <Section id="controls" title="Controls & toggles" description="Dropdowns, switches, tabs, and approval actions need visible selected, disabled, loading, and destructive states.">
          <div className="sg-control-demo">
            <div className="sg-dropdown-wrap">
              <span className="sg-label">Dropdown</span>
              <button className="sg-dropdown-trigger" onClick={() => setDropdownOpen((open) => !open)}>Event status <span>⌄</span></button>
              {dropdownOpen && <div className="sg-dropdown-menu"><button onClick={() => setDropdownOpen(false)}>Draft</button><button onClick={() => setDropdownOpen(false)}>Published</button><button onClick={() => setDropdownOpen(false)}>Closed</button></div>}
            </div>
            <label className="sg-switch-row"><span><span className="sg-label">Switch</span><small>Allow open registration</small></span><button className={`sg-switch ${toggleOn ? 'is-on' : ''}`} role="switch" aria-checked={toggleOn} onClick={() => setToggleOn((on) => !on)}><span /></button></label>
            <div className="sg-approval"><span className="sg-label">Organizer approval</span><strong>Elena Rostova · 3 attendees</strong><div className="sg-approval-actions"><Button size="sm" variant="teal" disabled={approval !== 'pending'} onClick={() => setApproval('approved')}>{approval === 'approved' ? 'Approved' : 'Approve'}</Button><Button size="sm" variant="danger" disabled={approval !== 'pending'} onClick={() => setModalOpen(true)}>{approval === 'rejected' ? 'Rejected' : 'Reject'}</Button></div><small>Reject requires a reason and confirmation.</small></div>
          </div>
        </Section>

        <Section id="overlays" title="Modals & popups" description="Floating layers clarify context without losing the underlying workflow. Dialogs must be dismissible with Cancel, Escape, and a clear primary action.">
          <div className="sg-overlay-demo"><Button onClick={() => setModalOpen(true)}>Open confirmation dialog</Button><span className="sg-tooltip-demo" title="Helpful context">Hover for tooltip</span><div className="sg-toast"><span className="sg-toast-dot" /><div><strong>Invitation queued</strong><p>Sent in the next delivery batch.</p></div></div></div>
          {modalOpen && <div className="sg-modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}><div className="sg-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title" onClick={(event) => event.stopPropagation()}><span className="sg-label">Confirmation dialog</span><h3 id="archive-title">Reject attendee roster?</h3><p>Explain what needs to change before the guest resubmits their roster.</p><textarea placeholder="Reason for rejection" /><div><Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button size="sm" variant="danger" onClick={() => { setApproval('rejected'); setModalOpen(false) }}>Reject roster</Button></div></div></div>}
        </Section>

        <Section id="cards" title="Card taxonomy" description="Cards share one frame but vary by information density and action priority across portals.">
          <div className="sg-card-taxonomy">
            <article className="sg-card sg-kpi-card"><span className="sg-label">Admin / KPI card</span><strong>24</strong><p>Pending organizers</p></article>
            <article className="sg-card sg-result-card"><span className="sg-label">Staff / scan result</span><strong className="sg-result-success">Check-in accepted</strong><p>Elena Rostova · Spring reception</p></article>
            <article className="sg-card"><span className="sg-label">Guest / invitation</span><h3>Spring reception</h3><p>June 24 · 128 guests</p><Button size="sm">Respond</Button></article>
            <article className="sg-card"><span className="sg-label">Guest / party roster</span><p>3 of 4 attendees approved</p><div className="sg-progress"><span style={{ width: '75%' }} /></div></article>
          </div>
        </Section>

        <Section id="tables" title="Tables & lists" description="Desktop tables become stacked lists on mobile. Keep status, identity, and the next action visible in both formats.">
          <div className="sg-table-wrap"><table><thead><tr><th>Guest</th><th>Status</th><th>Party</th><th>Action</th></tr></thead><tbody><tr><td><strong>Elena Rostova</strong><small>elena@example.com</small></td><td><span className="sg-chip sg-chip-success">Approved</span></td><td>3 / 4</td><td><Button size="sm" variant="ghost">View</Button></td></tr><tr><td><strong>Marcus Reed</strong><small>marcus@example.com</small></td><td><span className="sg-chip sg-chip-warning">Pending</span></td><td>2 / 2</td><td><Button size="sm" variant="secondary">Review</Button></td></tr></tbody></table></div>
          <div className="sg-list-demo"><div><strong>Elena Rostova</strong><span>Approved · 3 / 4</span><Button size="sm" variant="ghost">View</Button></div><div><strong>Marcus Reed</strong><span>Pending · 2 / 2</span><Button size="sm" variant="secondary">Review</Button></div></div>
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
