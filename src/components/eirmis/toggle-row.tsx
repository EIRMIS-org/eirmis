import React from 'react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export interface ToggleRowProps {
  id?: string
  title: string
  description?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  badge?: string
  className?: string
}

export function ToggleRow({
  id,
  title,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  badge,
  className,
}: ToggleRowProps) {
  const switchId = id || React.useId()

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0',
        disabled && 'opacity-60',
        className
      )}
    >
      <div className="flex-1 space-y-0.5 pr-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor={switchId}
            className="cursor-pointer text-xs font-semibold text-foreground"
          >
            {title}
          </label>
          {badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-normal">
            {description}
          </p>
        )}
      </div>

      <Switch
        id={switchId}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}
