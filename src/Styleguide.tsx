import { useEffect, useState, type ReactNode } from 'react'
import {
  Building2Icon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  LuggageIcon,
  MailIcon,
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
  ['elevation', 'Elevation & radius'],
  ['icons', 'Iconography'],
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
                    className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      activeSection === id
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

            {/* 11. Shared primitives */}
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
    </TooltipProvider>
  )
}
