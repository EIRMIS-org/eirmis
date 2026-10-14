import * as React from 'react'
import { X, LogOut, LogIn, ChevronRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PortalItem {
  id: string
  label: string
  href?: string
}

export interface UserSession {
  name: string
  role?: string
  initials?: string
  avatarUrl?: string
}

export interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  activePortal?: string
  onPortalSelect?: (id: string) => void
  portals?: PortalItem[]
  user?: UserSession | null
  onSignOut?: () => void
  onSignIn?: () => void
  className?: string
}

export const DEFAULT_PORTALS: PortalItem[] = [
  { id: 'hub', label: 'Public Hub', href: '#' },
  { id: 'organizer', label: 'Organizer Portal', href: '#' },
  { id: 'admin', label: 'Admin Portal', href: '#' },
  { id: 'guest', label: 'Guest Portal', href: '#' },
  { id: 'staff', label: 'Staff Scanner', href: '#' },
]

export function MobileDrawer({
  isOpen,
  onClose,
  activePortal = 'hub',
  onPortalSelect,
  portals = DEFAULT_PORTALS,
  user = null,
  onSignOut,
  onSignIn,
  className,
}: MobileDrawerProps) {
  // Prevent background scrolling when open
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        aria-hidden={!isOpen}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Slide-in Drawer */}
      <aside
        aria-modal="true"
        role="dialog"
        aria-hidden={!isOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Drawer Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-900 text-white shadow-xs">
              <Layers className="size-4" />
            </div>
            <span className="font-heading font-extrabold text-sm tracking-tight text-foreground">
              Menu
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Portals Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Portals
          </div>
          <nav className="flex flex-col gap-1">
            {portals.map((portal) => {
              const isActive = activePortal === portal.id
              return (
                <button
                  key={portal.id}
                  type="button"
                  onClick={() => {
                    onPortalSelect?.(portal.id)
                    onClose()
                  }}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span>{portal.label}</span>
                  <ChevronRight
                    className={cn(
                      'size-3.5 transition-transform group-hover:translate-x-0.5',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  />
                </button>
              )
            })}
          </nav>
        </div>

        {/* Drawer Footer (User Session / Auth) */}
        <div className="border-t border-border p-3">
          {user ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-900 text-[11px] font-bold text-white shadow-xs">
                  {user.initials || user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user.name}
                  </p>
                  {user.role && (
                    <span className="inline-block rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-primary">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onSignOut()
                    onClose()
                  }}
                  title="Sign out"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="size-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSignIn?.()
                onClose()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary-hover transition-colors"
            >
              <LogIn className="size-3.5" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
