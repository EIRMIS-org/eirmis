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

// Theme
import { ThemeToggle } from '@/components/theme-toggle'

// Shadcn UI components
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  SsoButton,
  RsvpSelector,
  type RsvpChoice,
  WalletPass,
  ToggleRow,
  SettingsSection,
  ScanResult,
  type ScanStatus,
  RouteSwitcher,
  SolutionCard,
  QuotaBar,
  InsetGroupedList,
  AttendeeItem,
  WorkflowStep,
  AccountCard,
  AuditCallout,
  ErrorPage,
  NoticeBox,
  GlobalNav,
  MobileDrawer,
  DEFAULT_PORTALS,
} from '@/components/eirmis'
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
  ['theming', 'Theming'],
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
  ['specialized', 'Specialized primitives'],
  ['responsive', 'Responsive patterns'],
  ['portal-components', 'Portal components'],
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
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
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

function DemoCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-6 shadow-xs', className)}>
      {children}
    </div>
  )
}

function SectionLabel({ label, description }: { label: string; description?: string }) {
  return (
    <div className="mb-4">
      <span className="text-xs font-bold uppercase tracking-wider text-primary">
        {label}
      </span>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
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

  // Global Chrome interactive states
  const [activeGlobalNavPortal, setActiveGlobalNavPortal] = useState('hub')
  const [isGlobalNavLoggedIn, setIsGlobalNavLoggedIn] = useState(true)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

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

  // Task 7 interactive states
  const [cameraScanState, setCameraScanState] = useState<
    'idle' | 'accepted' | 'duplicate' | 'rejected'
  >('idle')

  // Task 8 interactive states
  const [showTouchRuler, setShowTouchRuler] = useState(false)
  const [responsiveTableView, setResponsiveTableView] = useState<'desktop' | 'mobile'>('desktop')

  // Portal & composite components interactive states
  const [demoRsvp, setDemoRsvp] = useState<RsvpChoice>('accept')
  const [demoRoute, setDemoRoute] = useState('landing')
  const [demoScanStatus, setDemoScanStatus] = useState<ScanStatus>('approved')
  const [demoToggle1, setDemoToggle1] = useState(true)
  const [demoToggle2, setDemoToggle2] = useState(false)
  const [demoToggle3, setDemoToggle3] = useState(true)
  const [demoWorkflowStep, setDemoWorkflowStep] = useState(2)

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
      <div className="min-h-screen bg-background/70 text-foreground text-left">
        <Toaster position="bottom-right" richColors />

        {/* Page Header */}
        <header className="border-b border-border/80 bg-gradient-to-br from-primary-subtle/60 via-surface to-background px-6 py-14 sm:px-12 sm:py-16 text-left">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-end text-left">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-primary-subtle/80 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
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
              <Badge variant="outline" className="border-primary-border bg-primary-subtle text-primary font-semibold px-3 py-1">
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
                      ? 'bg-primary-subtle font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
              <Card className="divide-y divide-border overflow-hidden rounded-2xl border-border bg-surface shadow-xs">
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
                  <p className="text-sm leading-relaxed text-foreground sm:text-base">
                    Track responses, manage attendees, and keep every detail moving forward.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Label / 13px / 600</span>
                  <p className="text-sm font-semibold text-foreground">Event date and time</p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Caption / 12px / 400</span>
                  <p className="text-xs text-muted-foreground">Last updated a few moments ago</p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Numeric / tabular</span>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    128 guests · 72% responded · 09:30
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-baseline">
                  <span className="text-xs font-medium text-muted-foreground">Mono / technical</span>
                  <p className="font-mono text-xs text-muted-foreground">event_7f31 · RSVP-2048</p>
                </div>
              </Card>

              <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/70 p-4 text-xs font-mono text-muted-foreground">
                <span className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-foreground">
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
                  <Card key={name} className="overflow-hidden border-border bg-surface shadow-xs">
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Extended color palette</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {extendedColors.map(([name, token, hex, usage]) => (
                    <Card key={name} className="overflow-hidden border-border bg-surface shadow-xs">
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
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-border font-mono"
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Border radius scale</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  {radiiTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-surface p-4 shadow-xs text-center">
                      <div className="mb-2">
                        <div
                          className="mx-auto h-12 w-12 rounded-lg border border-border bg-muted"
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Elevation & shadow scale</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                  {shadowTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-surface p-4 shadow-xs">
                      <div className="mb-3 h-16 w-full rounded-lg border border-border bg-surface" style={{ boxShadow: value }} />
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>

                {/* Typography Tokens */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Typography tokens</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {typographyTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-surface p-4 shadow-xs">
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <code className="block text-xs font-mono text-muted-foreground">{value}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>

                {/* Spacing Scale */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Spacing scale</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {spacingTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-surface p-4 shadow-xs text-center">
                      <div className="mb-2 h-8 w-full bg-muted rounded" style={{ height: value }} />
                      <strong className="block text-sm font-semibold text-foreground">{name}</strong>
                      <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                      <code className="block text-xs font-mono text-muted-foreground">{value}</code>
                      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                    </Card>
                  ))}
                </div>

                {/* Motion Tokens */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Motion & easing tokens</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {motionTokens.map(([name, token, value, usage]) => (
                    <Card key={name} className="border-border bg-surface p-4 shadow-xs">
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
                <Card className="border-border bg-surface p-5 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Level 1 / Card
                  </span>
                  <strong className="mt-2 block font-heading text-lg font-bold">Event summary</strong>
                  <p className="mt-1 text-xs text-muted-foreground">Border, ring-1, subtle shadow-xs.</p>
                </Card>
                <Card className="border-border bg-surface p-5 shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Level 2 / Popover
                  </span>
                  <strong className="mt-2 block font-heading text-lg font-bold">Filter menu</strong>
                  <p className="mt-1 text-xs text-muted-foreground">Soft shadow-md elevation.</p>
                </Card>
                <Card className="border-border bg-surface p-5 shadow-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Level 3 / Dialog
                  </span>
                  <strong className="mt-2 block font-heading text-lg font-bold">Confirm action</strong>
                  <p className="mt-1 text-xs text-muted-foreground">High shadow-xl floating overlay.</p>
                </Card>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="grid min-h-14 place-content-center rounded-lg border border-primary-border bg-primary-subtle/70 p-2 text-center text-xs font-medium text-primary">
                  8px (rounded-lg) / controls
                </div>
                <div className="grid min-h-14 place-content-center rounded-xl border border-primary-border bg-primary-subtle/70 p-2 text-center text-xs font-medium text-primary">
                  12px (rounded-xl) / cards
                </div>
                <div className="grid min-h-14 place-content-center rounded-2xl border border-primary-border bg-primary-subtle/70 p-2 text-center text-xs font-medium text-primary">
                  16px (rounded-2xl) / feature cards
                </div>
                <div className="grid min-h-14 place-content-center rounded-full border border-primary-border bg-primary-subtle/70 p-2 text-center text-xs font-medium text-primary">
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
                    className="group flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-surface p-3.5 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary-border hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-primary-subtle group-hover:text-primary">
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
                    <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground group-hover:bg-primary-subtle group-hover:text-primary">
                      {category}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-primary-border bg-primary-subtle/60 px-4 py-3 text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary" />
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
              <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-border bg-surface p-5 shadow-xs">
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

              <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface p-4 shadow-xs">
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
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {/* Dropdown 1: Select (Status) */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Switch
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Toggle open registration access
                      </p>
                    </div>

                    <div className="flex w-full max-w-[280px] items-center justify-between rounded-xl border border-border/80 bg-muted/70 p-3 shadow-2xs">
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
                      <span className={`font-semibold ${toggleOn ? 'text-success' : 'text-muted-foreground'}`}>
                        {toggleOn ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Organizer Approval Workflow Row */}
                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-6 shadow-xs">
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
              <div className="mt-4 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-sm">
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
                <Card className="border-border/80 bg-surface p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Total capacity
                    </span>
                    <Building2Icon className="size-4.5 text-muted-foreground stroke-[1.8]" />
                  </div>
                  <div className="mt-4 font-heading text-3xl font-extrabold text-foreground">
                    150
                  </div>
                </Card>

                {/* RSVPs */}
                <Card className="border-border/80 bg-surface p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Rsvps
                    </span>
                    <MailIcon className="size-4.5 text-muted-foreground stroke-[1.8]" />
                  </div>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading text-3xl font-extrabold text-foreground">
                        112
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        / 150
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.round((112 / 150) * 100)}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Pending Approvals */}
                <Card className="border-border/80 border-l-4 border-l-warning bg-surface p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Pending approvals
                    </span>
                    <LuggageIcon className="size-4.5 text-muted-foreground stroke-[1.8]" />
                  </div>
                  <div className="mt-4 flex items-center gap-2.5">
                    <span className="font-heading text-3xl font-extrabold text-foreground">
                      3
                    </span>
                    <span className="inline-flex items-center rounded-md bg-warning-bg/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-warning">
                      REQUIRES ACTION
                    </span>
                  </div>
                </Card>

                {/* Checked In */}
                <Card className="border-border/80 bg-surface p-5 shadow-xs flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Checked in
                    </span>
                    <UserIcon className="size-4.5 text-muted-foreground stroke-[1.8]" />
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
              <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-surface shadow-xs text-left">
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
                            className="size-8 rounded-xl border-success-border bg-success-bg text-success hover:bg-success-border hover:text-success hover:border-success shadow-2xs transition-colors"
                            title="Approve"
                            aria-label="Approve"
                            onClick={() => toast.success('Approved Elena Rostova')}
                          >
                            <CheckIcon className="size-4 stroke-[2.5]" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-xl border-error-border bg-error-bg text-error hover:bg-error-border hover:text-error hover:border-error shadow-2xs transition-colors"
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
                            className="size-8 rounded-xl border-success-border bg-success-bg text-success hover:bg-success-border hover:text-success hover:border-success shadow-2xs transition-colors"
                            title="Approve"
                            aria-label="Approve"
                            onClick={() => toast.success('Approved Marcus Reed')}
                          >
                            <CheckIcon className="size-4 stroke-[2.5]" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-xl border-error-border bg-error-bg text-error hover:bg-error-border hover:text-error hover:border-error shadow-2xs transition-colors"
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
                <Card className="p-4 border-border bg-surface shadow-xs text-left">
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
                        className="size-7 rounded-lg border-success-border bg-success-bg text-success hover:bg-success-border shadow-2xs"
                        title="Approve"
                        aria-label="Approve"
                        onClick={() => toast.success('Approved Elena Rostova')}
                      >
                        <CheckIcon className="size-3.5 stroke-[2.5]" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-lg border-error-border bg-error-bg text-error hover:bg-error-border shadow-2xs"
                        title="Reject"
                        aria-label="Reject"
                        onClick={() => toast.error('Rejected Elena Rostova')}
                      >
                        <XIcon className="size-3.5 stroke-[2.5]" />
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-border bg-surface shadow-xs text-left">
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
                        className="size-7 rounded-lg border-success-border bg-success-bg text-success hover:bg-success-border shadow-2xs"
                        title="Approve"
                        aria-label="Approve"
                        onClick={() => toast.success('Approved Marcus Reed')}
                      >
                        <CheckIcon className="size-3.5 stroke-[2.5]" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7 rounded-lg border-error-border bg-error-bg text-error hover:bg-error-border shadow-2xs"
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
                <Card className="border-border bg-surface p-5 shadow-xs">
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

                <Card className="border-border bg-surface p-5 shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Global navigation bar
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Glassmorphic sticky header with brand, portal links, and session pill. Responsive: links collapse to hamburger + drawer below 768px.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setIsGlobalNavLoggedIn((prev) => !prev)}
                      >
                        {isGlobalNavLoggedIn ? 'Simulate Sign Out' : 'Simulate Sign In'}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border shadow-xs">
                    <GlobalNav
                      sticky={false}
                      activePortal={activeGlobalNavPortal}
                      onPortalSelect={setActiveGlobalNavPortal}
                      user={
                        isGlobalNavLoggedIn
                          ? { name: 'Alex Chen', role: 'ORGANIZER', initials: 'AC' }
                          : null
                      }
                      onSignIn={() => setIsGlobalNavLoggedIn(true)}
                      onSignOut={() => setIsGlobalNavLoggedIn(false)}
                      onBrandClick={() => setActiveGlobalNavPortal('hub')}
                    />
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Interactive preview: click links to switch portals, toggle the auth state above, or resize window below 768px to see the responsive hamburger menu.
                  </p>
                </div>

                {/* Mobile Drawer */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Mobile drawer
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Slide-in panel from left with backdrop blur. Triggered by hamburger in global nav at mobile breakpoint.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsMobileDrawerOpen(true)}
                    >
                      Open Mobile Drawer
                    </Button>
                  </div>

                  {/* Interactive slide-over drawer */}
                  <MobileDrawer
                    isOpen={isMobileDrawerOpen}
                    onClose={() => setIsMobileDrawerOpen(false)}
                    activePortal={activeGlobalNavPortal}
                    onPortalSelect={setActiveGlobalNavPortal}
                    user={
                      isGlobalNavLoggedIn
                        ? { name: 'Alex Chen', role: 'ORGANIZER', initials: 'AC' }
                        : null
                    }
                    onSignOut={() => setIsGlobalNavLoggedIn(false)}
                    onSignIn={() => setIsGlobalNavLoggedIn(true)}
                  />

                  {/* Embedded Inline Drawer Layout Preview */}
                  <div className="mt-6">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Inline Drawer Preview (Embedded Frame)
                    </span>
                    <div className="mt-2.5 w-72 max-w-full rounded-2xl border border-border bg-surface shadow-md overflow-hidden">
                      <div className="flex h-12 items-center justify-between border-b border-border px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-indigo-900 text-white shadow-xs">
                            <span className="text-[10px] font-bold">E</span>
                          </div>
                          <span className="font-heading font-bold text-xs text-foreground">Menu</span>
                        </div>
                        <div className="text-muted-foreground p-1">
                          <XIcon className="size-3.5" />
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Portals
                        </div>
                        <div className="flex flex-col gap-1">
                          {DEFAULT_PORTALS.map((portal) => (
                            <button
                              key={portal.id}
                              type="button"
                              onClick={() => setActiveGlobalNavPortal(portal.id)}
                              className={cn(
                                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors',
                                portal.id === activeGlobalNavPortal
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <span>{portal.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Boot Overlay */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                      overlay.style.cssText = 'position:fixed;inset:0;z-index:5000;background:var(--background);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;transition:opacity 0.25s ease;';
                      overlay.innerHTML = '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--primary),#312E81);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 20px var(--primary-glow);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><div style="font-family:Inter,system-ui,sans-serif;font-size:13.5px;color:var(--text-main);font-weight:700;">EIRMIS Architecture</div><div style="width:140px;height:4px;background:var(--border);border-radius:999px;overflow:hidden;"><div style="height:100%;width:45%;background:var(--primary);border-radius:999px;animation:eirmisBootBar 0.85s ease-in-out infinite;"></div></div>';
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Session pill & role badge
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Avatar with initials, name, role badge, sign-out button. Variants for all 4 roles + signed-out state.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {['Organizer', 'Administrator', 'Guest', 'Check-in Staff'].map((role) => (
                      <div key={role} className="p-4 border border-border rounded-xl bg-surface">
                        <div className="eirmis-session-pill" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 12px 4px 5px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', boxShadow: 'var(--shadow-xs)', width: 'fit-content' }}>
                          <span className="eirmis-session-avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, boxShadow: '0 1px 3px var(--primary-glow)', flexShrink: 0 }}>
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
                    <div className="p-4 border border-border rounded-xl bg-surface">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Sidebar system
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Primary sidebar (250px → 72px icon rail) with sub-sidebar (220px, event-scoped). Collapse behavior with badge positioning.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Primary Sidebar - Expanded */}
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Expanded (250px)</p>
                      <div className="space-y-1.5 max-w-xs">
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-surface border border-border text-left hover:bg-muted" title="Dashboard">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary flex-shrink-0">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span className="font-medium text-sm">Dashboard</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-surface border border-border text-left hover:bg-muted" title="Events">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="text-sm flex-1">Events</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-primary-subtle text-primary rounded-full">3</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-surface border border-border text-left hover:bg-muted" title="Guests">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="text-sm flex-1">Guests</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-warning-bg text-warning rounded-full">12</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-surface border border-border text-left hover:bg-muted" title="Approvals">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span className="text-sm flex-1">Approvals</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-success-bg text-success rounded-full">5</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-surface border border-border text-left hover:bg-muted" title="Attendance">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path d="M8 21h8" />
                            <path d="M12 17v4" />
                          </svg>
                          <span className="text-sm">Attendance</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-surface border border-border text-left hover:bg-muted" title="Staff">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span className="text-sm">Staff</span>
                        </button>
                      </div>
                    </div>
                    {/* Primary Sidebar - Collapsed */}
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 text-center">Collapsed (72px)</p>
                      <div className="flex flex-col items-center gap-2">
                        <button className="w-12 h-12 p-2 rounded-lg bg-surface border border-border flex flex-col items-center gap-1 relative" title="Dashboard">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-surface border border-border flex flex-col items-center gap-1 relative" title="Events">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">3</span>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-surface border border-border flex flex-col items-center gap-1 relative" title="Guests">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">12</span>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-surface border border-border flex flex-col items-center gap-1 relative" title="Approvals">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                            <path d="M9 12l2 2 4-4" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">5</span>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-surface border border-border flex flex-col items-center gap-1" title="Attendance">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path d="M8 21h8" />
                            <path d="M12 17v4" />
                          </svg>
                        </button>
                        <button className="w-12 h-12 p-2 rounded-lg bg-surface border border-border flex flex-col items-center gap-1" title="Staff">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Sub-sidebar */}
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sub-sidebar (220px)</p>
                      <div className="space-y-1 max-w-xs">
                        <button className="w-full text-left p-2 rounded-lg bg-primary-subtle text-primary text-sm font-medium flex items-center gap-2">Overview</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Guests</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Approvals</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Attendance</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Staff</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Reminders</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Design</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Check-in</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Waitlist</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Email log</button>
                        <button className="w-full text-left p-2 rounded-lg text-muted-foreground hover:bg-muted text-sm flex items-center gap-2">Audit log</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glassmorphic Topbar */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Glassmorphic topbar
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Backdrop-filter blur, search box with KBD hint, icon buttons, user pill. Responsive: search flexes, user pill condenses to avatar-only.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border backdrop-blur-md p-4" style={{ background: 'var(--surface-glass)', backdropFilter: 'blur(16px) saturate(180%)' }}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button className="eirmis-hamburger p-2 rounded-lg hover:bg-muted" style={{ display: 'flex' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0 relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input type="text" placeholder="Search events, guests..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-glow focus:border-primary" />
                          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded">
                            <span>⌘</span><span>K</span>
                          </kbd>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg hover:bg-muted" title="Help/Support">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-muted" title="Notifications">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        </button>
                        <div className="eirmis-session-pill" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 12px 4px 5px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', boxShadow: 'var(--shadow-xs)' }}>
                          <span className="eirmis-session-avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, boxShadow: '0 1px 3px var(--primary-glow)' }}>
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                      <div key={i} className="card group relative overflow-hidden border border-border bg-surface rounded-2xl shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-3xl">{event.icon}</div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${event.status === 'published' ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Pending Organizers</span>
                          <ClockIcon className="size-4 text-warning" />
                        </div>
                        <div className="mt-2 font-heading text-2xl font-extrabold text-warning sm:text-3xl">
                          2
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Awaiting manual gate review
                        </div>
                      </div>

                      {/* KPI 2 */}
                      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Active Organizers</span>
                          <CheckCircleIcon className="size-4 text-success" />
                        </div>
                        <div className="mt-2 font-heading text-2xl font-extrabold text-foreground sm:text-3xl">
                          24
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Authorized to create events
                        </div>
                      </div>

                      {/* KPI 3 */}
                      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Malware Engine</span>
                          <ShieldCheckIcon className="size-4 text-primary" />
                        </div>
                        <div className="mt-2 font-heading text-xl font-bold text-success sm:text-2xl">
                          Malware Engine v3
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Static sandbox parsing: Active
                        </div>
                      </div>

                      {/* KPI 4 */}
                      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
                      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Total Capacity</span>
                          <Building2Icon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 font-heading text-3xl font-extrabold text-foreground">
                          150
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Max venue allocation
                        </div>
                      </div>

                      {/* Metric 2 (With Progress Bar) */}
                      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>RSVPs</span>
                          <MailIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5 font-heading text-3xl font-extrabold text-foreground">
                          <span>112</span>
                          <span className="text-base font-medium text-muted-foreground">/ 150</span>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: '74.6%' }}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          74.6% confirmed attendance
                        </div>
                      </div>

                      {/* Metric 3 (Left-Border Accent) */}
                      <div className="rounded-2xl border border-border border-l-[3px] border-l-warning bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Pending Approvals</span>
                          <LuggageIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-heading text-3xl font-extrabold text-foreground">3</span>
                          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                            Requires Action
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Awaiting VIP organizer sign-off
                        </div>
                      </div>

                      {/* Metric 4 */}
                      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Checked In</span>
                          <UsersIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Stat cards (Check-in Scanner)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clean 2-column centered cards designed for rapid glanceability during fast-paced door credential scanning (.stat-card).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-xl">
                    <div className="rounded-xl border border-border bg-surface p-5 text-center shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Checked-In
                      </div>
                      <div className="mt-2 font-heading text-4xl font-extrabold text-secondary">
                        48
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Scanned entrance attendees
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-surface p-5 text-center shadow-xs">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
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

                  <div className="max-w-2xl rounded-xl border border-border bg-muted/50 p-5">
                    <div className="mb-3 flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>RSVP Summary</span>
                      <span className="text-muted-foreground">{totalRsvps} Total Invitees</span>
                    </div>

                    {/* The Segmented Bar */}
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-border flex"
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
                        className="bg-border-hover transition-all duration-500 ease-in-out"
                        style={{ width: `${pctUnanswered}%` }}
                        title={`No Response: ${rsvpDistribution.unanswered} (${pctUnanswered}%)`}
                      />
                    </div>

                    {/* Breakdown List */}
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="flex items-center justify-between rounded-lg bg-surface p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">Accepted</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {rsvpDistribution.accepted} <span className="text-[10px] text-muted-foreground font-normal">({pctAccepted}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-surface p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">Declined</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {rsvpDistribution.declined} <span className="text-[10px] text-muted-foreground font-normal">({pctDeclined}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-surface p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">Tentative</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {rsvpDistribution.tentative} <span className="text-[10px] text-muted-foreground font-normal">({pctTentative}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-surface p-2.5 border border-border">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Activity stream
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Chronological event feed with circular colored icon badges, actor attribution, and relative timestamps (.activity-list).
                    </p>
                  </div>
                  <div className="max-w-xl space-y-3.5">
                    {/* Item 1 - Green */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
                        <CheckIcon className="size-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="text-foreground">
                          <span className="font-semibold text-foreground">Sarah Jenkins</span> RSVP&apos;d{' '}
                          <strong className="text-success font-semibold">Attending</strong>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">10 mins ago</div>
                      </div>
                    </div>

                    {/* Item 2 - Red */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-error-bg text-error">
                        <XIcon className="size-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="text-foreground">
                          <span className="font-semibold text-foreground">Michael Chang</span> RSVP&apos;d{' '}
                          <strong className="text-error font-semibold">Declined</strong>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">45 mins ago</div>
                      </div>
                    </div>

                    {/* Item 3 - Purple / Indigo */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
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
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Boundary &amp; security banners
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      High-visibility zero-knowledge architectural policy banners and scoped access boundary notices (.boundary-banner, .boundary-notice).
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* Policy Banner: Zero-Knowledge Architecture (Primary / Info) */}
                    <div className="rounded-xl border border-border border-l-4 border-l-primary bg-surface p-4 shadow-xs sm:p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                          <LockIcon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-heading text-sm font-bold text-foreground">
                              Zero-Knowledge Event Data Architecture
                            </span>
                            <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success">
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
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
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
                        <div className="flex flex-col gap-3 rounded-xl border border-border border-l-4 border-l-success bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-bold text-foreground">Tech Forward Gala 2026</strong>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Assigned {boundaryRole.toLowerCase()} • active event-day scanning scope
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-success">
                              Authorized
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border border-l-4 border-l-error bg-error-bg/40 p-4 shadow-xs">
                          <div className="flex items-start gap-3">
                            <AlertCircleIcon className="size-5 text-error shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <strong className="text-sm font-bold text-error">
                                Check-in access restricted
                              </strong>
                              <p className="mt-1 text-xs text-error">
                                Only the assigned Check-in Staff or event Organizer can record attendance for this event. Your current role is <strong>Guest</strong>.
                              </p>
                              <div className="mt-3">
                                <Button size="xs" variant="outline" className="border-error-border text-error hover:bg-error-border">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                      <div className="inline-flex rounded-full bg-border/80 p-1 gap-1 text-xs font-semibold text-muted-foreground">
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
                            className={`rounded-full px-4 py-1.5 transition-all duration-150 cursor-pointer ${segmentedTab === tab.id
                              ? 'bg-surface text-foreground shadow-xs font-bold'
                              : 'text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Active tab: <strong className="text-primary">{segmentedTab}</strong>
                      </p>
                    </div>

                    {/* Guest Portal Tab Buttons */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Guest Portal Tab Switcher (.seg-tab-btn)
                      </p>
                      <div className="inline-flex rounded-xl bg-muted p-1 gap-1 text-xs font-medium border border-border">
                        {[
                          { id: 'rsvp', label: 'RSVP Response' },
                          { id: 'details', label: 'Event Schedule' },
                          { id: 'venue', label: 'Venue & Travel' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setGuestSegmentedTab(tab.id)}
                            className={`rounded-lg px-3.5 py-1.5 transition-all duration-150 cursor-pointer ${guestSegmentedTab === tab.id
                              ? 'bg-surface text-primary shadow-xs font-bold border border-border'
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                    <div className="absolute top-10 left-8 right-8 h-0.5 bg-border -translate-y-1/2 z-0" />
                    {/* Fill line */}
                    <div
                      className="absolute top-10 left-8 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300 ease-out"
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
                            className="flex flex-col items-center bg-surface px-2 group cursor-pointer focus:outline-none"
                          >
                            <div
                              className={`size-8 rounded-full flex items-center justify-center font-heading text-xs font-bold transition-all duration-200 ${isDone
                                ? 'bg-primary text-primary-foreground'
                                : isActive
                                  ? 'bg-primary text-primary-foreground ring-4 ring-primary-glow shadow-xs'
                                  : 'bg-muted text-muted-foreground border-2 border-border group-hover:border-border-hover'
                                }`}
                            >
                              {isDone ? <CheckIcon className="size-4 stroke-[3]" /> : item.step}
                            </div>
                            <span
                              className={`mt-2 text-xs font-semibold ${isActive ? 'text-primary font-bold' : isDone ? 'text-foreground' : 'text-muted-foreground'
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Custom toggle switch (.toggle-switch)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      44×24px track with 18px thumb and smooth cubic-bezier spring animation. Used for event policies and privacy controls.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
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
                        <div className="w-11 h-6 bg-border-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-surface after:border-border-hover after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all after:duration-200 peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
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
                        <div className="w-11 h-6 bg-border-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-surface after:border-border-hover after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all after:duration-200 peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Search Box + KBD Hint */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Search box + KBD hint (.search-box, .kbd-hint)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pill-shaped input with left-aligned search icon, active glow ring, and platform keyboard shortcut indicator.
                    </p>
                  </div>

                  <div className="max-w-md">
                    <div className="relative flex items-center">
                      <SearchIcon className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search guests, email, or tickets..."
                        className="w-full rounded-full border border-border bg-surface pl-10 pr-16 py-2 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs transition-all focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary-glow"
                      />
                      <kbd className="absolute right-3 inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                          className="size-8 rounded-lg border border-success-border bg-success-bg text-success flex items-center justify-center transition-all duration-150 hover:bg-success-border hover:border-success hover:shadow-xs active:scale-95 cursor-pointer"
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
                          className="size-8 rounded-lg border border-error-border bg-error-bg text-error flex items-center justify-center transition-all duration-150 hover:bg-error-border hover:border-error hover:shadow-xs active:scale-95 cursor-pointer"
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
                          className="size-8 rounded-lg border border-border bg-muted text-muted-foreground flex items-center justify-center transition-all duration-150 hover:bg-primary-subtle hover:border-primary-border hover:text-primary hover:shadow-xs active:scale-95 cursor-pointer"
                          title="Simulate check-in barcode scan"
                          onClick={() => toast.info('Simulated camera reticle trigger')}
                        >
                          <SparklesIcon className="size-4" />
                        </button>
                        <span className="text-xs text-muted-foreground">Simulate (.action-btn-simulate)</span>
                      </div>
                    </div>

                    {/* Button Group in Context */}
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-3 max-w-md">
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">Arthur Vance (VIP Speaker)</strong>
                        <span className="text-[11px] text-muted-foreground">Requesting table seat #4</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="size-8 rounded-lg border border-success-border bg-success-bg text-success flex items-center justify-center transition-all hover:bg-success-border active:scale-95 cursor-pointer"
                          title="Approve"
                          onClick={() => toast.success('Approved Arthur Vance')}
                        >
                          <CheckIcon className="size-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          className="size-8 rounded-lg border border-error-border bg-error-bg text-error flex items-center justify-center transition-all hover:bg-error-border active:scale-95 cursor-pointer"
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                        className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150"
                        onMouseLeave={() => setCustomDropdownOpen(false)}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
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
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
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
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-error hover:bg-error-bg transition-colors text-left cursor-pointer"
                          onClick={() => {
                            toast.error('Removed event registration')
                            setCustomDropdownOpen(false)
                          }}
                        >
                          <Trash2Icon className="size-3.5 text-error" />
                          <span>Cancel Event</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Field Error States */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                        className={`w-full rounded-xl border px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground transition-all focus:outline-none ${formFieldError
                          ? 'border-error bg-error-bg/20 ring-3 ring-error/10 focus:border-error'
                          : 'border-border bg-surface focus:border-primary focus:ring-3 focus:ring-primary-glow'
                          }`}
                      />
                      {formFieldError && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-error">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                      className="border-success-border text-success hover:bg-success-bg"
                      onClick={() =>
                        triggerProgressToast('success', 'RSVP confirmed for Elena Rostova (Marina Bay Ballroom).')
                      }
                    >
                      Trigger Success Toast
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-warning-border text-warning hover:bg-warning-bg"
                      onClick={() =>
                        triggerProgressToast('warning', 'Venue capacity at 90% (135/150 seats reserved).')
                      }
                    >
                      Trigger Warning Toast
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-error-border text-error hover:bg-error-bg"
                      onClick={() =>
                        triggerProgressToast('error', 'Invalid check-in QR credentials. Please verify scanner.')
                      }
                    >
                      Trigger Error Toast
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-primary-border text-primary hover:bg-primary-subtle"
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
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <InfoIcon className="size-3.5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-medium flex-1">Export file ready for download</span>
                        <span className="text-xs text-slate-400">×</span>
                      </div>
                      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-primary" />
                    </div>
                  </div>
                </div>

                {/* 2. Custom Modal Sheets */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Restricted row state (.row-restricted, .restricted-label)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Muted opacity, disabled action buttons, and lock status pill with hover explanation tooltip for locked or policy-restricted attendees.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-4">Attendee</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Restriction Note</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Normal Row */}
                        <tr className="hover:bg-muted/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">Sarah Jenkins</td>
                          <td className="py-3 px-4">
                            <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success">
                              Confirmed
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">Standard attendee record</td>
                          <td className="py-3 px-4 text-right">
                            <Button size="xs" variant="ghost">Edit</Button>
                          </td>
                        </tr>

                        {/* Restricted Row */}
                        <tr className="bg-muted/80 opacity-80 hover:bg-muted/60 transition-colors">
                          <td className="py-3 px-4 font-medium text-muted-foreground">
                            Arthur Vance <span className="text-[10px] text-muted-foreground">(Keynote VIP)</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 rounded-md bg-border px-2 py-0.5 text-[10px] font-bold text-foreground" title="This guest RSVP is locked by platform administrator policy.">
                              <LockIcon className="size-3 text-muted-foreground" />
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
                        <tr className="hover:bg-muted/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">Michael Chang</td>
                          <td className="py-3 px-4">
                            <span className="rounded-full bg-error-bg px-2 py-0.5 text-[10px] font-bold text-error">
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
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      User pill &amp; avatar (.user-pill, .eirmis-session-pill)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gradient initials avatar, full name with overflow ellipsis, semantic role tag, and condensed mobile presentation.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Full Pill */}
                    <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 px-3 shadow-xs hover:border-border-hover transition-all cursor-pointer">
                      <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-900 text-xs font-bold text-white shadow-2xs">
                        SJ
                      </div>
                      <span className="text-xs font-semibold text-foreground">Sarah Jenkins</span>
                      <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-[10px] font-bold text-primary">
                        Organizer
                      </span>
                    </div>

                    {/* Admin Pill */}
                    <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 px-3 shadow-xs hover:border-border-hover transition-all cursor-pointer">
                      <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white shadow-2xs">
                        RA
                      </div>
                      <span className="text-xs font-semibold text-foreground">Root Admin</span>
                      <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success">
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
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-white ${activeToast.type === 'success'
                      ? 'bg-emerald-500'
                      : activeToast.type === 'warning'
                        ? 'bg-amber-500'
                        : activeToast.type === 'error'
                          ? 'bg-rose-500'
                          : 'bg-primary'
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
                    className={`absolute bottom-0 left-0 h-[3px] w-full ${activeToast.type === 'success'
                      ? 'bg-emerald-500'
                      : activeToast.type === 'warning'
                        ? 'bg-amber-500'
                        : activeToast.type === 'error'
                          ? 'bg-rose-500'
                          : 'bg-primary'
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
                    className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200"
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
                    className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200"
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
                    <div className="my-4 flex items-center gap-3 rounded-xl border border-border bg-muted p-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary-subtle font-heading text-sm font-bold text-primary">
                        ER
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <strong className="block font-semibold text-foreground">Elena Rostova</strong>
                        <span className="text-[11px] text-muted-foreground">elena.rostova@globaltech.com</span>
                      </div>
                      <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-bold text-warning">
                        Waitlist #1
                      </span>
                    </div>

                    {/* Information Note */}
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-primary-subtle p-3 text-xs text-foreground leading-relaxed">
                      <InfoIcon className="size-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        Promoting this guest immediately deducts 1 seat from the remaining event capacity buffer and emails an encrypted QR access ticket.
                      </span>
                    </div>

                    {/* Optional Error State */}
                    {waitlistError && (
                      <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-error-bg border border-error-border p-3 text-xs text-error">
                        <AlertCircleIcon className="size-4 text-error shrink-0 mt-0.5" />
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

            {/* 16. Specialized Primitives */}
            <Section
              id="specialized"
              title="Specialized primitives"
              description="Check-in scanner camera viewfinder feedback states, admin pulsing role pill, and semantic RSVP breakdown dots."
            >
              <div className="space-y-8">
                {/* 1. Scan Camera Viewfinder */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Scan camera viewfinder (.camera-frame)
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dark viewport with 140×140 reticle, animated laser sweep, and color feedback transitions for check-in verification states.
                      </p>
                    </div>
                    {/* Simulator Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="xs"
                        variant={cameraScanState === 'idle' ? 'primary' : 'outline'}
                        onClick={() => setCameraScanState('idle')}
                      >
                        Idle Sweep
                      </Button>
                      <Button
                        size="xs"
                        variant={cameraScanState === 'accepted' ? 'primary' : 'outline'}
                        className={cameraScanState === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => setCameraScanState('accepted')}
                      >
                        Accepted (Green)
                      </Button>
                      <Button
                        size="xs"
                        variant={cameraScanState === 'duplicate' ? 'primary' : 'outline'}
                        className={cameraScanState === 'duplicate' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                        onClick={() => setCameraScanState('duplicate')}
                      >
                        Duplicate (Amber)
                      </Button>
                      <Button
                        size="xs"
                        variant={cameraScanState === 'rejected' ? 'primary' : 'outline'}
                        className={cameraScanState === 'rejected' ? 'bg-rose-600 hover:bg-rose-700' : ''}
                        onClick={() => setCameraScanState('rejected')}
                      >
                        Rejected (Red)
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Live Scanner Preview */}
                  <div className="max-w-md mx-auto mb-8">
                    <div
                      className={`relative flex h-[280px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-300 shadow-2xl ${cameraScanState === 'accepted'
                        ? 'border-emerald-500'
                        : cameraScanState === 'duplicate'
                          ? 'border-amber-500'
                          : cameraScanState === 'rejected'
                            ? 'border-rose-500'
                            : 'border-cyan-500/30'
                        }`}
                      style={{
                        background:
                          cameraScanState === 'accepted'
                            ? 'radial-gradient(circle at center, #064E3B 0%, #022C22 100%)'
                            : cameraScanState === 'duplicate'
                              ? 'radial-gradient(circle at center, #78350F 0%, #451A03 100%)'
                              : cameraScanState === 'rejected'
                                ? 'radial-gradient(circle at center, #7F1D1D 0%, #450A0A 100%)'
                                : '#020617',
                      }}
                    >
                      {/* Reticle */}
                      <div
                        className={`relative flex size-[140px] items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${cameraScanState === 'accepted'
                          ? 'border-emerald-400'
                          : cameraScanState === 'duplicate'
                            ? 'border-amber-400'
                            : cameraScanState === 'rejected'
                              ? 'border-rose-400'
                              : 'border-cyan-400/80'
                          }`}
                      >
                        {/* Stylized Reticle Corners */}
                        <div
                          className={`absolute -top-0.5 -left-0.5 size-4 border-t-[3px] border-l-[3px] rounded-tl-sm transition-colors duration-300 ${cameraScanState === 'accepted'
                            ? 'border-emerald-400'
                            : cameraScanState === 'duplicate'
                              ? 'border-amber-400'
                              : cameraScanState === 'rejected'
                                ? 'border-rose-400'
                                : 'border-cyan-400'
                            }`}
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 size-4 border-b-[3px] border-r-[3px] rounded-br-sm transition-colors duration-300 ${cameraScanState === 'accepted'
                            ? 'border-emerald-400'
                            : cameraScanState === 'duplicate'
                              ? 'border-amber-400'
                              : cameraScanState === 'rejected'
                                ? 'border-rose-400'
                                : 'border-cyan-400'
                            }`}
                        />

                        {/* Animated Laser Sweep */}
                        <div
                          className="absolute inset-x-0 h-[2px] transition-all duration-300"
                          style={{
                            background:
                              cameraScanState === 'accepted'
                                ? '#10B981'
                                : cameraScanState === 'duplicate'
                                  ? '#F59E0B'
                                  : cameraScanState === 'rejected'
                                    ? '#EF4444'
                                    : '#38BDF8',
                            boxShadow: `0 0 12px ${cameraScanState === 'accepted'
                              ? '#10B981'
                              : cameraScanState === 'duplicate'
                                ? '#F59E0B'
                                : cameraScanState === 'rejected'
                                  ? '#EF4444'
                                  : '#38BDF8'
                              }`,
                            animation: 'scanLaser 2s infinite ease-in-out',
                          }}
                        />

                        {/* Center Icon */}
                        <SparklesIcon className="size-8 text-white/20" />
                      </div>

                      {/* State Caption */}
                      <div className="mt-4 font-mono text-xs font-semibold tracking-wider uppercase text-white/80">
                        {cameraScanState === 'idle' && 'Position QR code within frame'}
                        {cameraScanState === 'accepted' && '✓ Check-in Verified'}
                        {cameraScanState === 'duplicate' && '⚠ Duplicate Scan Warning'}
                        {cameraScanState === 'rejected' && '✕ Invalid Credentials'}
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Gallery of all 4 states */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      All Viewfinder Feedback States (Side-by-Side Reference)
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* State 1: Idle */}
                      <div className="rounded-xl border border-border bg-slate-950 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-2">
                          1. Idle / Scanning
                        </span>
                        <div className="h-28 rounded-lg bg-[#020617] flex items-center justify-center border border-cyan-500/20">
                          <div className="size-16 border border-dashed border-cyan-400/60 rounded flex items-center justify-center">
                            <span className="size-1 rounded-full bg-cyan-400 animate-ping" />
                          </div>
                        </div>
                        <span className="mt-2 block text-[11px] text-slate-400">Cyan Reticle + Laser Sweep</span>
                      </div>

                      {/* State 2: Accepted */}
                      <div className="rounded-xl border border-emerald-500/40 bg-slate-950 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                          2. Accepted (.state-accepted)
                        </span>
                        <div
                          className="h-28 rounded-lg flex items-center justify-center border border-emerald-500"
                          style={{ background: 'radial-gradient(circle, #064E3B 0%, #022C22 100%)' }}
                        >
                          <div className="size-16 border-2 border-emerald-400 rounded flex items-center justify-center">
                            <CheckIcon className="size-6 text-emerald-400" />
                          </div>
                        </div>
                        <span className="mt-2 block text-[11px] text-emerald-300">Green Glow Radial Gradient</span>
                      </div>

                      {/* State 3: Duplicate */}
                      <div className="rounded-xl border border-amber-500/40 bg-slate-950 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
                          3. Duplicate (.state-duplicate)
                        </span>
                        <div
                          className="h-28 rounded-lg flex items-center justify-center border border-amber-500"
                          style={{ background: 'radial-gradient(circle, #78350F 0%, #451A03 100%)' }}
                        >
                          <div className="size-16 border-2 border-amber-400 rounded flex items-center justify-center">
                            <ClockIcon className="size-6 text-amber-400" />
                          </div>
                        </div>
                        <span className="mt-2 block text-[11px] text-amber-300">Amber Warning Gradient</span>
                      </div>

                      {/* State 4: Rejected */}
                      <div className="rounded-xl border border-rose-500/40 bg-slate-950 p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-2">
                          4. Rejected (.state-rejected)
                        </span>
                        <div
                          className="h-28 rounded-lg flex items-center justify-center border border-rose-500"
                          style={{ background: 'radial-gradient(circle, #7F1D1D 0%, #450A0A 100%)' }}
                        >
                          <div className="size-16 border-2 border-rose-400 rounded flex items-center justify-center">
                            <XIcon className="size-6 text-rose-400" />
                          </div>
                        </div>
                        <span className="mt-2 block text-[11px] text-rose-300">Red Alert Gradient</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Admin Role Pill */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Admin role pill (.admin-pill, .admin-pill-dot)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Security badge with pulsing status dot to clearly denote high-privilege administrative sessions.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    {/* Light Surface Admin Pill */}
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/50">
                      <span className="text-xs text-muted-foreground mr-1">Light context:</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted py-1 px-3 text-[11px] font-bold tracking-wider text-foreground">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>
                        <span>ADMIN</span>
                      </span>
                    </div>

                    {/* Dark Surface Admin Pill */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 text-white">
                      <span className="text-xs text-slate-400 mr-1">Dark nav context:</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-800 py-1 px-3 text-[11px] font-bold tracking-wider text-slate-200">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                        </span>
                        <span>SYSTEM ADMIN</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. RSVP Breakdown Dots */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      RSVP breakdown dots (.dot-green, .dot-red, .dot-amber, .dot-gray)
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      10px circular indicators mapped strictly to semantic color tokens for glanceable status categorization.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-2xl">
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
                      <span className="size-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">dot-green</strong>
                        <span className="text-[11px] text-muted-foreground">#10B981 (Accepted)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
                      <span className="size-2.5 rounded-full bg-rose-500 shrink-0" />
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">dot-red</strong>
                        <span className="text-[11px] text-muted-foreground">#EF4444 (Declined)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
                      <span className="size-2.5 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">dot-amber</strong>
                        <span className="text-[11px] text-muted-foreground">#F59E0B (Tentative)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
                      <span className="size-2.5 rounded-full bg-slate-400 shrink-0" />
                      <div>
                        <strong className="block text-xs font-semibold text-foreground">dot-gray</strong>
                        <span className="text-[11px] text-muted-foreground">#94A3B8 (Unanswered)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* 17. Responsive Patterns */}
            <Section
              id="responsive"
              title="Responsive patterns"
              description="Table-to-card auto-transformations, 44px touch target enforcement, mobile drawer collapses, and portal container width guidelines."
            >
              <div className="space-y-8">
                {/* 1. Table → Card Stack Auto-Transform */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Table → card stack auto-transform (eirmis.css:809-847)
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Below 768px, tables automatically flatten into stacked cards. Table cells become label/value rows using data-label attributes.
                      </p>
                    </div>
                    {/* View Switcher */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant={responsiveTableView === 'desktop' ? 'primary' : 'outline'}
                        onClick={() => setResponsiveTableView('desktop')}
                      >
                        Desktop Table View (≥768px)
                      </Button>
                      <Button
                        size="xs"
                        variant={responsiveTableView === 'mobile' ? 'primary' : 'outline'}
                        onClick={() => setResponsiveTableView('mobile')}
                      >
                        Mobile Card Stack (&lt;768px)
                      </Button>
                    </div>
                  </div>

                  {responsiveTableView === 'desktop' ? (
                    /* Desktop Table View */
                    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-muted border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="py-2.5 px-4">Attendee</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">RSVP Status</th>
                            <th className="py-2.5 px-4">Table</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[
                            { name: 'Sarah Jenkins', cat: 'Keynote Speaker', status: 'Confirmed', statusColor: 'bg-success-bg text-success', table: 'Table #1' },
                            { name: 'Arthur Vance', cat: 'Corporate Sponsor', status: 'Pending', statusColor: 'bg-warning-bg text-warning', table: 'Table #4' },
                            { name: 'Elena Rostova', cat: 'General Attendee', status: 'Waitlist', statusColor: 'bg-muted text-foreground', table: 'Unassigned' },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-muted/70 transition-colors">
                              <td className="py-3 px-4 font-semibold text-foreground">{row.name}</td>
                              <td className="py-3 px-4 text-muted-foreground">{row.cat}</td>
                              <td className="py-3 px-4">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.statusColor}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{row.table}</td>
                              <td className="py-3 px-4 text-right">
                                <Button size="xs" variant="ghost">Manage</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Mobile Card Stack Simulation */
                    <div className="space-y-3 max-w-md mx-auto">
                      {[
                        { name: 'Sarah Jenkins', cat: 'Keynote Speaker', status: 'Confirmed', statusColor: 'bg-success-bg text-success', table: 'Table #1' },
                        { name: 'Arthur Vance', cat: 'Corporate Sponsor', status: 'Pending', statusColor: 'bg-warning-bg text-warning', table: 'Table #4' },
                        { name: 'Elena Rostova', cat: 'General Attendee', status: 'Waitlist', statusColor: 'bg-muted text-foreground', table: 'Unassigned' },
                      ].map((row, i) => (
                        <div key={i} className="rounded-xl border border-border bg-surface p-3 shadow-xs space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Attendee</span>
                            <strong className="font-semibold text-foreground">{row.name}</strong>
                          </div>
                          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Category</span>
                            <span className="text-muted-foreground">{row.cat}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Status</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.statusColor}`}>{row.status}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Table</span>
                            <span className="text-muted-foreground">{row.table}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Action</span>
                            <Button size="xs" variant="outline">Manage</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground border border-border">
                    <p className="font-semibold text-foreground">💡 Auto-label Implementation Note:</p>
                    <p className="mt-1">
                      Tables are automatically labeled via <code>EIRMIS.autoLabelTables()</code> which maps <code>th</code> content into cell <code>data-label</code> attributes. Use the <code>.no-card-stack</code> class on table elements to opt-out of mobile card flattening.
                    </p>
                  </div>
                </div>

                {/* 2. Touch Target Enforcement */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Touch target enforcement (eirmis.css:790-802)
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        WCAG 2.5.5 compliance: Interactive controls strictly enforce a 44×44px minimum hit area on viewports &lt;768px.
                      </p>
                    </div>
                    <Button
                      size="xs"
                      variant={showTouchRuler ? 'primary' : 'outline'}
                      onClick={() => setShowTouchRuler((prev) => !prev)}
                    >
                      {showTouchRuler ? 'Hide Ruler Box' : 'Show 44×44px Ruler Box'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-muted/50 border border-border max-w-xl">
                    {/* Button Demo */}
                    <div className="relative inline-flex flex-col items-center">
                      <button
                        type="button"
                        className={`min-h-[44px] min-w-[44px] px-4 rounded-lg bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center transition-all ${showTouchRuler ? 'ring-2 ring-error ring-offset-2' : ''
                          }`}
                      >
                        44px Button
                      </button>
                      {showTouchRuler && (
                        <span className="mt-1 text-[10px] font-mono font-bold text-error">44 × 44px min</span>
                      )}
                    </div>

                    {/* Icon Button Demo */}
                    <div className="relative inline-flex flex-col items-center">
                      <button
                        type="button"
                        className={`min-h-[44px] min-w-[44px] rounded-lg border border-border bg-surface text-foreground flex items-center justify-center transition-all ${showTouchRuler ? 'ring-2 ring-error ring-offset-2' : ''
                          }`}
                      >
                        <SearchIcon className="size-4 text-muted-foreground" />
                      </button>
                      {showTouchRuler && (
                        <span className="mt-1 text-[10px] font-mono font-bold text-error">44 × 44px min</span>
                      )}
                    </div>

                    {/* Segmented Button Demo */}
                    <div className="relative inline-flex flex-col items-center">
                      <button
                        type="button"
                        className={`min-h-[44px] px-3.5 rounded-full border border-border bg-surface text-foreground text-xs font-semibold flex items-center justify-center transition-all ${showTouchRuler ? 'ring-2 ring-error ring-offset-2' : ''
                          }`}
                      >
                        Pill Action
                      </button>
                      {showTouchRuler && (
                        <span className="mt-1 text-[10px] font-mono font-bold text-error">h: 44px min</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Navigation Collapse → Drawer */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Navigation collapse &amp; mobile drawer
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Demonstrates the 768px transition: horizontal links collapse, hamburger toggle appears, and modal drawer handles portal navigation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                      <strong className="block text-xs font-bold text-foreground">Desktop Mode (≥768px)</strong>
                      <div className="flex items-center gap-2 rounded-lg bg-muted p-2 text-xs">
                        <span className="font-bold text-primary">EIRMIS</span>
                        <div className="flex gap-1 text-[11px] text-muted-foreground ml-2">
                          <span className="bg-surface px-1.5 py-0.5 rounded shadow-2xs text-foreground font-medium">Public</span>
                          <span className="px-1.5 py-0.5">Organizer</span>
                          <span className="px-1.5 py-0.5">Admin</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground block">Links spread out in top glassmorphic bar</span>
                    </div>

                    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                      <strong className="block text-xs font-bold text-foreground">Mobile Mode (&lt;768px)</strong>
                      <div className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs">
                        <span className="font-bold text-primary">EIRMIS</span>
                        <button
                          type="button"
                          className="size-7 rounded bg-surface border border-border flex items-center justify-center text-foreground"
                          onClick={() => {
                            const drawer = document.getElementById('styleguide-drawer')
                            const backdrop = document.getElementById('styleguide-drawer-backdrop')
                            if (drawer) drawer.classList.add('open')
                            if (backdrop) backdrop.classList.add('open')
                          }}
                        >
                          ☰
                        </button>
                      </div>
                      <span className="text-[11px] text-muted-foreground block">Hamburger opens slide-out drawer</span>
                    </div>
                  </div>
                </div>

                {/* 4. Container Widths per Portal */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Container widths per portal
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Strict viewport boundaries calibrated to user density, device context, and Miller&apos;s Law cognitive limits.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-4">Portal Application</th>
                          <th className="py-2.5 px-4">Max Width</th>
                          <th className="py-2.5 px-4">Primary Layout Structure</th>
                          <th className="py-2.5 px-4">Breakpoint Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="py-3 px-4 font-semibold text-foreground">Landing / Public Microsite</td>
                          <td className="py-3 px-4 font-mono font-bold text-primary">1240px</td>
                          <td className="py-3 px-4 text-muted-foreground">Fluid container, responsive hero, full-width sections</td>
                          <td className="py-3 px-4 text-muted-foreground">Desktop, Tablet, Mobile (320px+)</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold text-foreground">Organizer Workspace</td>
                          <td className="py-3 px-4 font-mono font-bold text-primary">1240px</td>
                          <td className="py-3 px-4 text-muted-foreground">Two-column layout (1.65fr 1fr), collapsible sidebar (250→72px)</td>
                          <td className="py-3 px-4 text-muted-foreground">1200px / 900px / 768px / 560px</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold text-foreground">System Admin Governance</td>
                          <td className="py-3 px-4 font-mono font-bold text-primary">1240px</td>
                          <td className="py-3 px-4 text-muted-foreground">Glanceable 4-chunk KPI strip, audit logs, zero-knowledge boundary</td>
                          <td className="py-3 px-4 text-muted-foreground">1240px desktop down to 768px tablet</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold text-foreground">Guest Portal (RSVP Flow)</td>
                          <td className="py-3 px-4 font-mono font-bold text-secondary">680px</td>
                          <td className="py-3 px-4 text-muted-foreground">Centered card container, mobile-first RSVP touch responses</td>
                          <td className="py-3 px-4 text-muted-foreground">Optimized for handheld smartphones (375-430px)</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold text-foreground">Check-in Staff Scanner</td>
                          <td className="py-3 px-4 font-mono font-bold text-secondary">500px</td>
                          <td className="py-3 px-4 text-muted-foreground">Focused camera viewfinder reticle, high-stress door scanning</td>
                          <td className="py-3 px-4 text-muted-foreground">Handheld mobile only (max 500px)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Section>

            {/* 18. Portal & composite components */}
            <Section
              id="portal-components"
              title="Portal components"
              description="Extracted domain-specific components shared across Landing, Login, Guest, Admin, and Check-in Staff portals."
            >
              <div className="space-y-8">
                {/* 1. SSO Identity Provider Stack */}
                <DemoCard>
                  <SectionLabel
                    label="SSO Identity Provider Stack (Landing & Login)"
                    description="Institutional & enterprise authentication buttons with brand icons, status badges, and interactive feedback."
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-3xl">
                    <SsoButton provider="google" />
                    <SsoButton provider="microsoft" />
                    <SsoButton provider="github" />
                    <SsoButton provider="organizer" />
                  </div>
                </DemoCard>

                {/* 2. Guest RSVP Choice Selector */}
                <DemoCard>
                  <SectionLabel
                    label="Guest RSVP Choice Selector (Guest Portal)"
                    description="Mobile-first, color-coded response cards for attending, tentative, or declined status."
                  />
                  <div className="max-w-2xl space-y-3">
                    <RsvpSelector
                      value={demoRsvp}
                      onChange={(choice) => setDemoRsvp(choice)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 px-1">
                      <span>Interactive choice state:</span>
                      <span className="font-mono font-bold text-foreground capitalize">
                        {demoRsvp}
                      </span>
                    </div>
                  </div>
                </DemoCard>

                {/* 3. Digital Wallet Pass */}
                <DemoCard>
                  <SectionLabel
                    label="Digital Wallet Pass (Guest Portal)"
                    description="High-fidelity digital ticket pass with attendee info, scannable QR reticle, and Apple Wallet integration."
                  />
                  <div className="max-w-xl">
                    <WalletPass
                      eventName="Annual Cybersecurity & Cloud Congress"
                      eventDate="November 18, 2026 • 10:00 AM PST"
                      eventLocation="Grand Ballroom • Moscone West"
                      attendeeName="Dr. Sarah Chen, Ph.D."
                      ticketTier="Keynote Speaker VIP"
                      ticketCode="TKT-2026-EIRMIS-908"
                    />
                  </div>
                </DemoCard>

                {/* 4. Admin Settings Grid & Toggle Rows */}
                <DemoCard>
                  <SectionLabel
                    label="Settings Grid & Toggle Rows (Admin Governance)"
                    description="Two-column configuration layout pairing explanatory copy with card-encapsulated switch rows."
                  />
                  <div className="space-y-6">
                    <SettingsSection
                      title="Cryptographic Ledger Integrity"
                      description="Enforce zero-knowledge proofs and hardware security module signing across all registration tickets."
                      badge="Zero-Knowledge"
                      footer={
                        <>
                          <span className="text-muted-foreground">Audit hash verified: 0x7e29...91a</span>
                          <Button size="sm">Save Policy</Button>
                        </>
                      }
                    >
                      <ToggleRow
                        title="Automatic ZK Proof Validation"
                        description="Reject any RSVP payload that lacks a cryptographic client signature."
                        checked={demoToggle1}
                        onCheckedChange={setDemoToggle1}
                        badge="Strict"
                      />
                      <ToggleRow
                        title="Hardware Security Module (HSM) Signing"
                        description="Route secret door check-in keys through FIPS 140-3 Level 4 enclaves."
                        checked={demoToggle2}
                        onCheckedChange={setDemoToggle2}
                      />
                      <ToggleRow
                        title="Immutable Audit Logging"
                        description="Stream real-time access events directly to governance nodes."
                        checked={demoToggle3}
                        onCheckedChange={setDemoToggle3}
                        badge="Compliant"
                      />
                    </SettingsSection>
                  </div>
                </DemoCard>

                {/* 5. Check-in Staff Scan Result Feedback */}
                <DemoCard>
                  <SectionLabel
                    label="Scan Result Feedback Card (Staff Scanner)"
                    description="Real-time status banner triggered immediately following QR scan with entry validation flags."
                  />
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="self-center font-semibold text-muted-foreground text-[11px] mr-1">
                        Simulate Scan:
                      </span>
                      {(['approved', 'duplicate', 'warning', 'rejected'] as ScanStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setDemoScanStatus(st)}
                          className={cn(
                            'rounded-lg px-2.5 py-1 font-semibold capitalize transition-all text-xs',
                            demoScanStatus === st
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : 'bg-muted text-foreground hover:bg-border'
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <ScanResult
                      status={demoScanStatus}
                      attendeeName="Elena Rostova"
                      ticketCode="EIRMIS-QR-88219"
                      ticketTier="Executive Delegate"
                      scannedAt="12 seconds ago"
                      notes={demoScanStatus === 'warning' ? 'Verify government photo ID at Gate A' : undefined}
                      onNextScan={() => setDemoScanStatus('approved')}
                    />
                  </div>
                </DemoCard>

                {/* 6. Route Switcher Bar */}
                <DemoCard>
                  <SectionLabel
                    label="Portal Route Switcher Bar (Landing Page)"
                    description="Pill-based horizontal switcher for navigating across all 5 EIRMIS portal surfaces."
                  />
                  <RouteSwitcher
                    activeRoute={demoRoute}
                    onRouteChange={(r) => setDemoRoute(r)}
                  />
                </DemoCard>

                {/* 7. Landing Solution Cards & Notice Box */}
                <DemoCard>
                  <SectionLabel
                    label="Solution Cards & Notice Box (Landing & Microsite)"
                    description="High-engagement product feature cards and institutional alert callouts."
                  />
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <SolutionCard
                        title="Decentralized RSVP Pipeline"
                        description="Self-sovereign guest invitations with one-click verification and zero spam friction."
                        tags={['Zero-Knowledge', 'Self-Serve', 'Instant']}
                        badge="Core"
                        href="#explore"
                      />
                      <SolutionCard
                        title="Door Staff Scanner Suite"
                        description="Offline-capable mobile camera scanner with sub-100ms ticket barcode decoding."
                        tags={['PWA Camera', 'Offline Sync', 'Sub-100ms']}
                        badge="Production"
                        href="#explore"
                      />
                      <SolutionCard
                        title="Zero-Knowledge Audit Trail"
                        description="Cryptographically verifiable access logs providing indisputable proof of attendance."
                        tags={['SOC 2 Type II', 'Immutable', 'GDPR']}
                        badge="Security"
                        href="#explore"
                      />
                    </div>

                    <NoticeBox title="Institutional Compliance Guarantee">
                      All event data stays encrypted under AES-256-GCM. Personal identifiable information (PII) is discarded automatically 30 days after event conclusion per institutional policy.
                    </NoticeBox>
                  </div>
                </DemoCard>

                {/* 8. Capacity Quota & Inset Grouped Attendees */}
                <DemoCard>
                  <SectionLabel
                    label="Quota Capacity & Inset Grouped Attendees (Guest & Organizer)"
                    description="Visual capacity trackers and iOS-inspired inset grouped list views."
                  />
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <strong className="text-xs font-bold text-foreground block">Real-time Quota Bars</strong>
                      <QuotaBar current={84} max={100} label="Main Auditorium VIP" />
                      <QuotaBar current={98} max={100} label="Executive Workshop Room" />
                    </div>

                    <div className="space-y-3">
                      <strong className="text-xs font-bold text-foreground block">Inset Grouped Attendees List</strong>
                      <InsetGroupedList>
                        <AttendeeItem
                          name="Marcus Vance"
                          email="m.vance@university.edu"
                          role="Keynote Speaker"
                          status="confirmed"
                          onClick={() => { }}
                        />
                        <AttendeeItem
                          name="Chloe Bennett"
                          email="c.bennett@techcorp.io"
                          role="Panelist"
                          status="pending"
                          onClick={() => { }}
                        />
                        <AttendeeItem
                          name="Devon Miller"
                          email="devon@agency.design"
                          role="Guest"
                          status="declined"
                          onClick={() => { }}
                        />
                      </InsetGroupedList>
                    </div>
                  </div>
                </DemoCard>

                {/* 9. Workflow Steps & Account Identity Switcher */}
                <DemoCard>
                  <SectionLabel
                    label="Login Workflow Steps & Account Switcher (Auth Flows)"
                    description="Step progression indicator and multi-account identity selection cards."
                  />
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
                    <div className="space-y-4 rounded-xl border border-border bg-muted/60 p-4">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-foreground block">Verification Workflow</strong>
                        <div className="flex gap-1 text-[11px]">
                          {[1, 2, 3].map((step) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setDemoWorkflowStep(step)}
                              className={cn(
                                'px-2 py-0.5 rounded font-semibold transition-all',
                                demoWorkflowStep === step
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-surface border border-border text-muted-foreground hover:bg-muted'
                              )}
                            >
                              Step {step}
                            </button>
                          ))}
                        </div>
                      </div>
                      <WorkflowStep
                        step={1}
                        title="Institutional SSO Verification"
                        description="Authenticated via Entra ID directory"
                        status={demoWorkflowStep > 1 ? 'completed' : demoWorkflowStep === 1 ? 'current' : 'upcoming'}
                      />
                      <WorkflowStep
                        step={2}
                        title="Role Clearance Assignment"
                        description="Selecting active workspace and credentials"
                        status={demoWorkflowStep > 2 ? 'completed' : demoWorkflowStep === 2 ? 'current' : 'upcoming'}
                      />
                      <WorkflowStep
                        step={3}
                        title="Zero-Knowledge Session Handshake"
                        description="Issue scoped JWT and local cryptographic keypair"
                        status={demoWorkflowStep === 3 ? 'current' : 'upcoming'}
                      />
                    </div>

                    <div className="space-y-3">
                      <strong className="text-xs font-bold text-foreground block">Identity Accounts</strong>
                      <AccountCard
                        name="Alex Rivera"
                        email="alex.rivera@eirmis.org"
                        organization="Platform Administrator"
                        active={true}
                        onSwitch={() => { }}
                        onSelect={() => { }}
                      />
                      <AccountCard
                        name="Jordan Lee"
                        email="jordan.lee@partner.org"
                        organization="Event Organizer"
                        active={false}
                        onSwitch={() => { }}
                        onSelect={() => { }}
                      />
                    </div>
                  </div>
                </DemoCard>

                {/* 10. Audit Callout & 403 Error State */}
                <DemoCard>
                  <SectionLabel
                    label="Zero-Knowledge Audit Callout & 403 Error Template"
                    description="Governance code snippets and restricted permission error handling."
                  />
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
                    <AuditCallout
                      policyId="SEC-EIRMIS-091"
                      title="Cryptographic Hardware Boundary"
                      description="Requests beyond this gateway must supply an Ed25519 signature verified against the master governance registry."
                      codeSnippet={`// Zero-knowledge token verification\nconst verified = await crypto.subtle.verify(\n  { name: 'Ed25519' },\n  governanceKey,\n  signature,\n  payloadBuffer\n);`}
                    />

                    <ErrorPage
                      errorCode="403"
                      title="Restricted Administrative Clearance"
                      description="Your current identity lacks the necessary cryptographic clearance level to inspect this event ledger partition."
                      primaryLabel="Back to Safety"
                      secondaryLabel="Request Access"
                      onPrimaryAction={() => { }}
                      onSecondaryAction={() => { }}
                    />
                  </div>
                </DemoCard>
              </div>
            </Section>

            {/* 13. Shared primitives */}
            <Section
              id="primitives"
              title="Shared primitives"
              description="Patterns used across Organizer, Admin, Guest, and Check-in Staff portals."
            >
              <div className="space-y-6">
                {/* Status chips */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
                <Card className="border-dashed border-2 border-border/80 bg-surface/70 p-8 text-left shadow-xs">
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
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full bg-primary" />
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
                <Card className="p-5 border-border bg-surface shadow-xs">
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
                <Card className="p-5 border-border bg-surface shadow-xs">
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
                <Card className="p-5 border-border bg-surface shadow-xs">
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
                <Alert className="border-warning-border bg-warning-bg/70 text-warning">
                  <ClockIcon className="size-4 text-warning" />
                  <AlertTitle className="font-semibold text-warning">
                    RSVP deadline approaching
                  </AlertTitle>
                  <AlertDescription className="text-xs text-warning">
                    12 invitations are still awaiting a response before the guest list freezes.
                  </AlertDescription>
                  <AlertAction>
                    <Button size="xs" variant="outline" className="border-warning-border bg-surface text-warning hover:bg-warning-border">
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
                <Card className="p-5 border-border bg-surface shadow-xs space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Skeleton state
                  </span>
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </Card>

                {/* Empty State Card */}
                <Card className="p-5 border-border bg-surface shadow-xs flex flex-col justify-between">
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
                <Card className="p-5 border-border bg-surface shadow-lg space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
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

            {/* 14. Theming */}
            <Section
              id="theming"
              title="Theming — light & dark mode"
              description="The design system is theme-aware. A single .dark class on <html> swaps every CSS custom property. Use tokens, never raw palette utilities, so components adapt automatically."
            >
              {/* How it works + live toggle */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
                <Card className="p-5 border-border bg-surface shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    How it works
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
                    <li>
                      <strong className="text-foreground">next-themes</strong> wraps the app
                      (<code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">ThemeProvider</code> in{' '}
                      <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">main.tsx</code>) and toggles the{' '}
                      <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">.dark</code> class on{' '}
                      <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">{'<html>'}</code>.
                    </li>
                    <li>
                      Tailwind v4 maps the class via{' '}
                      <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">@custom-variant dark</code>;
                      every token in <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">:root</code> has a
                      dark counterpart in <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">.dark</code>.
                    </li>
                    <li>
                      The choice persists to <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">localStorage</code>{' '}
                      (key: <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">theme</code>). System preference
                      detection is intentionally disabled.
                    </li>
                  </ul>
                </Card>

                <Card className="p-5 border-border bg-surface shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Live toggle
                  </span>
                  <p className="mt-2 text-xs text-muted-foreground">
                    The same control mounted in the page header. Click to switch — every
                    token-driven surface on this page responds instantly.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <ThemeToggle />
                    <span className="text-xs font-medium text-foreground">
                      Light ↔ Dark
                    </span>
                  </div>
                </Card>
              </div>

              {/* Light → dark token mapping */}
              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  Token mapping — light / dark values
                </h3>
                <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-4">Token</th>
                        <th className="py-2.5 px-4">Light</th>
                        <th className="py-2.5 px-4">Dark</th>
                        <th className="py-2.5 px-4">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['--background', '#F8FAFC', '#0B1120', 'Page background'],
                        ['--surface', '#FFFFFF', '#1E293B', 'Cards, panels, inputs'],
                        ['--foreground', '#0F172A', '#F1F5F9', 'Primary text'],
                        ['--muted', '#F1F5F9', '#1E293B', 'Subtle fills, hover states'],
                        ['--muted-foreground', '#64748B', '#94A3B8', 'Secondary text'],
                        ['--border', '#E2E8F0', '#334155', 'Dividers, control borders'],
                        ['--primary', '#4F46E5', '#818CF8', 'Brand actions, active states'],
                        ['--primary-subtle', '#EEF2FF', 'rgba(99,102,241,.15)', 'Badges, subtle brand fills'],
                        ['--secondary', '#0D9488', '#2DD4BF', 'Teal accents'],
                        ['--success', '#15803D', '#4ADE80', 'Confirmed / approved'],
                        ['--warning', '#B45309', '#FBBF24', 'Pending / tentative'],
                        ['--error', '#B91C1C', '#F87171', 'Declined / invalid'],
                        ['--surface-glass', 'rgba(255,255,255,.92)', 'rgba(15,23,42,.92)', 'Glassmorphic nav'],
                      ].map(([token, light, dark, usage]) => (
                        <tr key={token} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-primary">{token}</td>
                          <td className="py-2.5 px-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="size-3 rounded border border-border" style={{ backgroundColor: light }} />
                              <span className="font-mono text-[10px] text-muted-foreground">{light}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="size-3 rounded border border-border" style={{ backgroundColor: dark }} />
                              <span className="font-mono text-[10px] text-muted-foreground">{dark}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">{usage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Usage rules */}
              <div className="mt-6 rounded-xl border border-primary-border bg-primary-subtle/60 p-4 text-xs text-foreground">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-primary-border">
                  <CheckIcon className="size-4 text-primary" />
                  <strong className="font-bold">Usage rules</strong>
                </div>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground leading-relaxed">
                  <li>Always prefer semantic tokens (<code className="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">bg-surface</code>, <code className="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">text-primary</code>) over raw palette utilities (<code className="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">bg-white</code>, <code className="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">text-indigo-600</code>).</li>
                  <li>Pair solid brand fills with <code className="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">text-primary-foreground</code>, not <code className="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">text-white</code>.</li>
                  <li>Intentionally-dark surfaces (wallet pass, scanner viewfinder, toasts) keep raw dark palettes in both themes.</li>
                  <li>Never use <code className="font-mono text-[11px] bg-surface px-1 py-0.5 rounded">prefers-color-scheme</code> media queries — the class toggle is the single source of truth.</li>
                </ul>
              </div>
            </Section>
          </main>
        </div>
      </div>

      {/* Floating theme toggle — always visible, bottom-right */}
      <ThemeToggle floating />
    </TooltipProvider >
  )
}
