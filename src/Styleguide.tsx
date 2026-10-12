import { useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIcon,
  AlertCircleIcon,
  Building2Icon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  InfoIcon,
  LockIcon,
  LuggageIcon,
  MailIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'

// Shadcn UI components
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'teal'
  | 'danger'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link'

type ButtonSize = 'default' | 'xs' | 'sm' | 'md' | 'lg'

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
] as const

const sections = [
  ['typography', 'Typography'],
  ['colors', 'Color palette'],
  ['design-tokens', 'Design tokens'],
  ['elevation', 'Elevation & radius'],
  ['icons', 'Iconography'],
  ['buttons', 'Buttons'],
  ['forms', 'Form inputs'],
  ['controls', 'Controls & toggles'],
  ['overlays', 'Modals & popups'],
  ['cards', 'Card taxonomy'],
  ['tables', 'Tables & lists'],
  ['layout', 'Layout containers'],
  ['global-chrome', 'Global chrome'],
  ['layout-primitives', 'Layout primitives'],
  ['data-display', 'Data display primitives'],
  ['form-interactions', 'Form & interaction primitives'],
  ['feedback-states', 'Feedback & state primitives'],
  ['primitives', 'Shared primitives'],
  ['navigation', 'Navigation & feedback'],
  ['states', 'Loading & states'],
] as const

const mockupIcons = [
  {
    name: 'Building2',
    component: Building2Icon,
    category: 'KPI Overview',
    usage: 'Total Capacity',
  },
  {
    name: 'Mail',
    component: MailIcon,
    category: 'KPI Overview',
    usage: 'RSVPs / Invites',
  },
  {
    name: 'Luggage',
    component: LuggageIcon,
    category: 'KPI Overview',
    usage: 'Pending Approvals',
  },
  {
    name: 'User',
    component: UserIcon,
    category: 'KPI Overview',
    usage: 'Checked In',
  },
  {
    name: 'Check',
    component: CheckIcon,
    category: 'Table Action',
    usage: 'Approve / Accepted',
  },
  {
    name: 'X',
    component: XIcon,
    category: 'Table Action',
    usage: 'Reject / Declined',
  },
  {
    name: 'Clock',
    component: ClockIcon,
    category: 'Feedback & Alert',
    usage: 'RSVP Deadline',
  },
  {
    name: 'Users',
    component: UsersIcon,
    category: 'Empty State',
    usage: 'Attendee Roster',
  },
  {
    name: 'Download',
    component: DownloadIcon,
    category: 'Quick Action',
    usage: 'Export Roster',
  },
  {
    name: 'Trash2',
    component: Trash2Icon,
    category: 'Quick Action',
    usage: 'Delete Event',
  },
  {
    name: 'ChevronDown',
    component: ChevronDownIcon,
    category: 'Controls',
    usage: 'Dropdown Menu',
  },
]

// ============================================================================
// Design Token Constants (matching mockup-plan/assets/eirmis.css)
// ============================================================================

const extendedColors = [
  // Brand Primary (Indigo)
  ['Primary', '--primary', '#4F46E5', 'Main brand color, primary actions'],
  ['Primary Hover', '--primary-hover', '#4338CA', 'Hover state for primary actions'],
  ['Primary Subtle', '--primary-subtle', '#EEF2FF', 'Subtle backgrounds, badges'],
  ['Primary Border', '--primary-border', '#C7D2FE', 'Borders for primary elements'],
  ['Primary Glow', '--primary-glow', 'rgba(79, 70, 229, 0.18)', 'Glow/shadow for primary'],

  // Secondary (Teal)
  ['Secondary', '--secondary', '#0D9488', 'Invitation and RSVP accents'],
  ['Secondary Hover', '--secondary-hover', '#0F766E', 'Hover state for secondary actions'],
  ['Secondary Subtle', '--secondary-subtle', '#F0FDFA', 'Subtle backgrounds for teal'],
  ['Secondary Border', '--secondary-border', '#99F6E4', 'Borders for teal elements'],

  // Dark Neutrals
  ['Dark', '--dark', '#0F172A', 'Navigation and high contrast surfaces'],
  ['Dark Surface', '--dark-surface', '#1E293B', 'Dark mode surfaces'],
  ['Dark Border', '--dark-border', '#334155', 'Borders in dark mode'],

  // Cool Neutrals (Slate scale)
  ['Background', '--bg', '#F8FAFC', 'Level 0 application background'],
  ['Surface', '--surface', '#FFFFFF', 'Cards and panels'],
  ['Surface Glass', '--surface-glass', 'rgba(255, 255, 255, 0.92)', 'Glassmorphism nav background'],
  ['Border', '--border', '#E2E8F0', 'Dividers and control borders'],
  ['Border Subtle', '--border-subtle', '#F1F5F9', 'Subtle dividers'],
  ['Border Hover', '--border-hover', '#CBD5E1', 'Hover state borders'],
  ['Text Main', '--text-main', '#0F172A', 'Primary text content'],
  ['Text Muted', '--text-muted', '#64748B', 'Supporting labels and descriptions'],
  ['Text Subtle', '--text-subtle', '#94A3B8', 'Placeholder and disabled text'],

  // Semantic Status Feedback (WCAG 2.1 AA Compliant)
  ['Success', '--success', '#15803D', 'Confirmed and approved status'],
  ['Success BG', '--success-bg', '#DCFCE7', 'Success background'],
  ['Success Border', '--success-border', '#86EFAC', 'Success borders'],
  ['Warning', '--warning', '#B45309', 'Pending and tentative status'],
  ['Warning BG', '--warning-bg', '#FEF3C7', 'Warning background'],
  ['Warning Border', '--warning-border', '#FDE68A', 'Warning borders'],
  ['Error', '--error', '#B91C1C', 'Declined and invalid status'],
  ['Error BG', '--error-bg', '#FEE2E2', 'Error background'],
  ['Error Border', '--error-border', '#FECACA', 'Error borders'],
  ['Info', '--info', '#4F46E5', 'Informational status'],
  ['Info BG', '--info-bg', '#EEF2FF', 'Info background'],
  ['Info Border', '--info-border', '#C7D2FE', 'Info borders'],
] as const

const radiiTokens = [
  ['XS', '--radius-xs', '4px', 'Small controls, chips, badges'],
  ['SM', '--radius-sm', '8px', 'Buttons, inputs, form controls'],
  ['MD', '--radius-md', '12px', 'Cards, modals, dropdowns'],
  ['LG', '--radius-lg', '18px', 'Feature cards, larger containers'],
  ['XL', '--radius-xl', '24px', 'Hero sections, major containers'],
  ['Pill', '--radius-pill', '9999px', 'Pills, badges, avatar rings'],
] as const

const shadowTokens = [
  ['XS', '--shadow-xs', '0 1px 2px 0 rgba(15, 23, 42, 0.04)', 'Cards, subtle elevation'],
  ['SM', '--shadow-sm', '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)', 'Hover states, raised elements'],
  ['MD', '--shadow-md', '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.03)', 'Popovers, dropdowns, tooltips'],
  ['LG', '--shadow-lg', '0 16px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.04)', 'Modals, dialogs, drawers'],
  ['Float', '--shadow-float', '0 20px 40px -8px rgba(15, 23, 42, 0.18), 0 6px 14px -2px rgba(15, 23, 42, 0.06)', 'Toasts, floating overlays'],
] as const

const typographyTokens = [
  ['Font Heading', '--font-heading', "'Hanken Grotesk', 'Plus Jakarta Sans', system-ui, sans-serif", 'Headings, titles, brand text'],
  ['Font Body', '--font-body', "'Inter', system-ui, -apple-system, sans-serif", 'Body text, UI labels, forms'],
] as const

const spacingTokens = [
  ['Space 1', '--space-1', '4px', 'Tight spacing, icon gaps'],
  ['Space 2', '--space-2', '8px', 'Base unit, control padding'],
  ['Space 3', '--space-3', '12px', 'Component internal spacing'],
  ['Space 4', '--space-4', '16px', 'Standard container padding'],
  ['Space 5', '--space-5', '20px', 'Section spacing'],
  ['Space 6', '--space-6', '24px', 'Major section gaps'],
  ['Space 8', '--space-8', '32px', 'Page-level spacing'],
  ['Space 10', '--space-10', '40px', 'Large layout gaps'],
  ['Space 12', '--space-12', '48px', 'Hero section spacing'],
] as const

const motionTokens = [
  ['Ease Spring', '--ease-spring', 'cubic-bezier(0.16, 1, 0.3, 1)', 'Default easing for UI animations'],
  ['Ease In Out', '--ease-in-out', 'cubic-bezier(0.4, 0, 0.2, 1)', 'Material-style standard easing'],
] as const

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border/70 py-14">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start sm:gap-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Component primitive
          </p>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
        </div>
        {description && (
          <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

export default function Styleguide() {
  const [buttonVariant, setButtonVariant] = useState<ButtonVariant>('primary')
  const [buttonSize, setButtonSize] = useState<ButtonSize>('md')
  const [inputError, setInputError] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const [eventStatus, setEventStatus] = useState('published')
  const [toggleOn, setToggleOn] = useState(true)
  const [approval, setApproval] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [activeSection, setActiveSection] = useState('typography')

  // Task 4 interactive states
  const [boundaryRole, setBoundaryRole] = useState<'Check-in Staff' | 'Organizer' | 'Guest'>('Check-in Staff')
  const [rsvpDistribution, setRsvpDistribution] = useState({
    accepted: 84,
    declined: 14,
    tentative: 14,
    unanswered: 38,
  })

  const totalRsvps =
    rsvpDistribution.accepted +
    rsvpDistribution.declined +
    rsvpDistribution.tentative +
    rsvpDistribution.unanswered
  const pctAccepted =
    totalRsvps > 0 ? ((rsvpDistribution.accepted / totalRsvps) * 100).toFixed(1) : '0'
  const pctDeclined =
    totalRsvps > 0 ? ((rsvpDistribution.declined / totalRsvps) * 100).toFixed(1) : '0'
  const pctTentative =
    totalRsvps > 0 ? ((rsvpDistribution.tentative / totalRsvps) * 100).toFixed(1) : '0'
  const pctUnanswered =
    totalRsvps > 0 ? ((rsvpDistribution.unanswered / totalRsvps) * 100).toFixed(1) : '0'

  // Task 5 interactive states
  const [segmentedTab, setSegmentedTab] = useState('overview')
  const [guestSegmentedTab, setGuestSegmentedTab] = useState('rsvp')
  const [wizardStep, setWizardStep] = useState(3)
  const [customToggle1, setCustomToggle1] = useState(true)
  const [customToggle2, setCustomToggle2] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customDropdownOpen, setCustomDropdownOpen] = useState(false)
  const [formFieldError, setFormFieldError] = useState(true)

  // Task 6 interactive states
  const [activeToast, setActiveToast] = useState<{
    id: number
    type: 'success' | 'warning' | 'error' | 'info'
    message: string
  } | null>(null)
  const [customModalSheetOpen, setCustomModalSheetOpen] = useState(false)
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false)
  const [waitlistError, setWaitlistError] = useState(false)
  const [waitlistProcessing, setWaitlistProcessing] = useState(false)

  const triggerProgressToast = (
    type: 'success' | 'warning' | 'error' | 'info',
    message: string
  ) => {
    const id = Date.now()
    setActiveToast({ id, type, message })
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === id ? null : curr))
    }, 3200)
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: [0.1, 0.5, 1] }
    )

    sections.forEach(([id]) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50/70 text-foreground text-left">
        <Toaster position="bottom-right" richColors />

        {/* Page Header */}
        <header className="border-b border-border/80 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 px-6 py-14 sm:px-12 sm:py-16 text-left">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-end text-left">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-xs">
                <SparklesIcon className="size-3.5" />
                EIRMIS / Internal reference
              </div>
              <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Design system
              </h1>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Professional, efficient interface foundations for event invitation and RSVP management powered by shadcn/ui.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold px-3 py-1">
                v1.0 · shadcn UI
              </Badge>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 lg:grid-cols-[220px_1fr] sm:px-12 text-left">
          {/* Sticky Side Nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-10 pt-10">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                On this page
              </span>
              <nav className="mt-3 grid gap-1 border-l border-border pl-2">
                {sections.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeSection === id
                      ? 'bg-indigo-50 font-semibold text-indigo-700'
                      : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
                      }`}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content Column */}
          <main className="min-w-0 pb-24 text-left">
            {/* 1. Typography */}
            <Section
              id="typography"
              title="Typography"
              description="Semantic roles keep typography consistent across portals. Display type is reserved for marketing and major introductions; application screens use compact headings."
            >
              <Card className="divide-y divide-border overflow-hidden rounded-2xl border-border bg-white shadow-xs">
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Display / 48px / 800</span>
                  <p className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
                    Every guest matters.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Heading 1 / 36px / 800</span>
                  <p className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Invitation overview
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Heading 2 / 24px / 700</span>
                  <p className="font-heading text-2xl font-bold tracking-tight">
                    Manage your guest list
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Heading 3 / 18px / 700</span>
                  <p className="font-heading text-lg font-bold tracking-tight">Event details</p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Body / 15px / 400</span>
                  <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
                    Track responses, manage attendees, and keep every detail moving forward.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Label / 13px / 600</span>
                  <p className="text-sm font-semibold text-slate-900">Event date and time</p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Caption / 12px / 400</span>
                  <p className="text-xs text-muted-foreground">Last updated a few moments ago</p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Numeric / tabular</span>
                  <p className="font-mono text-sm tabular-nums text-slate-800">
                    128 guests · 72% responded · 09:30
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Mono / technical</span>
                  <p className="font-mono text-xs text-slate-600">event_7f31 · RSVP-2048</p>
                </div>
              </Card>

              <div className="mt-4 rounded-xl border border-dashed border-border bg-slate-100/70 p-4 text-xs font-mono text-muted-foreground">
                <span className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tailwind Utility mapping
                </span>
                <div className="grid gap-1">
                  <code>display: text-5xl font-heading font-extrabold tracking-tight</code>
                  <code>heading: text-2xl font-heading font-bold tracking-tight</code>
                  <code>body: text-base font-sans leading-relaxed</code>
                  <code>label: text-sm font-sans font-semibold</code>
                  <code>caption: text-xs text-muted-foreground</code>
                </div>
              </div>
            </Section>

            {/* 2. Colors */}
            <Section
              id="colors"
              title="Color palette"
              description="Cool slate neutrals, indigo actions, teal accents, and accessible semantic feedback."
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {colors.map(([name, hex, usage]) => (
                  <Card key={name} className="overflow-hidden border-border bg-white shadow-xs">
                    <div className="h-16 w-full border-b border-border" style={{ backgroundColor: hex }} />
                    <CardContent className="p-3">
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{hex}</code>
                      <p className="mt-1 text-xs text-muted-foreground leading-tight">{usage}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>

            {/* 2b. Design Tokens (Extended) */}
            <Section
              id="design-tokens"
              title="Design tokens"
              description="Complete EIRMIS design token reference matching assets/eirmis.css. All values are CSS custom properties for production use."
            >
              {/* Extended Color Palette */}
              <div className="space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Extended color palette</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {extendedColors.map(([name, token, hex, usage]) => (
                    <Card key={name} className="overflow-hidden border-border bg-white shadow-xs">
                      <div className="h-16 w-full border-b border-border" style={{ backgroundColor: hex }} />
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(token);
                              toast.success(`Copied ${token}`);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-mono"
                            title="Copy token"
                          >
                            Copy
                          </button>
                        </div>
                        <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                        <code className="block text-xs font-mono text-muted-foreground">{hex}</code>
                        <p className="mt-1 text-xs text-muted-foreground leading-tight">{usage}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Radii Scale */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Border radius scale</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  {radiiTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-white p-4 shadow-xs text-center">
                      <div className="mb-2">
                        <div
                          className="mx-auto h-12 w-12 rounded-lg border border-border bg-slate-50"
                          style={{ borderRadius: value }}
                        />
                      </div>
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <code className="block text-xs font-mono text-muted-foreground">{value}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>

                {/* Shadow Scale */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Elevation & shadow scale</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                  {shadowTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-white p-4 shadow-xs">
                      <div className="mb-3 h-16 w-full rounded-lg border border-border bg-white" style={{ boxShadow: value }} />
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>

                {/* Typography Tokens */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Typography tokens</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {typographyTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-white p-4 shadow-xs">
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <code className="block text-xs font-mono text-muted-foreground">{value}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>

                {/* Spacing Scale */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Spacing scale</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {spacingTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-white p-4 shadow-xs text-center">
                      <div className="mb-2 h-8 w-full bg-slate-100 rounded" style={{ height: value }} />
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <code className="block text-xs font-mono text-muted-foreground">{value}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>

                {/* Motion Tokens */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Motion & easing tokens</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {motionTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-white p-4 shadow-xs">
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <code className="block text-xs font-mono text-muted-foreground">{value}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </Section>

            {/* 3. Elevation & radius */}
            <Section
              id="elevation"
              title="Elevation & radius"
              description="Use tonal layering first. Reserve shadows for floating containers, dialogs, dropdowns, and toasts."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border-border bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Level 1 / Card
                  </span>
                  <strong className="mt-2 block font-heading text-lg font-bold">Event summary</strong>
                  <p className="mt-1 text-xs text-muted-foreground">Border, ring-1, subtle shadow-xs.</p>
                </Card>
                <Card className="border-border bg-white p-5 shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Level 2 / Popover
                  </span>
                  <strong className="mt-2 block font-heading text-lg font-bold">Filter menu</strong>
                  <p className="mt-1 text-xs text-muted-foreground">Soft shadow-md elevation.</p>
                </Card>
                <Card className="border-border bg-white p-5 shadow-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Level 3 / Dialog
                  </span>
                  <strong className="mt-2 block font-heading text-lg font-bold">Confirm action</strong>
                  <p className="mt-1 text-xs text-muted-foreground">High shadow-xl floating overlay.</p>
                </Card>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="grid min-h-14 place-content-center rounded-lg border border-indigo-200 bg-indigo-50/70 p-2 text-center text-xs font-medium text-indigo-700">
                  8px (rounded-lg) / controls
                </div>
                <div className="grid min-h-14 place-content-center rounded-xl border border-indigo-200 bg-indigo-50/70 p-2 text-center text-xs font-medium text-indigo-700">
                  12px (rounded-xl) / cards
                </div>
                <div className="grid min-h-14 place-content-center rounded-2xl border border-indigo-200 bg-indigo-50/70 p-2 text-center text-xs font-medium text-indigo-700">
                  16px (rounded-2xl) / feature cards
                </div>
                <div className="grid min-h-14 place-content-center rounded-full border border-indigo-200 bg-indigo-50/70 p-2 text-center text-xs font-medium text-indigo-700">
                  9999px (rounded-full) / chips
                </div>
              </div>
            </Section>

            {/* 4. Iconography */}
            <Section
              id="icons"
              title="Iconography"
              description="Standardized Lucide icons used across EIRMIS KPI cards, data tables, quick actions, and workflows."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {mockupIcons.map(({ name, component: IconComponent, category, usage }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(`<${name}Icon className="size-4" />`)
                      }
                      toast.success(`Copied <${name}Icon /> to clipboard`)
                    }}
                    className="group flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-white p-3.5 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex size-11 items-center justify-center rounded-xl bg-slate-50 text-slate-700 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                      <IconComponent className="size-5 stroke-[1.8]" />
                    </div>
                    <div className="mt-2.5 w-full">
                      <span className="block truncate font-mono text-xs font-semibold text-foreground">
                        {name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {usage}
                      </span>
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                      {category}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-indigo-600" />
                  <span>
                    Click any icon to copy its JSX component snippet. All icons use{' '}
                    <strong>lucide-react</strong> with standard <code>size-4</code> / <code>size-5</code> and <code>stroke-[1.8]</code> styling.
                  </span>
                </div>
              </div>
            </Section>

            {/* 5. Buttons */}
            <Section
              id="buttons"
              title="Buttons"
              description="shadcn button component with EIRMIS brand extensions (primary, teal, danger) and custom sizes."
            >
              <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-border bg-white p-5 shadow-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="btn-variant-select" className="text-xs font-semibold text-muted-foreground">
                    Variant
                  </Label>
                  <Select
                    value={buttonVariant}
                    onValueChange={(val: string | null) => {
                      if (val) setButtonVariant(val as ButtonVariant)
                    }}
                  >
                    <SelectTrigger id="btn-variant-select" className="w-44">
                      <SelectValue placeholder="Variant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">primary (EIRMIS)</SelectItem>
                      <SelectItem value="teal">teal (EIRMIS)</SelectItem>
                      <SelectItem value="danger">danger (EIRMIS)</SelectItem>
                      <SelectItem value="default">default</SelectItem>
                      <SelectItem value="secondary">secondary</SelectItem>
                      <SelectItem value="outline">outline</SelectItem>
                      <SelectItem value="ghost">ghost</SelectItem>
                      <SelectItem value="destructive">destructive</SelectItem>
                      <SelectItem value="link">link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="btn-size-select" className="text-xs font-semibold text-muted-foreground">
                    Size
                  </Label>
                  <Select
                    value={buttonSize}
                    onValueChange={(val: string | null) => {
                      if (val) setButtonSize(val as ButtonSize)
                    }}
                  >
                    <SelectTrigger id="btn-size-select" className="w-32">
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xs">xs</SelectItem>
                      <SelectItem value="sm">sm</SelectItem>
                      <SelectItem value="md">md</SelectItem>
                      <SelectItem value="lg">lg</SelectItem>
                      <SelectItem value="default">default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Interactive preview row */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant={buttonVariant} size={buttonSize}>
                  Preview action
                </Button>
                <Button variant={buttonVariant} size={buttonSize} disabled>
                  Disabled
                </Button>
              </div>

              {/* All variants gallery */}
              <div className="mt-8 border-t border-border pt-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  All button variants
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">primary (EIRMIS)</span>
                    <div>
                      <Button variant="primary">Continue</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">teal (EIRMIS)</span>
                    <div>
                      <Button variant="teal">Approve</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">danger (EIRMIS)</span>
                    <div>
                      <Button variant="danger">Reject</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">secondary</span>
                    <div>
                      <Button variant="secondary">Secondary</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">outline</span>
                    <div>
                      <Button variant="outline">Outline</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">ghost</span>
                    <div>
                      <Button variant="ghost">Ghost</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">destructive</span>
                    <div>
                      <Button variant="destructive">Destructive</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">link</span>
                    <div>
                      <Button variant="link">Link action</Button>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* 5. Forms */}
            <Section
              id="forms"
              title="Form inputs"
              description="Focused, disabled, and invalid states preserve clear feedback and keyboard affordances using shadcn Input, Label, and Checkbox."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email-input">Email address</Label>
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="you@example.com"
                    disabled={inputDisabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll use this for event updates and roster notices.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-name-input" className={inputError ? 'text-destructive' : ''}>
                    Event name
                  </Label>
                  <Input
                    id="event-name-input"
                    defaultValue={inputError ? 'A' : 'Spring Gala 2026'}
                    aria-invalid={inputError}
                    disabled={inputDisabled}
                    className={inputError ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  />
                  <p className={`text-xs ${inputError ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {inputError
                      ? 'Event name must be at least 3 characters long.'
                      : 'Required field for guest invitation.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl border border-border bg-white p-4 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="toggle-error"
                    checked={inputError}
                    onCheckedChange={(checked: boolean) => setInputError(Boolean(checked))}
                  />
                  <Label htmlFor="toggle-error" className="cursor-pointer text-xs font-medium">
                    Show error state
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="toggle-disabled"
                    checked={inputDisabled}
                    onCheckedChange={(checked: boolean) => setInputDisabled(Boolean(checked))}
                  />
                  <Label htmlFor="toggle-disabled" className="cursor-pointer text-xs font-medium">
                    Show disabled state
                  </Label>
                </div>
              </div>

              <div className="mt-4 max-w-sm space-y-2">
                <Label htmlFor="disabled-input">Disabled input preview</Label>
                <Input
                  id="disabled-input"
                  disabled
                  placeholder="Disabled input placeholder"
                />
              </div>
            </Section>

            {/* 6. Controls & toggles */}
            <Section
              id="controls"
              title="Controls & toggles"
              description="Dropdowns, switches, tabs, and approval actions need visible selected, disabled, loading, and destructive states."
            >
              <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {/* Dropdown 1: Select (Status) */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Dropdown
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Single-choice event status selector
                      </p>
                    </div>

                    <div className="w-full max-w-[280px] space-y-1.5">
                      <Label htmlFor="event-status" className="text-xs font-medium text-foreground">
                        Event status
                      </Label>
                      <Select
                        value={eventStatus}
                        onValueChange={(val: string | null) => {
                          if (val) setEventStatus(val)
                        }}
                      >
                        <SelectTrigger id="event-status" className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="w-[280px]">
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Status:</span>
                      <Badge variant="outline" className="capitalize">
                        {eventStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Dropdown 2: Contextual Menu */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Action menu
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Contextual dropdown actions & triggers
                      </p>
                    </div>

                    <div className="w-full max-w-[280px] space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Quick actions
                      </Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="outline" className="w-full justify-between">
                              <span>Event operations</span>
                              <ChevronDownIcon className="size-4 opacity-50" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Event operations</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toast.info('Exporting attendee CSV...')}>
                              <DownloadIcon className="mr-2 size-4" />
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.success('Event duplicated')}>
                              <CopyIcon className="mr-2 size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10"
                              onClick={() => toast.error('Archive action requested')}
                            >
                              <Trash2Icon className="mr-2 size-4" />
                              Archive event
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Click to inspect action menu popover
                    </p>
                  </div>

                  {/* Switch */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Switch
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Toggle open registration access
                      </p>
                    </div>

                    <div className="flex w-full max-w-[280px] items-center justify-between rounded-xl border border-border/80 bg-slate-50/70 p-3 shadow-2xs">
                      <div className="space-y-0.5">
                        <Label htmlFor="open-reg" className="text-xs font-semibold cursor-pointer">
                          Open registration
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Allow open registration
                        </p>
                      </div>
                      <Switch
                        id="open-reg"
                        checked={toggleOn}
                        onCheckedChange={setToggleOn}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Registration:</span>
                      <span className={`font-semibold ${toggleOn ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {toggleOn ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Organizer Approval Workflow Row */}
                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Organizer approval
                      </span>
                      <h3 className="mt-1 font-heading text-lg font-bold text-foreground">
                        Elena Rostova · 3 attendees
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Reject requires a reason and confirmation.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="teal"
                        disabled={approval !== 'pending'}
                        onClick={() => {
                          setApproval('approved')
                          toast.success('Roster approved for Elena Rostova')
                        }}
                      >
                        {approval === 'approved' ? 'Approved' : 'Approve'}
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        disabled={approval !== 'pending'}
                        onClick={() => setRejectModalOpen(true)}
                      >
                        {approval === 'rejected' ? 'Rejected' : 'Reject'}
                      </Button>

                      {approval !== 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setApproval('pending')
                            setRejectReason('')
                          }}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* 7. Overlays */}
            <Section
              id="overlays"
              title="Modals & popups"
              description="Floating layers clarify context without losing the underlying workflow. Modals use shadcn Dialog, tooltips use Tooltip, and notifications use Sonner."
            >
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-white p-6 shadow-xs">
                {/* Confirmation Dialog */}
                <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                  <DialogTrigger render={<Button variant="outline" />}>
                    Open confirmation dialog
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reject attendee roster?</DialogTitle>
                      <DialogDescription>
                        Explain what needs to change before the guest resubmits their roster.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                      <Label htmlFor="rejection-reason">Reason for rejection</Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="e.g. Please provide full legal names for all party attendees."
                        value={rejectReason}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                        className="min-h-24"
                      />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose render={<Button variant="ghost" />}>
                        Cancel
                      </DialogClose>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setApproval('rejected')
                          setRejectModalOpen(false)
                          toast.error('Roster has been rejected')
                        }}
                      >
                        Reject roster
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Tooltip trigger */}
                <Tooltip>
                  <TooltipTrigger render={<Button variant="secondary" />}>
                    Hover for tooltip
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>RSVP responses close 48 hours prior to the event</p>
                  </TooltipContent>
                </Tooltip>

                {/* Toast triggers */}
                <Button
                  variant="primary"
                  onClick={() =>
                    toast.success('Invitation queued', {
                      description: 'Sent in the next delivery batch.',
                    })
                  }
                >
                  Trigger toast notification
                </Button>
              </div>

              {/* Inline Toast demonstration card */}
              <div className="mt-4 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-white p-3.5 shadow-sm">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="flex-1 text-xs">
                  <strong className="block font-semibold text-foreground">
                    Invitation queued
                  </strong>
                  <p className="text-muted-foreground">Sent in the next delivery batch.</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Preview</Badge>
              </div>
            </Section>

            {/* 8. Cards */}
            <Section
              id="cards"
              title="Card taxonomy"
              description="Cards share one frame but vary by information density and action priority across portals."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Capacity */}
                <Card className="border-border/80 bg-white p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total capacity
                    </span>
                    <Building2Icon className="size-4.5 text-slate-400 stroke-[1.8]" />
                  </div>
                  <div className="mt-4 font-heading text-3xl font-extrabold text-foreground">
                    150
                  </div>
                </Card>

                {/* RSVPs */}
                <Card className="border-border/80 bg-white p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Rsvps
                    </span>
                    <MailIcon className="size-4.5 text-slate-400 stroke-[1.8]" />
                  </div>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading text-3xl font-extrabold text-foreground">
                        112
                      </span>
                      <span className="text-sm font-semibold text-slate-400">
                        / 150
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${Math.round((112 / 150) * 100)}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Pending Approvals */}
                <Card className="border-border/80 border-l-4 border-l-amber-500 bg-white p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pending approvals
                    </span>
                    <LuggageIcon className="size-4.5 text-slate-400 stroke-[1.8]" />
                  </div>
                  <div className="mt-4 flex items-center gap-2.5">
                    <span className="font-heading text-3xl font-extrabold text-foreground">
                      3
                    </span>
                    <span className="inline-flex items-center rounded-md bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800">
                      REQUIRES ACTION
                    </span>
                  </div>
                </Card>

                {/* Checked In */}
                <Card className="border-border/80 bg-white p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Checked in
                    </span>
                    <UserIcon className="size-4.5 text-slate-400 stroke-[1.8]" />
                  </div>
                  <div className="mt-4 font-heading text-3xl font-extrabold text-foreground">
                    48
                  </div>
                </Card>
              </div>
            </Section>

            {/* 9. Tables */}
            <Section
              id="tables"
              title="Tables & lists"
              description="Desktop tables become stacked lists on mobile. Status badges use semantic EIRMIS variants."
            >
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-white shadow-xs text-left">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[38%] pl-6">Guest</TableHead>
                      <TableHead className="w-[24%]">Status</TableHead>
                      <TableHead className="w-[16%]">Party</TableHead>
                      <TableHead className="w-[22%] text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="pl-6 text-left">
                        <div className="font-semibold text-foreground">Elena Rostova</div>
                        <div className="text-xs text-muted-foreground">elena@example.com</div>
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge variant="success">Approved</Badge>
                      </TableCell>
                      <TableCell className="text-left text-xs font-mono">3 / 4</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-xl border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-400 shadow-2xs transition-colors"
                            title="Approve"
                            aria-label="Approve"
                            onClick={() => toast.success('Approved Elena Rostova')}
                          >
                            <CheckIcon className="size-4 stroke-[2.5]" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-xl border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-400 shadow-2xs transition-colors"
                            title="Reject"
                            aria-label="Reject"
                            onClick={() => toast.error('Rejected Elena Rostova')}
                          >
                            <XIcon className="size-4 stroke-[2.5]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-left">
                        <div className="font-semibold text-foreground">Marcus Reed</div>
                        <div className="text-xs text-muted-foreground">marcus@example.com</div>
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge variant="warning">Pending</Badge>
                      </TableCell>
                      <TableCell className="text-left text-xs font-mono">2 / 2</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-xl border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-400 shadow-2xs transition-colors"
                            title="Approve"
                            aria-label="Approve"
                            onClick={() => toast.success('Approved Marcus Reed')}
                          >
                            <CheckIcon className="size-4 stroke-[2.5]" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-xl border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-400 shadow-2xs transition-colors"
                            title="Reject"
                            aria-label="Reject"
                            onClick={() => toast.error('Rejected Marcus Reed')}
                          >
                            <XIcon className="size-4 stroke-[2.5]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Stacked List */}
              <div className="grid gap-3 sm:hidden text-left">
                <Card className="p-4 border-border bg-white shadow-xs text-left">
                  <div className="flex items-center justify-between text-left">
                    <div className="text-left">
                      <strong className="block text-sm font-semibold text-foreground">Elena Rostova</strong>
                      <p className="text-xs text-muted-foreground">elena@example.com</p>
                    </div>
                    <Badge variant="success">Approved</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                    <span className="text-muted-foreground">Party: 3 / 4</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-lg border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-2xs"
                        title="Approve"
                        aria-label="Approve"
                        onClick={() => toast.success('Approved Elena Rostova')}
                      >
                        <CheckIcon className="size-3.5 stroke-[2.5]" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-lg border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-2xs"
                        title="Reject"
                        aria-label="Reject"
                        onClick={() => toast.error('Rejected Elena Rostova')}
                      >
                        <XIcon className="size-3.5 stroke-[2.5]" />
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-border bg-white shadow-xs text-left">
                  <div className="flex items-center justify-between text-left">
                    <div className="text-left">
                      <strong className="block text-sm font-semibold text-foreground">Marcus Reed</strong>
                      <p className="text-xs text-muted-foreground">marcus@example.com</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                    <span className="text-muted-foreground">Party: 2 / 2</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-lg border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-2xs"
                        title="Approve"
                        aria-label="Approve"
                        onClick={() => toast.success('Approved Marcus Reed')}
                      >
                        <CheckIcon className="size-3.5 stroke-[2.5]" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-lg border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-2xs"
                        title="Reject"
                        aria-label="Reject"
                        onClick={() => toast.error('Rejected Marcus Reed')}
                      >
                        <XIcon className="size-3.5 stroke-[2.5]" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </Section>

            {/* 10. Layout containers */}
            <Section
              id="layout"
              title="Layout containers"
              description="Cards use tonal layering, consistent borders, and soft-rounded corners."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border-border bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Level 1 / Card
                  </span>
                  <h3 className="mt-2 font-heading text-lg font-bold text-foreground">
                    Spring reception
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    128 guests · Confirmed
                  </p>
                </Card>

                <Card className="border-border bg-white p-5 shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Interactive card
                  </span>
                  <h3 className="mt-2 font-heading text-lg font-bold text-foreground">
                    Guest responses
                  </h3>
                  <div className="my-3">
                    <Progress value={72} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">72% responded</p>
                </Card>

                <Card className="border-slate-800 bg-slate-900 text-white p-5 shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Dark surface
                  </span>
                  <h3 className="mt-2 font-heading text-lg font-bold text-white">
                    Organizer workspace
                  </h3>
                  <p className="mt-1 text-xs text-slate-300">
                    Manage event details from one focused view.
                  </p>
                </Card>
              </div>
            </Section>

            {/* 11. Global Chrome */}
            <Section
              id="global-chrome"
              title="Global chrome"
              description="Cross-portal navigation bar, mobile drawer, boot overlay, and session management — shared runtime from eirmis.js."
            >
              <div className="space-y-8">
                {/* Global Nav Bar */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Global navigation bar
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Glassmorphic sticky header with brand, portal links, and session pill. Responsive: links collapse to hamburger + drawer below 768px.
                    </p>
                  </div>
                  <div className="relative">
                    <nav className="eirmis-global-nav" style={{ position: 'relative', top: 0, zIndex: 100 }}>
                      <div className="eirmis-global-nav-inner">
                        <a className="eirmis-nav-brand" href="javascript:void(0)">
                          <span className="eirmis-nav-logo">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </span>
                          <span className="eirmis-nav-brand-name">EIRMIS</span>
                          <span className="eirmis-nav-pill-badge">PRODUCTION PREVIEW</span>
                        </a>
                        <div className="eirmis-nav-links">
                          <a className="eirmis-nav-link active" href="javascript:void(0)">Public Hub</a>
                          <a className="eirmis-nav-link" href="javascript:void(0)">Organizer Portal</a>
                          <a className="eirmis-nav-link" href="javascript:void(0)">Admin Portal</a>
                          <a className="eirmis-nav-link" href="javascript:void(0)">Guest Portal</a>
                          <a className="eirmis-nav-link" href="javascript:void(0)">Staff Scanner</a>
                        </div>
                        <div className="eirmis-nav-session" id="styleguide-nav-session"></div>
                      </div>
                    </nav>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Session pill renders signed-in state (avatar, name, role badge, sign out) or "Sign in" CTA when signed out.
                  </p>
                </div>

                {/* Mobile Drawer */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Mobile drawer
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Slide-in panel from left with backdrop blur. Triggered by hamburger in global nav at mobile breakpoint.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const drawer = document.getElementById('styleguide-drawer');
                        const backdrop = document.getElementById('styleguide-drawer-backdrop');
                        if (drawer) drawer.classList.add('open');
                        if (backdrop) backdrop.classList.add('open');
                        document.body.style.overflow = 'hidden';
                      }}
                    >
                      Open Drawer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const drawer = document.getElementById('styleguide-drawer');
                        const backdrop = document.getElementById('styleguide-drawer-backdrop');
                        if (drawer) drawer.classList.remove('open');
                        if (backdrop) backdrop.classList.remove('open');
                        document.body.style.overflow = '';
                      }}
                    >
                      Close Drawer
                    </Button>
                  </div>
                  <div className="mt-4">
                    <div className="eirmis-drawer-backdrop" id="styleguide-drawer-backdrop" onClick={() => {
                      const drawer = document.getElementById('styleguide-drawer');
                      const backdrop = document.getElementById('styleguide-drawer-backdrop');
                      if (drawer) drawer.classList.remove('open');
                      if (backdrop) backdrop.classList.remove('open');
                      document.body.style.overflow = '';
                    }} />
                    <aside className="eirmis-mobile-drawer" id="styleguide-drawer">
                      <div className="eirmis-drawer-header">
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '16px' }}>Menu</div>
                        <button className="eirmis-hamburger" style={{ display: 'flex' }} onClick={() => {
                          const drawer = document.getElementById('styleguide-drawer');
                          const backdrop = document.getElementById('styleguide-drawer-backdrop');
                          if (drawer) drawer.classList.remove('open');
                          if (backdrop) backdrop.classList.remove('open');
                          document.body.style.overflow = '';
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <div id="styleguide-drawer-content" style={{ padding: '16px' }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '8px', padding: '0 12px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Portals
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <a href="#" className="nav-btn eirmis-nav-btn active" style={{ padding: '12px 16px', textDecoration: 'none' }}>Public Hub</a>
                          <a href="#" className="nav-btn eirmis-nav-btn" style={{ padding: '12px 16px', textDecoration: 'none' }}>Organizer Portal</a>
                          <a href="#" className="nav-btn eirmis-nav-btn" style={{ padding: '12px 16px', textDecoration: 'none' }}>Admin Portal</a>
                          <a href="#" className="nav-btn eirmis-nav-btn" style={{ padding: '12px 16px', textDecoration: 'none' }}>Guest Portal</a>
                          <a href="#" className="nav-btn eirmis-nav-btn" style={{ padding: '12px 16px', textDecoration: 'none' }}>Staff Scanner</a>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>

                {/* Boot Overlay */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Boot loading overlay
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Full-screen centered spinner with animated progress bar. Auto-dismisses after ~350ms. Called via EIRMIS.init().
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const overlay = document.createElement('div');
                      overlay.id = 'styleguide-boot-overlay';
                      overlay.style.cssText = 'position:fixed;inset:0;z-index:5000;background:#F8FAFC;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;transition:opacity 0.25s ease;';
                      overlay.innerHTML = '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#4F46E5,#312E81);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 20px rgba(79,70,229,0.35);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><div style="font-family:Inter,system-ui,sans-serif;font-size:13.5px;color:#0F172A;font-weight:700;">EIRMIS Architecture</div><div style="width:140px;height:4px;background:#E2E8F0;border-radius:999px;overflow:hidden;"><div style="height:100%;width:45%;background:#4F46E5;border-radius:999px;animation:eirmisBootBar 0.85s ease-in-out infinite;"></div></div>';
                      document.body.appendChild(overlay);
                      const style = document.createElement('style');
                      style.textContent = '@keyframes eirmisBootBar{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}';
                      document.head.appendChild(style);
                      setTimeout(() => {
                        overlay.style.opacity = '0';
                        setTimeout(() => overlay.remove(), 250);
                      }, 350);
                    }}
                  >
                    Show Boot Overlay
                  </Button>
                </div>

                {/* Session Pill & Role Badge */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Session pill & role badge
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Avatar with initials, name, role badge, sign-out button. Variants for all 4 roles + signed-out state.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {['Organizer', 'Administrator', 'Guest', 'Check-in Staff'].map((role) => (
                      <div key={role} className="p-4 border border-border rounded-xl bg-white">
                        <div className="eirmis-session-pill" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 12px 4px 5px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', boxShadow: 'var(--shadow-xs)', width: 'fit-content' }}>
                          <span className="eirmis-session-avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #312E81 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)', flexShrink: 0 }}>
                            {role.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </span>
                          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {role === 'Check-in Staff' ? 'Marcus Staff' : role === 'Administrator' ? 'Root Admin' : role === 'Guest' ? 'Elena Rostova' : 'Sarah Jenkins'}
                          </span>
                          <span className="eirmis-session-role" style={{ fontSize: '10.5px', color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', flexShrink: 0 }}>
                            {role}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 border border-border rounded-xl bg-white">
                      <a className="eirmis-btn eirmis-btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }} href="javascript:void(0)">
                        Sign in
                      </a>
                      <p className="mt-2 text-xs text-muted-foreground">Signed-out CTA</p>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* 12. Layout Primitives */}
            <Section
              id="layout-primitives"
              title="Layout primitives"
              description="Collapsibles, sidebars, topbars, breadcrumbs, and event grid — structural building blocks used across portals."
            >
              <div className="space-y-8">
                {/* Collapsible Sections */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Collapsible sections
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Animated chevron, open state styling, content fade-in. From eirmis.css details.eirmis-collapse.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <details className="eirmis-collapse" open>
                      <summary className="eirmis-collapse-header">
                        Event details & venue
                      </summary>
                      <div className="eirmis-collapse-content">
                        <p className="text-sm text-muted-foreground">
                          Marina Bay Sands Grand Ballroom, Singapore · Nov 18, 2026 · 6:30 PM SGT
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>100 Raffles Blvd, Singapore 039593</span>
                        </div>
                      </div>
                    </details>
                    <details className="eirmis-collapse">
                      <summary className="eirmis-collapse-header">
                        Registration settings
                      </summary>
                      <div className="eirmis-collapse-content">
                        <p className="text-sm text-muted-foreground">
                          Configure RSVP deadline, party size limits, and approval workflow.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <label className="toggle-switch">
                            <input type="checkbox" defaultChecked />
                            <span className="toggle-slider"></span>
                          </label>
                          <span className="text-sm text-muted-foreground">Require approval</span>
                        </div>
                      </div>
                    </details>
                    <details className="eirmis-collapse">
                      <summary className="eirmis-collapse-header">
                        Email notifications
                      </summary>
                      <div className="eirmis-collapse-content">
                        <p className="text-sm text-muted-foreground">
                          Customize invitation, reminder, and confirmation email templates.
                        </p>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Sidebar System */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Sidebar system
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Primary sidebar (250px → 72px icon rail) with sub-sidebar (220px, event-scoped). Collapse behavior with badge positioning.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Primary Sidebar - Expanded */}
                    <div className="rounded-xl border border-border bg-slate-50/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Expanded (250px)</p>
                      <div className="space-y-1.5 max-w-xs">
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-border text-left hover:bg-slate-50" title="Dashboard">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600 flex-shrink-0">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span className="font-medium text-sm">Dashboard</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-border text-left hover:bg-slate-50" title="Events">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 flex-shrink-0">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="text-sm flex-1">Events</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">3</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-border text-left hover:bg-slate-50" title="Guests">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 flex-shrink-0">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="text-sm flex-1">Guests</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">12</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-border text-left hover:bg-slate-50" title="Approvals">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 flex-shrink-0">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span className="text-sm flex-1">Approvals</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">5</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-border text-left hover:bg-slate-50" title="Attendance">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 flex-shrink-0">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path d="M8 21h8" />
                            <path d="M12 17v4" />
                          </svg>
                          <span className="text-sm">Attendance</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-border text-left hover:bg-slate-50" title="Staff">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 flex-shrink-0">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span className="text-sm">Staff</span>
                        </button>
                      </div>
                    </div>
                    {/* Primary Sidebar - Collapsed */}
                    <div className="rounded-xl border border-border bg-slate-50/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 text-center">Collapsed (72px)</p>
                      <div className="flex flex-col items-center gap-2">
                        <button className="w-12 h-12 p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1 relative" title="Dashboard">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1 relative" title="Events">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">3</span>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1 relative" title="Guests">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">12</span>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1 relative" title="Approvals">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                            <path d="M9 12l2 2 4-4" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">5</span>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1" title="Attendance">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path d="M8 21h8" />
                            <path d="M12 17v4" />
                          </svg>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1" title="Staff">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Sub-sidebar */}
                    <div className="rounded-xl border border-border bg-slate-50/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sub-sidebar (220px)</p>
                      <div className="space-y-1 max-w-xs">
                        <button className="w-full text-left p-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium flex items-center gap-2">Overview</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Guests</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Approvals</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Attendance</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Staff</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Reminders</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Design</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Check-in</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Waitlist</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Email log</button>
                        <button className="w-full text-left p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm flex items-center gap-2">Audit log</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glassmorphic Topbar */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Glassmorphic topbar
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Backdrop-filter blur, search box with KBD hint, icon buttons, user pill. Responsive: search flexes, user pill condenses to avatar-only.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-white/80 backdrop-blur-md p-4" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px) saturate(180%)' }}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button className="eirmis-hamburger p-2 rounded-lg hover:bg-slate-100" style={{ display: 'flex' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0 relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input type="text" placeholder="Search events, guests..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded">
                            <span>⌘</span><span>K</span>
                          </kbd>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-100" title="Help/Support">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-100" title="Notifications">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        </button>
                        <div className="eirmis-session-pill" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 12px 4px 5px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', boxShadow: 'var(--shadow-xs)' }}>
                          <span className="eirmis-session-avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #312E81 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)' }}>
                            SJ
                          </span>
                          <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Sarah Jenkins
                          </span>
                          <span className="eirmis-session-role" style={{ fontSize: '10.5px', color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-pill)' }}>
                            Organizer
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Mobile: hamburger visible, search condenses, user pill → avatar only</p>
                  </div>
                </div>

                {/* Breadcrumbs */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Breadcrumbs
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Separator, link hover, current page styling. Used in Organizer and Admin portals.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#">Events</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#">Tech Forward Annual Gala 2026</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Guests</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#">Admin</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#">Organizers</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Arthur Vance</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Overview</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                  </div>
                </div>

                {/* Event Grid Cards */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Event grid cards
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      4/3/2/1 column responsive grid. Hover lift, consistent padding, icon + title + meta + actions.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[
                      { title: 'Tech Forward Annual Gala 2026', date: 'Nov 18, 2026', venue: 'Marina Bay Sands', status: 'published', rsvp: '112/150', icon: '🏢' },
                      { title: 'Apex Healthcare Summit', date: 'Dec 02, 2026', venue: 'Raffles City', status: 'published', rsvp: '214/300', icon: '🏥' },
                      { title: 'Global Leadership Forum', date: 'Jan 15, 2027', venue: 'Suntec Singapore', status: 'draft', rsvp: '0/500', icon: '🌐' },
                      { title: 'University Faculty Mixer', date: 'Feb 10, 2027', venue: 'Campus Center', status: 'draft', rsvp: '0/80', icon: '🎓' },
                    ].map((event, i) => (
                      <div key={i} className="card group relative overflow-hidden border border-border bg-white rounded-2xl shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-3xl">{event.icon}</div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${event.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {event.status}
                            </span>
                          </div>
                          <h3 className="mt-3 font-heading text-lg font-bold text-foreground line-clamp-1">{event.title}</h3>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              <span>{event.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{event.venue}</span>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{event.rsvp}</span>
                            <Button size="xs" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* 13. Data Display Primitives */}
            <Section
              id="data-display"
              title="Data display primitives"
              description="KPI metrics, glanceable stat cards, segmented progress bars, activity streams, and zero-knowledge boundary notices."
            >
              <div className="space-y-8">
                {/* 1. KPI & Metric Cards */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      KPI & Metric cards
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Glanceable system metrics (Miller&apos;s Law 4-chunk layout) and event-scoped metric cards with hover lift, status accents, and progress indicators.
                    </p>
                  </div>

                  {/* Admin KPI Strip */}
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Admin Portal — Platform &amp; Security Glance Strip (.kpi-card)
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* KPI 1 */}
                      <div className="rounded-xl border border-border bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Pending Organizers</span>
                          <ClockIcon className="size-4 text-amber-600" />
                        </div>
                        <div className="mt-2 font-heading text-2xl font-extrabold text-amber-600 sm:text-3xl">
                          2
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Awaiting manual gate review
                        </div>
                      </div>

                      {/* KPI 2 */}
                      <div className="rounded-xl border border-border bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Active Organizers</span>
                          <CheckCircleIcon className="size-4 text-emerald-600" />
                        </div>
                        <div className="mt-2 font-heading text-2xl font-extrabold text-foreground sm:text-3xl">
                          24
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Authorized to create events
                        </div>
                      </div>

                      {/* KPI 3 */}
                      <div className="rounded-xl border border-border bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Malware Engine</span>
                          <ShieldCheckIcon className="size-4 text-indigo-600" />
                        </div>
                        <div className="mt-2 font-heading text-xl font-bold text-emerald-600 sm:text-2xl">
                          Malware Engine v3
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Static sandbox parsing: Active
                        </div>
                      </div>

                      {/* KPI 4 */}
                      <div className="rounded-xl border border-border bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Audit Log Stream</span>
                          <ActivityIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="mt-2 font-heading text-xl font-bold text-foreground sm:text-2xl">
                          100% Intact
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Immutable append-only ledger
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Organizer Metric Grid */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Organizer Portal — Event Capacity &amp; Action Metrics (.metric-card)
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Metric 1 */}
                      <div className="rounded-2xl border border-border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Total Capacity</span>
                          <Building2Icon className="size-4 text-slate-400" />
                        </div>
                        <div className="mt-3 font-heading text-3xl font-extrabold text-foreground">
                          150
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Max venue allocation
                        </div>
                      </div>

                      {/* Metric 2 (With Progress Bar) */}
                      <div className="rounded-2xl border border-border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>RSVPs</span>
                          <MailIcon className="size-4 text-slate-400" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5 font-heading text-3xl font-extrabold text-foreground">
                          <span>112</span>
                          <span className="text-base font-medium text-muted-foreground">/ 150</span>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                            style={{ width: '74.6%' }}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          74.6% confirmed attendance
                        </div>
                      </div>

                      {/* Metric 3 (Left-Border Accent) */}
                      <div className="rounded-2xl border border-border border-l-[3px] border-l-amber-500 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Pending Approvals</span>
                          <LuggageIcon className="size-4 text-slate-400" />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-heading text-3xl font-extrabold text-foreground">3</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            Requires Action
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Awaiting VIP organizer sign-off
                        </div>
                      </div>

                      {/* Metric 4 */}
                      <div className="rounded-2xl border border-border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Checked In</span>
                          <UsersIcon className="size-4 text-slate-400" />
                        </div>
                        <div className="mt-3 font-heading text-3xl font-extrabold text-teal-600">
                          48
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Scanned at entrance reticle
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Stat Cards (Check-in Scanner) */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Stat cards (Check-in Scanner)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clean 2-column centered cards designed for rapid glanceability during fast-paced door credential scanning (.stat-card).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-xl">
                    <div className="rounded-xl border border-border bg-white p-5 text-center shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Checked-In
                      </div>
                      <div className="mt-2 font-heading text-4xl font-extrabold text-teal-600">
                        48
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Scanned entrance attendees
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-5 text-center shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Expected Total
                      </div>
                      <div className="mt-2 font-heading text-4xl font-extrabold text-foreground">
                        112
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Confirmed guest roster
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Segmented Progress Bar */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Segmented progress bar &amp; RSVP breakdown
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Proportional multi-state track with animated width transitions (.segmented-bar) and companion semantic breakdown dots.
                      </p>
                    </div>
                    {/* Distribution Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          setRsvpDistribution({ accepted: 84, declined: 14, tentative: 14, unanswered: 38 })
                        }
                      >
                        Default Seed
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          setRsvpDistribution({ accepted: 120, declined: 10, tentative: 8, unanswered: 12 })
                        }
                      >
                        High Turnout
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          setRsvpDistribution({ accepted: 40, declined: 35, tentative: 25, unanswered: 50 })
                        }
                      >
                        Heavy Influx
                      </Button>
                    </div>
                  </div>

                  <div className="max-w-2xl rounded-xl border border-border bg-slate-50/50 p-5">
                    <div className="mb-3 flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>RSVP Summary</span>
                      <span className="text-muted-foreground">{totalRsvps} Total Invitees</span>
                    </div>

                    {/* The Segmented Bar */}
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 flex"
                      title={`Accepted: ${rsvpDistribution.accepted}, Declined: ${rsvpDistribution.declined}, Tentative: ${rsvpDistribution.tentative}, Unanswered: ${rsvpDistribution.unanswered}`}
                    >
                      <div
                        className="bg-emerald-500 transition-all duration-500 ease-in-out"
                        style={{ width: `${pctAccepted}%` }}
                        title={`Accepted: ${rsvpDistribution.accepted} (${pctAccepted}%)`}
                      />
                      <div
                        className="bg-rose-500 transition-all duration-500 ease-in-out"
                        style={{ width: `${pctDeclined}%` }}
                        title={`Declined: ${rsvpDistribution.declined} (${pctDeclined}%)`}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-500 ease-in-out"
                        style={{ width: `${pctTentative}%` }}
                        title={`Tentative: ${rsvpDistribution.tentative} (${pctTentative}%)`}
                      />
                      <div
                        className="bg-slate-300 transition-all duration-500 ease-in-out"
                        style={{ width: `${pctUnanswered}%` }}
                        title={`No Response: ${rsvpDistribution.unanswered} (${pctUnanswered}%)`}
                      />
                    </div>

                    {/* Breakdown List */}
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">Accepted</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {rsvpDistribution.accepted} <span className="text-[10px] text-muted-foreground font-normal">({pctAccepted}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">Declined</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {rsvpDistribution.declined} <span className="text-[10px] text-muted-foreground font-normal">({pctDeclined}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">Tentative</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {rsvpDistribution.tentative} <span className="text-[10px] text-muted-foreground font-normal">({pctTentative}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-slate-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">No Response</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {rsvpDistribution.unanswered} <span className="text-[10px] text-muted-foreground font-normal">({pctUnanswered}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Activity Stream */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Activity stream
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Chronological event feed with circular colored icon badges, actor attribution, and relative timestamps (.activity-list).
                    </p>
                  </div>
                  <div className="max-w-xl space-y-3.5">
                    {/* Item 1 - Green */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckIcon className="size-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="text-foreground">
                          <span className="font-semibold text-foreground">Sarah Jenkins</span> RSVP&apos;d{' '}
                          <strong className="text-emerald-700 font-semibold">Attending</strong>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">10 mins ago</div>
                      </div>
                    </div>

                    {/* Item 2 - Red */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                        <XIcon className="size-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="text-foreground">
                          <span className="font-semibold text-foreground">Michael Chang</span> RSVP&apos;d{' '}
                          <strong className="text-rose-700 font-semibold">Declined</strong>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">45 mins ago</div>
                      </div>
                    </div>

                    {/* Item 3 - Purple / Indigo */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <SparklesIcon className="size-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="text-foreground">
                          <span className="font-semibold text-foreground">System Admin</span> updated the event description and venue access rules.
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">2 hours ago</div>
                      </div>
                    </div>

                    {/* Item 4 - Amber */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <ClockIcon className="size-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="text-foreground">
                          <span className="font-semibold text-foreground">Waitlist System</span> auto-promoted{' '}
                          <span className="font-semibold text-foreground">Elena Rostova</span> to confirmed guest.
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">4 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Boundary & Security Banners */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Boundary &amp; security banners
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      High-visibility zero-knowledge architectural policy banners and scoped access boundary notices (.boundary-banner, .boundary-notice).
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* Policy Banner: Zero-Knowledge Architecture (Primary / Info) */}
                    <div className="rounded-xl border border-border border-l-4 border-l-indigo-600 bg-white p-4 shadow-xs sm:p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                          <LockIcon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-heading text-sm font-bold text-foreground">
                              Zero-Knowledge Event Data Architecture
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              ENFORCED BY POLICY
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                            System Administrators govern organizer verification and platform security defaults only. Admins have zero database read or write permissions over event guest lists, invitations, or attendee rosters.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Role Scoped Assignment Notice */}
                    <div className="rounded-xl border border-border bg-slate-50/50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Interactive Scope Simulator
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground mr-1">Simulate role:</span>
                          {(['Check-in Staff', 'Organizer', 'Guest'] as const).map((r) => (
                            <Button
                              key={r}
                              size="xs"
                              variant={boundaryRole === r ? 'primary' : 'outline'}
                              onClick={() => setBoundaryRole(r)}
                            >
                              {r === 'Check-in Staff' ? 'Staff' : r}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {boundaryRole !== 'Guest' ? (
                        <div className="flex flex-col gap-3 rounded-xl border border-border border-l-4 border-l-emerald-600 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-bold text-foreground">Tech Forward Gala 2026</strong>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Assigned {boundaryRole.toLowerCase()} • active event-day scanning scope
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                              Authorized
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border border-l-4 border-l-rose-600 bg-rose-50/40 p-4 shadow-xs">
                          <div className="flex items-start gap-3">
                            <AlertCircleIcon className="size-5 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <strong className="text-sm font-bold text-rose-950">
                                Check-in access restricted
                              </strong>
                              <p className="mt-1 text-xs text-rose-800">
                                Only the assigned Check-in Staff or event Organizer can record attendance for this event. Your current role is <strong>Guest</strong>.
                              </p>
                              <div className="mt-3">
                                <Button size="xs" variant="outline" className="border-rose-300 text-rose-900 hover:bg-rose-100">
                                  Request Door Access
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* 14. Form & Interaction Primitives */}
            <Section
              id="form-interactions"
              title="Form & interaction primitives"
              description="Segmented controls, wizard stepper, custom spring toggles, pill search inputs, icon action buttons, and live validation error states."
            >
              <div className="space-y-8">
                {/* 1. Segmented Controls */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Segmented controls (.segmented-control)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Full-width or inline pill container distinct from underline tabs. Active pill lifts with subtle elevation and border shadow.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Admin Portal Segmented Nav */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Admin Portal Navigation (Full-width pill track)
                      </p>
                      <div className="inline-flex rounded-full bg-slate-200/80 p-1 gap-1 text-xs font-semibold text-muted-foreground">
                        {[
                          { id: 'overview', label: 'Overview' },
                          { id: 'organizers', label: 'Organizers' },
                          { id: 'audit', label: 'Audit Log' },
                          { id: 'settings', label: 'Platform Policy' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSegmentedTab(tab.id)}
                            className={`rounded-full px-4 py-1.5 transition-all duration-150 cursor-pointer ${
                              segmentedTab === tab.id
                                ? 'bg-white text-foreground shadow-xs font-bold'
                                : 'text-slate-600 hover:text-foreground'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Active tab: <strong className="text-indigo-600">{segmentedTab}</strong>
                      </p>
                    </div>

                    {/* Guest Portal Tab Buttons */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Guest Portal Tab Switcher (.seg-tab-btn)
                      </p>
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1 text-xs font-medium border border-border">
                        {[
                          { id: 'rsvp', label: 'RSVP Response' },
                          { id: 'details', label: 'Event Schedule' },
                          { id: 'venue', label: 'Venue & Travel' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setGuestSegmentedTab(tab.id)}
                            className={`rounded-lg px-3.5 py-1.5 transition-all duration-150 cursor-pointer ${
                              guestSegmentedTab === tab.id
                                ? 'bg-white text-indigo-700 shadow-xs font-bold border border-border'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Stepper / Wizard */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Stepper &amp; wizard (.stepper-bar)
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Progressive milestone stepper with filled progress track, done (check), active (glowing ring), and pending states.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={wizardStep === 1}
                        onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                      >
                        Previous Step
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        disabled={wizardStep === 4}
                        onClick={() => setWizardStep((s) => Math.min(4, s + 1))}
                      >
                        Next Step
                      </Button>
                    </div>
                  </div>

                  <div className="relative py-6 max-w-2xl mx-auto">
                    {/* Background line */}
                    <div className="absolute top-10 left-8 right-8 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                    {/* Fill line */}
                    <div
                      className="absolute top-10 left-8 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-300 ease-out"
                      style={{
                        width: `${((wizardStep - 1) / 3) * 100}%`,
                        maxWidth: 'calc(100% - 64px)',
                      }}
                    />

                    {/* Nodes */}
                    <div className="relative z-10 flex justify-between items-start">
                      {[
                        { step: 1, title: 'Basics', desc: 'Title & Venue' },
                        { step: 2, title: 'Schedule', desc: 'Date & Time' },
                        { step: 3, title: 'Settings', desc: 'RSVP Rules' },
                        { step: 4, title: 'Publish', desc: 'Review & Live' },
                      ].map((item) => {
                        const isDone = item.step < wizardStep
                        const isActive = item.step === wizardStep

                        return (
                          <button
                            key={item.step}
                            type="button"
                            onClick={() => setWizardStep(item.step)}
                            className="flex flex-col items-center bg-white px-2 group cursor-pointer focus:outline-none"
                          >
                            <div
                              className={`size-8 rounded-full flex items-center justify-center font-heading text-xs font-bold transition-all duration-200 ${
                                isDone
                                  ? 'bg-indigo-600 text-white'
                                  : isActive
                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-xs'
                                  : 'bg-slate-100 text-slate-500 border-2 border-slate-200 group-hover:border-slate-300'
                              }`}
                            >
                              {isDone ? <CheckIcon className="size-4 stroke-[3]" /> : item.step}
                            </div>
                            <span
                              className={`mt-2 text-xs font-semibold ${
                                isActive ? 'text-indigo-600 font-bold' : isDone ? 'text-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground hidden sm:block">
                              {item.desc}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Custom Toggle Switch */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Custom toggle switch (.toggle-switch)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      44×24px track with 18px thumb and smooth cubic-bezier spring animation. Used for event policies and privacy controls.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50/50 p-4">
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">
                          Require RSVP Approval
                        </strong>
                        <p className="text-xs text-muted-foreground">
                          Gate registrations through organizer queue
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={customToggle1}
                          onChange={(e) => setCustomToggle1(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all after:duration-200 peer-checked:bg-indigo-600 shadow-inner"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50/50 p-4">
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">
                          Plus-One Allotments
                        </strong>
                        <p className="text-xs text-muted-foreground">
                          Allow invitees to register an extra guest
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={customToggle2}
                          onChange={(e) => setCustomToggle2(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all after:duration-200 peer-checked:bg-indigo-600 shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Search Box + KBD Hint */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Search box + KBD hint (.search-box, .kbd-hint)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pill-shaped input with left-aligned search icon, active glow ring, and platform keyboard shortcut indicator.
                    </p>
                  </div>

                  <div className="max-w-md">
                    <div className="relative flex items-center">
                      <SearchIcon className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search guests, email, or tickets..."
                        className="w-full rounded-full border border-border bg-white pl-10 pr-16 py-2 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs transition-all focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-500/15"
                      />
                      <kbd className="absolute right-3 inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                        <span>⌘</span><span>K</span>
                      </kbd>
                    </div>
                    {searchQuery && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Filtering for: <span className="font-semibold text-foreground">&quot;{searchQuery}&quot;</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. Icon Action Buttons */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Icon action buttons (.action-btn, .action-btn-group)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compact 32×32px quick-action targets with active scale depression, semantic background tints, and elevated hover shadows.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Approve Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="size-8 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 flex items-center justify-center transition-all duration-150 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-xs active:scale-95 cursor-pointer"
                          title="Approve guest registration"
                          onClick={() => toast.success('Approved RSVP for guest')}
                        >
                          <CheckIcon className="size-4 stroke-[2.5]" />
                        </button>
                        <span className="text-xs text-muted-foreground">Approve (.action-btn-approve)</span>
                      </div>

                      {/* Reject Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="size-8 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 flex items-center justify-center transition-all duration-150 hover:bg-rose-100 hover:border-rose-400 hover:shadow-xs active:scale-95 cursor-pointer"
                          title="Reject guest registration"
                          onClick={() => toast.error('Rejected RSVP for guest')}
                        >
                          <XIcon className="size-4 stroke-[2.5]" />
                        </button>
                        <span className="text-xs text-muted-foreground">Reject (.action-btn-reject)</span>
                      </div>

                      {/* Simulate / Info Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="size-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center transition-all duration-150 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-xs active:scale-95 cursor-pointer"
                          title="Simulate check-in barcode scan"
                          onClick={() => toast.info('Simulated camera reticle trigger')}
                        >
                          <SparklesIcon className="size-4" />
                        </button>
                        <span className="text-xs text-muted-foreground">Simulate (.action-btn-simulate)</span>
                      </div>
                    </div>

                    {/* Button Group in Context */}
                    <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50/50 p-3 max-w-md">
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">Arthur Vance (VIP Speaker)</strong>
                        <span className="text-[11px] text-muted-foreground">Requesting table seat #4</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="size-8 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 flex items-center justify-center transition-all hover:bg-emerald-100 active:scale-95 cursor-pointer"
                          title="Approve"
                          onClick={() => toast.success('Approved Arthur Vance')}
                        >
                          <CheckIcon className="size-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          className="size-8 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 flex items-center justify-center transition-all hover:bg-rose-100 active:scale-95 cursor-pointer"
                          title="Reject"
                          onClick={() => toast.error('Rejected Arthur Vance')}
                        >
                          <XIcon className="size-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Custom Dropdown Menus */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Custom dropdown menu (.dropdown, .dropdown-menu)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Right-aligned context menu with spring entrance translation, item icons, divider separators, and danger actions.
                    </p>
                  </div>

                  <div className="relative inline-block text-left">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomDropdownOpen((prev) => !prev)}
                      className="gap-2"
                    >
                      <span>Actions Menu</span>
                      <ChevronDownIcon className="size-3.5" />
                    </Button>

                    {customDropdownOpen && (
                      <div
                        className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-52 rounded-xl border border-border bg-white p-1.5 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150"
                        onMouseLeave={() => setCustomDropdownOpen(false)}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-slate-100 transition-colors text-left cursor-pointer"
                          onClick={() => {
                            toast('Downloading attendee roster')
                            setCustomDropdownOpen(false)
                          }}
                        >
                          <DownloadIcon className="size-3.5 text-muted-foreground" />
                          <span>Export Guest CSV</span>
                        </button>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-slate-100 transition-colors text-left cursor-pointer"
                          onClick={() => {
                            toast('Invitation batch sent')
                            setCustomDropdownOpen(false)
                          }}
                        >
                          <MailIcon className="size-3.5 text-muted-foreground" />
                          <span>Send Reminders</span>
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                          onClick={() => {
                            toast.error('Removed event registration')
                            setCustomDropdownOpen(false)
                          }}
                        >
                          <Trash2Icon className="size-3.5 text-rose-600" />
                          <span>Cancel Event</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Field Error States */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Field error states (.field-error, .form-control-error)
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Validation error display with red focus ring accent, input border tint, and flex icon message.
                      </p>
                    </div>
                    <Button
                      size="xs"
                      variant={formFieldError ? 'outline' : 'primary'}
                      onClick={() => setFormFieldError((prev) => !prev)}
                    >
                      Toggle State: {formFieldError ? 'Invalid (Red Ring)' : 'Valid Input'}
                    </Button>
                  </div>

                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Corporate Contact Email
                      </label>
                      <input
                        type="email"
                        defaultValue="invalid-email@sample"
                        className={`w-full rounded-xl border px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground transition-all focus:outline-none ${
                          formFieldError
                            ? 'border-rose-500 bg-rose-50/20 ring-3 ring-rose-500/10 focus:border-rose-600'
                            : 'border-border bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-500/15'
                        }`}
                      />
                      {formFieldError && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
                          <AlertCircleIcon className="size-3.5 shrink-0" />
                          <span>Please provide a valid company domain email address.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* 15. Feedback & State Primitives */}
            <Section
              id="feedback-states"
              title="Feedback & state primitives"
              description="Toasts with progress bars, modal sheets, waitlist promotion flows, restricted table rows, and user avatar pills."
            >
              <div className="space-y-8">
                {/* 1. Toast with Progress Bar */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Toast with animated progress bar (.eirmis-toast)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dark glassmorphic container with semantic circular badge, linear 3.2s progress duration bar, and spring elevation entrance.
                    </p>
                  </div>

                  {/* Trigger Buttons */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() =>
                        triggerProgressToast('success', 'RSVP confirmed for Elena Rostova (Marina Bay Ballroom).')
                      }
                    >
                      Trigger Success Toast
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() =>
                        triggerProgressToast('warning', 'Venue capacity at 90% (135/150 seats reserved).')
                      }
                    >
                      Trigger Warning Toast
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() =>
                        triggerProgressToast('error', 'Invalid check-in QR credentials. Please verify scanner.')
                      }
                    >
                      Trigger Error Toast
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      onClick={() =>
                        triggerProgressToast('info', 'Batch reminder dispatched to 24 unconfirmed guests.')
                      }
                    >
                      Trigger Info Toast
                    </Button>
                  </div>

                  {/* Static Previews of the 4 Variants */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-3xl">
                    {/* Success Preview */}
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-3.5 text-white shadow-md backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <CheckIcon className="size-3.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-medium flex-1">Guest RSVP accepted and seat reserved</span>
                        <span className="text-xs text-slate-400">×</span>
                      </div>
                      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-emerald-500" />
                    </div>

                    {/* Warning Preview */}
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-3.5 text-white shadow-md backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                          <ClockIcon className="size-3.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-medium flex-1">RSVP deadline closes in 4 hours</span>
                        <span className="text-xs text-slate-400">×</span>
                      </div>
                      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-amber-500" />
                    </div>

                    {/* Error Preview */}
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-3.5 text-white shadow-md backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                          <XIcon className="size-3.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-medium flex-1">Duplicate check-in scan detected</span>
                        <span className="text-xs text-slate-400">×</span>
                      </div>
                      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-rose-500" />
                    </div>

                    {/* Info Preview */}
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-3.5 text-white shadow-md backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <InfoIcon className="size-3.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-medium flex-1">Export file ready for download</span>
                        <span className="text-xs text-slate-400">×</span>
                      </div>
                      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* 2. Custom Modal Sheets */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Custom modal sheet (.modal-overlay, .modal-box)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      480px responsive dialog card featuring spring scale entrance (scale 0.95→1), backdrop blur, and full accessibility keys.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCustomModalSheetOpen(true)}
                  >
                    Open Custom Modal Sheet Demo
                  </Button>
                </div>

                {/* 3. Waitlist Promotion Modal */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Waitlist promotion flow (.waitlist-promotion-modal)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Targeted organizer modal with attendee credentials card, buffer capacity note, toggleable overrun error, and processing spinner.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setWaitlistModalOpen(true)}
                    >
                      Open Waitlist Promotion Modal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWaitlistError((prev) => !prev)}
                    >
                      Simulate State: {waitlistError ? 'Error (Capacity Overrun)' : 'Normal Buffer'}
                    </Button>
                  </div>
                </div>

                {/* 4. Restricted Row State */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Restricted row state (.row-restricted, .restricted-label)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Muted opacity, disabled action buttons, and lock status pill with hover explanation tooltip for locked or policy-restricted attendees.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-4">Attendee</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Restriction Note</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Normal Row */}
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">Sarah Jenkins</td>
                          <td className="py-3 px-4">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Confirmed
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">Standard attendee record</td>
                          <td className="py-3 px-4 text-right">
                            <Button size="xs" variant="ghost">Edit</Button>
                          </td>
                        </tr>

                        {/* Restricted Row */}
                        <tr className="bg-slate-50/80 opacity-80 hover:bg-slate-100/60 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-600">
                            Arthur Vance <span className="text-[10px] text-muted-foreground">(Keynote VIP)</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700" title="This guest RSVP is locked by platform administrator policy.">
                              <LockIcon className="size-3 text-slate-600" />
                              <span>LOCKED BY POLICY</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-muted-foreground">
                            Read-only: Governed by System Admin security gate
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button size="xs" variant="ghost" disabled className="cursor-not-allowed opacity-40">
                              Locked
                            </Button>
                          </td>
                        </tr>

                        {/* Normal Row */}
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">Michael Chang</td>
                          <td className="py-3 px-4">
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              Declined
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">Seat released to waitlist</td>
                          <td className="py-3 px-4 text-right">
                            <Button size="xs" variant="ghost">Edit</Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. User Pill / Avatar */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      User pill &amp; avatar (.user-pill, .eirmis-session-pill)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gradient initials avatar, full name with overflow ellipsis, semantic role tag, and condensed mobile presentation.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Full Pill */}
                    <div className="flex items-center gap-2 rounded-full border border-border bg-white py-1 px-3 shadow-xs hover:border-slate-300 transition-all cursor-pointer">
                      <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-900 text-xs font-bold text-white shadow-2xs">
                        SJ
                      </div>
                      <span className="text-xs font-semibold text-foreground">Sarah Jenkins</span>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        Organizer
                      </span>
                    </div>

                    {/* Admin Pill */}
                    <div className="flex items-center gap-2 rounded-full border border-border bg-white py-1 px-3 shadow-xs hover:border-slate-300 transition-all cursor-pointer">
                      <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white shadow-2xs">
                        RA
                      </div>
                      <span className="text-xs font-semibold text-foreground">Root Admin</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Administrator
                      </span>
                    </div>

                    {/* Mobile Condensed Variant */}
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-900 text-xs font-bold text-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
                        title="Sarah Jenkins (Organizer)"
                      >
                        SJ
                      </div>
                      <span className="text-xs text-muted-foreground">Condensed Mobile (Avatar Only)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Custom Toast */}
              {activeToast && (
                <div
                  className="fixed bottom-6 right-6 z-[3000] flex max-w-sm items-center gap-3 overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 p-3.5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in-50 slide-in-from-bottom-5 duration-200"
                  role="alert"
                >
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-white ${
                      activeToast.type === 'success'
                        ? 'bg-emerald-500'
                        : activeToast.type === 'warning'
                        ? 'bg-amber-500'
                        : activeToast.type === 'error'
                        ? 'bg-rose-500'
                        : 'bg-indigo-500'
                    }`}
                  >
                    {activeToast.type === 'success' ? (
                      <CheckIcon className="size-3.5 stroke-[3]" />
                    ) : activeToast.type === 'warning' ? (
                      <ClockIcon className="size-3.5 stroke-[3]" />
                    ) : activeToast.type === 'error' ? (
                      <XIcon className="size-3.5 stroke-[3]" />
                    ) : (
                      <InfoIcon className="size-3.5 stroke-[3]" />
                    )}
                  </div>
                  <span className="flex-1 text-xs font-medium leading-relaxed">{activeToast.message}</span>
                  <button
                    type="button"
                    onClick={() => setActiveToast(null)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base leading-none px-1"
                  >
                    ×
                  </button>
                  <div
                    className={`absolute bottom-0 left-0 h-[3px] w-full ${
                      activeToast.type === 'success'
                        ? 'bg-emerald-500'
                        : activeToast.type === 'warning'
                        ? 'bg-amber-500'
                        : activeToast.type === 'error'
                        ? 'bg-rose-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{
                      animation: 'eirmisToastProgress 3.2s linear forwards',
                      transformOrigin: 'left',
                    }}
                  />
                </div>
              )}

              {/* Interactive Modal Sheet Overlay */}
              {customModalSheetOpen && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in-50 duration-150"
                  onClick={() => setCustomModalSheetOpen(false)}
                >
                  <div
                    className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        Custom Modal Sheet
                      </h3>
                      <button
                        type="button"
                        onClick={() => setCustomModalSheetOpen(false)}
                        className="text-muted-foreground hover:text-foreground text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                    <div className="py-4 text-xs text-muted-foreground leading-relaxed">
                      This modal demonstrates EIRMIS custom sheet design (.modal-box). It features spring scaling animation (0.95→1), backdrop blur filtering, and responsive max-width containment.
                    </div>
                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                      <Button size="xs" variant="ghost" onClick={() => setCustomModalSheetOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="xs" variant="primary" onClick={() => {
                        toast.success('Modal action confirmed')
                        setCustomModalSheetOpen(false)
                      }}>
                        Confirm Action
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Waitlist Promotion Modal */}
              {waitlistModalOpen && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in-50 duration-150"
                  onClick={() => !waitlistProcessing && setWaitlistModalOpen(false)}
                >
                  <div
                    className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        Promote Attendee to Confirmed Guest
                      </h3>
                      <button
                        type="button"
                        disabled={waitlistProcessing}
                        onClick={() => setWaitlistModalOpen(false)}
                        className="text-muted-foreground hover:text-foreground text-sm font-bold disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>

                    {/* Guest Information Card */}
                    <div className="my-4 flex items-center gap-3 rounded-xl border border-border bg-slate-50 p-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-indigo-50 font-heading text-sm font-bold text-indigo-700">
                        ER
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <strong className="block font-semibold text-foreground">Elena Rostova</strong>
                        <span className="text-[11px] text-muted-foreground">elena.rostova@globaltech.com</span>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Waitlist #1
                      </span>
                    </div>

                    {/* Information Note */}
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900 leading-relaxed">
                      <InfoIcon className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>
                        Promoting this guest immediately deducts 1 seat from the remaining event capacity buffer and emails an encrypted QR access ticket.
                      </span>
                    </div>

                    {/* Optional Error State */}
                    {waitlistError && (
                      <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                        <AlertCircleIcon className="size-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Capacity Exceeded:</strong> All 150 ballroom seats are reserved. You must increase venue capacity in Event Settings before promoting.
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={waitlistProcessing}
                        onClick={() => setWaitlistModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        disabled={waitlistProcessing || waitlistError}
                        onClick={() => {
                          setWaitlistProcessing(true)
                          setTimeout(() => {
                            setWaitlistProcessing(false)
                            setWaitlistModalOpen(false)
                            triggerProgressToast('success', 'Elena Rostova successfully promoted to confirmed attendee.')
                          }, 1200)
                        }}
                      >
                        {waitlistProcessing ? (
                          <span className="flex items-center gap-1.5">
                            <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Processing...</span>
                          </span>
                        ) : (
                          'Promote to Confirmed'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* 13. Shared primitives */}
            <Section
              id="primitives"
              title="Shared primitives"
              description="Patterns used across Organizer, Admin, Guest, and Check-in Staff portals."
            >
              <div className="space-y-6">
                {/* Status chips */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Status chips
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Semantic status indicators for confirmed, pending, declined, and invited states.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="success">Confirmed</Badge>
                    <Badge variant="warning">Pending</Badge>
                    <Badge variant="error">Declined</Badge>
                    <Badge variant="info">Invited</Badge>
                    <Badge variant="outline">Draft</Badge>
                  </div>
                </div>

                {/* Empty State */}
                <Card className="border-dashed border-2 border-border/80 bg-white/70 p-8 text-left shadow-xs">
                  <UsersIcon className="size-9 text-muted-foreground/60" />
                  <h3 className="mt-3 font-heading text-base font-bold text-foreground">
                    No events yet
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Create an event to start managing invitations and RSVPs.
                  </p>
                  <div className="mt-4 flex justify-start">
                    <Button size="sm" variant="primary">
                      Create event
                    </Button>
                  </div>
                </Card>

                {/* Toast banner */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-3.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full bg-indigo-600" />
                    <div>
                      <strong className="block text-xs font-semibold text-foreground">
                        Invitation sent
                      </strong>
                      <p className="text-xs text-muted-foreground">
                        The guest has been notified via email.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => toast('Notification dismissed')}
                  >
                    ×
                  </Button>
                </div>
              </div>
            </Section>

            {/* 12. Navigation & feedback */}
            <Section
              id="navigation"
              title="Navigation & feedback"
              description="Tabs, Breadcrumbs, Pagination, and Alert feedback with realistic EIRMIS labels."
            >
              <div className="space-y-6">
                {/* Tabs */}
                <Card className="p-5 border-border bg-white shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tabs
                  </span>
                  <div className="mt-3">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="guests">Guests</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                      </TabsList>
                      <TabsContent value="overview" className="mt-3 text-xs text-muted-foreground">
                        Event overview, total invitees, and check-in summary metrics.
                      </TabsContent>
                      <TabsContent value="guests" className="mt-3 text-xs text-muted-foreground">
                        Guest roster, plus-one allocations, and dietary requirements.
                      </TabsContent>
                      <TabsContent value="settings" className="mt-3 text-xs text-muted-foreground">
                        Registration cutoff, notification reminders, and access rules.
                      </TabsContent>
                    </Tabs>
                  </div>
                </Card>

                {/* Breadcrumb */}
                <Card className="p-5 border-border bg-white shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Breadcrumbs
                  </span>
                  <div className="mt-3">
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#navigation">Events</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#navigation">Spring reception</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Guests</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                  </div>
                </Card>

                {/* Pagination */}
                <Card className="p-5 border-border bg-white shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pagination
                  </span>
                  <div className="mt-3">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#navigation" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#navigation" isActive>
                            1
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#navigation">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#navigation">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#navigation" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </Card>

                {/* Alert */}
                <Alert className="border-amber-200 bg-amber-50/70 text-amber-900">
                  <ClockIcon className="size-4 text-amber-700" />
                  <AlertTitle className="font-semibold text-amber-900">
                    RSVP deadline approaching
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-800">
                    12 invitations are still awaiting a response before the guest list freezes.
                  </AlertDescription>
                  <AlertAction>
                    <Button size="xs" variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
                      Review guests
                    </Button>
                  </AlertAction>
                </Alert>
              </div>
            </Section>

            {/* 13. States */}
            <Section
              id="states"
              title="Loading, empty & overlay states"
              description="Every workflow needs a clear state before data, when data is absent, and when a transient action completes."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Skeleton Loader */}
                <Card className="p-5 border-border bg-white shadow-xs space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Skeleton state
                  </span>
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </Card>

                {/* Empty State Card */}
                <Card className="p-5 border-border bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Empty data
                    </span>
                    <strong className="mt-2 block font-heading text-base font-bold text-foreground">
                      No invitations yet
                    </strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Invite guests to begin collecting RSVPs.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button size="sm" variant="primary">
                      Invite guests
                    </Button>
                  </div>
                </Card>

                {/* Elevated Layer Preview */}
                <Card className="p-5 border-border bg-white shadow-lg space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Dialog preview
                  </span>
                  <strong className="block font-heading text-base font-bold text-foreground">
                    Archive this event?
                  </strong>
                  <p className="text-xs text-muted-foreground">
                    Guests will no longer be able to submit RSVP responses.
                  </p>
                  <div className="mt-3 flex items-center gap-2 pt-1">
                    <Button size="sm" variant="ghost">
                      Cancel
                    </Button>
                    <Button size="sm" variant="danger">
                      Archive event
                    </Button>
                  </div>
                </Card>
              </div>
            </Section>
          </main>
        </div>
      </div>
    </TooltipProvider >
  )
}
