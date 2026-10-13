import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface SettingsSectionProps {
  title: string
  description?: string
  badge?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function SettingsSection({
  title,
  description,
  badge,
  children,
  footer,
  className,
}: SettingsSectionProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start',
        className
      )}
    >
      {/* Left Column: Heading and explanation */}
      <div className="space-y-1.5 lg:col-span-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-sm font-bold text-foreground">
            {title}
          </h3>
          {badge && (
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Right Column: Settings Card with controls and divider list */}
      <Card className="rounded-2xl border-border bg-white shadow-xs lg:col-span-8">
        <CardContent className="divide-y divide-border/60 p-5 sm:p-6">
          {children}
        </CardContent>
        {footer && (
          <div className="flex items-center justify-between border-t border-border/60 bg-slate-50/70 px-5 py-3 sm:px-6 rounded-b-2xl text-xs">
            {footer}
          </div>
        )}
      </Card>
    </div>
  )
}
