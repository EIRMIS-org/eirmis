import type { ReactNode } from 'react'
import {
  CheckIcon,
  ChevronRightIcon,
  InfoIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* 1. SolutionCard (Landing Portal)                                           */
/* -------------------------------------------------------------------------- */
export interface SolutionCardProps {
  title: string
  description: string
  icon?: ReactNode
  tags?: string[]
  badge?: string
  href?: string
  className?: string
}

export function SolutionCard({
  title,
  description,
  icon,
  tags = [],
  badge,
  href,
  className,
}: SolutionCardProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary-border hover:shadow-md',
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary-subtle text-primary ring-1 ring-primary-glow transition-transform group-hover:scale-105">
            {icon ?? <SparklesIcon className="size-5" />}
          </div>
          {badge && (
            <Badge variant="outline" size="sm">
              {badge}
            </Badge>
          )}
        </div>

        <div>
          <h4 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        {href && (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            Explore <ChevronRightIcon className="size-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 2. QuotaBar (Guest & Organizer Portals)                                    */
/* -------------------------------------------------------------------------- */
export interface QuotaBarProps {
  current: number
  max: number
  label?: string
  unit?: string
  className?: string
}

export function QuotaBar({
  current,
  max,
  label = 'Capacity Allocated',
  unit = 'guests',
  className,
}: QuotaBarProps) {
  const percent = Math.min(100, Math.round((current / max) * 100))
  const isHigh = percent >= 85
  const isFull = percent >= 100

  return (
    <div className={cn('space-y-2 rounded-xl border border-border/80 bg-surface p-4 shadow-2xs', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">
          <strong className="text-foreground">{current}</strong> / {max} {unit} ({percent}%)
        </span>
      </div>

      <Progress
        value={percent}
        className={cn(
          'h-2',
          isFull && '[&>div]:bg-error',
          isHigh && !isFull && '[&>div]:bg-warning',
          !isHigh && '[&>div]:bg-primary'
        )}
      />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>0</span>
        <span className="font-medium text-muted-foreground">
          {isFull ? 'Limit reached' : `${max - current} slots remaining`}
        </span>
        <span>{max}</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 3. InsetGroupedList & AttendeeItem (Guest & Mobile List Rows)               */
/* -------------------------------------------------------------------------- */
export interface AttendeeItemProps {
  name: string
  role?: string
  email?: string
  status?: 'confirmed' | 'pending' | 'declined'
  onClick?: () => void
}

export function AttendeeItem({
  name,
  role = 'Attendee',
  email,
  status = 'confirmed',
  onClick,
}: AttendeeItemProps) {
  const statusBadges = {
    confirmed: <Badge variant="success" size="sm">Confirmed</Badge>,
    pending: <Badge variant="warning" size="sm">Pending</Badge>,
    declined: <Badge variant="error" size="sm">Declined</Badge>,
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-3 bg-surface transition-colors hover:bg-muted/80',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary font-bold text-xs">
          {name.charAt(0)}
        </div>
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground">
            {name}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {email || role}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {statusBadges[status]}
        {onClick && <ChevronRightIcon className="size-4 text-muted-foreground" />}
      </div>
    </div>
  )
}

export function InsetGroupedList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-surface divide-y divide-border/60 shadow-2xs',
        className
      )}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 4. WorkflowStep (Login & Onboarding Flows)                                 */
/* -------------------------------------------------------------------------- */
export interface WorkflowStepProps {
  step: number
  title: string
  description?: string
  status?: 'completed' | 'current' | 'upcoming'
}

export function WorkflowStep({
  step,
  title,
  description,
  status = 'upcoming',
}: WorkflowStepProps) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all',
          status === 'completed' && 'bg-success text-success-foreground',
          status === 'current' && 'bg-primary text-primary-foreground ring-2 ring-primary-border',
          status === 'upcoming' && 'bg-border text-muted-foreground'
        )}
      >
        {status === 'completed' ? <CheckIcon className="size-3.5" /> : step}
      </div>
      <div className="min-w-0">
        <strong
          className={cn(
            'block',
            status === 'current' ? 'text-primary font-bold' : 'text-foreground'
          )}
        >
          {title}
        </strong>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-normal">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 5. AccountCard (Login & Identity Switcher)                                 */
/* -------------------------------------------------------------------------- */
export interface AccountCardProps {
  name: string
  email: string
  organization?: string
  avatarUrl?: string
  active?: boolean
  onSelect?: () => void
  onSwitch?: () => void
  className?: string
}

export function AccountCard({
  name,
  email,
  organization = 'EIRMIS Enterprise',
  active = true,
  onSelect,
  onSwitch,
  className,
}: AccountCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5 shadow-2xs transition-all',
        active && 'ring-1 ring-primary-glow border-primary-border',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground font-bold text-sm shadow-xs">
          {name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-bold text-foreground">
              {name}
            </span>
            {active && (
              <span className="rounded-full bg-success-bg px-1.5 py-0.2 text-[9px] font-bold text-success">
                Active
              </span>
            )}
          </div>
          <span className="block truncate text-[11px] text-muted-foreground">
            {email} • {organization}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {onSwitch && (
          <button
            type="button"
            onClick={onSwitch}
            className="text-[11px] font-semibold text-primary hover:text-primary"
          >
            Switch
          </button>
        )}
        {onSelect && (
          <Button size="sm" onClick={onSelect}>
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 6. AuditCallout (Admin Zero-Knowledge Boundary)                            */
/* -------------------------------------------------------------------------- */
export interface AuditCalloutProps {
  policyId?: string
  title: string
  codeSnippet?: string
  description: string
  className?: string
}

export function AuditCallout({
  policyId = 'SEC-POL-049',
  title,
  codeSnippet,
  description,
  className,
}: AuditCalloutProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-primary-border bg-primary-subtle/50 p-4 text-xs shadow-2xs',
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-primary-border">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ShieldAlertIcon className="size-4 text-primary" />
          <span>{title}</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-primary bg-surface px-2 py-0.5 rounded-full border border-primary-border">
          {policyId}
        </span>
      </div>

      <p className="mt-2 text-muted-foreground leading-relaxed">
        {description}
      </p>

      {codeSnippet && (
        <pre className="mt-2.5 overflow-x-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[11px] text-emerald-400">
          <code>{codeSnippet}</code>
        </pre>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 7. ErrorPage (403 Unauthorized & 404 Not Found)                            */
/* -------------------------------------------------------------------------- */
export interface ErrorPageProps {
  errorCode?: string
  title?: string
  description?: string
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
  primaryLabel?: string
  secondaryLabel?: string
  className?: string
}

export function ErrorPage({
  errorCode = '403',
  title = 'Restricted Administrative Clearance',
  description = 'Your session lacks elevated authorization tokens to inspect this partition. Zero-knowledge cryptographic boundary verified.',
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel = 'Return to Public Landing',
  secondaryLabel = 'Request Elevation Token',
  className,
}: ErrorPageProps) {
  return (
    <div
      className={cn(
        'flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border/80 bg-gradient-to-b from-surface to-background p-8 text-center shadow-xs',
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-error-bg text-error shadow-xs ring-4 ring-error-bg/50 mb-4">
        <ShieldAlertIcon className="size-7" />
      </div>

      <span className="font-mono text-xs font-bold uppercase tracking-wider text-error">
        Error {errorCode}
      </span>
      <h2 className="mt-1 font-heading text-xl font-bold text-foreground sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onPrimaryAction && (
          <Button onClick={onPrimaryAction} size="sm">
            {primaryLabel}
          </Button>
        )}
        {onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="outline" size="sm">
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 8. NoticeBox (Alert Callout variant)                                       */
/* -------------------------------------------------------------------------- */
export function NoticeBox({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-primary-border bg-primary-subtle/60 p-4 text-xs text-foreground',
        className
      )}
    >
      <InfoIcon className="size-4 shrink-0 text-primary mt-0.5" />
      <div className="min-w-0">
        {title && <strong className="block font-bold text-foreground">{title}</strong>}
        <div className="text-muted-foreground text-xs">{children}</div>
      </div>
    </div>
  )
}
