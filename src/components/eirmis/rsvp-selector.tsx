import type { ReactNode } from 'react'
import { CheckCircleIcon, ClockIcon, XCircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RsvpChoice = 'accept' | 'tentative' | 'decline'

export interface RsvpSelectorProps {
  value?: RsvpChoice | null
  onChange?: (value: RsvpChoice) => void
  disabled?: boolean
  className?: string
}

export function RsvpSelector({
  value,
  onChange,
  disabled,
  className,
}: RsvpSelectorProps) {
  const options: Array<{
    id: RsvpChoice
    label: string
    sublabel: string
    icon: ReactNode
    activeClass: string
  }> = [
    {
      id: 'accept',
      label: 'Attending',
      sublabel: 'Will be there in person',
      icon: <CheckCircleIcon className="size-5 shrink-0 text-success" />,
      activeClass:
        'border-success bg-success-bg/70 text-success shadow-sm ring-1 ring-success/20',
    },
    {
      id: 'tentative',
      label: 'Tentative',
      sublabel: 'Pending schedule confirmation',
      icon: <ClockIcon className="size-5 shrink-0 text-warning" />,
      activeClass:
        'border-warning bg-warning-bg/70 text-warning shadow-sm ring-1 ring-warning/20',
    },
    {
      id: 'decline',
      label: 'Decline',
      sublabel: 'Unable to attend event',
      icon: <XCircleIcon className="size-5 shrink-0 text-error" />,
      activeClass:
        'border-error bg-error-bg/70 text-error shadow-sm ring-1 ring-error/20',
    },
  ]

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      {options.map((option) => {
        const isSelected = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(option.id)}
            className={cn(
              'group relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition-all duration-200',
              'border-border/80 bg-surface hover:border-border-hover hover:bg-muted/50 active:scale-[0.98]',
              disabled && 'cursor-not-allowed opacity-50',
              isSelected && option.activeClass
            )}
          >
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-surface shadow-2xs transition-transform group-hover:scale-105">
              {option.icon}
            </div>
            <strong className="text-xs font-bold text-foreground">
              {option.label}
            </strong>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {option.sublabel}
            </span>
            {isSelected && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                Selected
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
