import React from 'react'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  RotateCcwIcon,
  XCircleIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ScanStatus = 'approved' | 'duplicate' | 'warning' | 'rejected'

export interface ScanResultProps {
  status: ScanStatus
  title?: string
  subtitle?: string
  attendeeName: string
  ticketCode: string
  ticketTier?: string
  scannedAt?: string
  notes?: string
  onNextScan?: () => void
  onOverride?: () => void
  className?: string
}

const statusConfig: Record<
  ScanStatus,
  {
    title: string
    subtitle: string
    badgeVariant: 'success' | 'warning' | 'error' | 'outline'
    badgeText: string
    icon: React.ReactNode
    containerClass: string
    iconBoxClass: string
  }
> = {
  approved: {
    title: 'Access Granted',
    subtitle: 'Credential verified & recorded successfully',
    badgeVariant: 'success',
    badgeText: 'Verified Entry',
    icon: <CheckCircle2Icon className="size-6 text-emerald-600" />,
    containerClass: 'border-emerald-200 bg-emerald-50/40',
    iconBoxClass: 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20',
  },
  duplicate: {
    title: 'Duplicate Scan Detected',
    subtitle: 'This pass has already been processed at Gate B',
    badgeVariant: 'warning',
    badgeText: 'Already Checked In',
    icon: <ClockIcon className="size-6 text-amber-600" />,
    containerClass: 'border-amber-200 bg-amber-50/40',
    iconBoxClass: 'bg-amber-100 text-amber-700 ring-2 ring-amber-500/20',
  },
  warning: {
    title: 'Verification Flag',
    subtitle: 'Attendee requires ID check or badge exchange',
    badgeVariant: 'warning',
    badgeText: 'Attention Needed',
    icon: <AlertTriangleIcon className="size-6 text-amber-600" />,
    containerClass: 'border-amber-200 bg-amber-50/40',
    iconBoxClass: 'bg-amber-100 text-amber-700 ring-2 ring-amber-500/20',
  },
  rejected: {
    title: 'Access Denied',
    subtitle: 'Ticket invalid, revoked, or non-matching cryptographic signature',
    badgeVariant: 'error',
    badgeText: 'Invalid Credential',
    icon: <XCircleIcon className="size-6 text-rose-600" />,
    containerClass: 'border-rose-200 bg-rose-50/40',
    iconBoxClass: 'bg-rose-100 text-rose-700 ring-2 ring-rose-500/20',
  },
}

export function ScanResult({
  status,
  title,
  subtitle,
  attendeeName,
  ticketCode,
  ticketTier = 'General Admission',
  scannedAt = 'Just now',
  notes,
  onNextScan,
  onOverride,
  className,
}: ScanResultProps) {
  const config = statusConfig[status]
  const displayTitle = title ?? config.title
  const displaySubtitle = subtitle ?? config.subtitle

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-xs transition-all duration-200',
        config.containerClass,
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Status header with icon */}
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl',
              config.iconBoxClass
            )}
          >
            {config.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                {displayTitle}
              </h4>
              <Badge variant={config.badgeVariant} size="sm">
                {config.badgeText}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {displaySubtitle}
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-[11px] font-mono text-muted-foreground self-start">
          {scannedAt}
        </span>
      </div>

      {/* Attendee Details strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-white/80 p-3.5 text-xs sm:grid-cols-3">
        <div>
          <span className="block text-[10px] uppercase font-bold text-muted-foreground">
            Attendee
          </span>
          <span className="font-semibold text-foreground truncate block">
            {attendeeName}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-muted-foreground">
            Ticket Code
          </span>
          <span className="font-mono text-foreground truncate block">
            {ticketCode}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="block text-[10px] uppercase font-bold text-muted-foreground">
            Tier
          </span>
          <span className="font-medium text-foreground">{ticketTier}</span>
        </div>
      </div>

      {notes && (
        <p className="mt-3 text-xs text-slate-600 bg-white/60 p-2.5 rounded-lg border border-border/40">
          <strong>Staff note:</strong> {notes}
        </p>
      )}

      {/* Action controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onNextScan && (
          <Button size="sm" onClick={onNextScan} className="flex-1 sm:flex-initial">
            <RotateCcwIcon className="mr-1.5 size-3.5" />
            Next Scan
          </Button>
        )}
        {status !== 'approved' && onOverride && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOverride}
            className="flex-1 sm:flex-initial text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            Manual Override
          </Button>
        )}
      </div>
    </div>
  )
}
