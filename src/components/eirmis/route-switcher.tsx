import { CompassIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RouteItem {
  id: string
  label: string
  count?: number
  badge?: string
}

export interface RouteSwitcherProps {
  routes?: RouteItem[]
  activeRoute: string
  onRouteChange?: (id: string) => void
  label?: string
  className?: string
}

const defaultRoutes: RouteItem[] = [
  { id: 'landing', label: 'Public Microsite' },
  { id: 'organizer', label: 'Organizer Portal', count: 12 },
  { id: 'admin', label: 'Admin Governance', count: 4 },
  { id: 'guest', label: 'Guest RSVP' },
  { id: 'staff', label: 'Staff Scanner', badge: 'Live' },
]

export function RouteSwitcher({
  routes = defaultRoutes,
  activeRoute,
  onRouteChange,
  label = 'Portal Route',
  className,
}: RouteSwitcherProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto rounded-2xl border border-border/80 bg-white p-1.5 shadow-xs scrollbar-none',
        className
      )}
    >
      {label && (
        <div className="flex items-center gap-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 select-none">
          <CompassIcon className="size-3.5 text-indigo-500" />
          <span>{label}</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {routes.map((route) => {
          const isActive = activeRoute === route.id
          return (
            <button
              key={route.id}
              type="button"
              onClick={() => onRouteChange?.(route.id)}
              className={cn(
                'group relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150',
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
              )}
            >
              <span>{route.label}</span>
              {route.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-700'
                  )}
                >
                  {route.count}
                </span>
              )}
              {route.badge && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider',
                    isActive
                      ? 'bg-emerald-400 text-slate-900'
                      : 'bg-emerald-100 text-emerald-800'
                  )}
                >
                  {route.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
