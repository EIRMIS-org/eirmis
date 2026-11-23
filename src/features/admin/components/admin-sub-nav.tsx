import { NavLink } from 'react-router-dom'
import { ScrollText, Settings, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const ADMIN_NAV_ITEMS = [
    {
        to: '/admin',
        label: 'Verification queue',
        icon: ShieldCheck,
        end: true,
    },
    {
        to: '/admin/audit-log',
        label: 'Audit log',
        icon: ScrollText,
        end: false,
    },
    {
        to: '/admin/settings',
        label: 'Settings',
        icon: Settings,
        end: false,
    },
] as const

export function AdminSubNav() {
    return (
        <div className="border-b border-border bg-surface/60">
            <nav
                aria-label="Admin portal navigation"
                className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2.5 sm:px-6"
            >
                {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            cn(
                                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                                isActive
                                    ? 'border border-primary/25 bg-primary/10 text-primary shadow-2xs'
                                    : 'border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                            )
                        }
                    >
                        <Icon className="size-3.5" aria-hidden="true" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
