import * as React from 'react'
import { X, LogOut, LogIn, ChevronRight, Layers, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SESSION_ROLE_OPTIONS,
  type AuthenticatedRole,
} from '@/app/providers/session-profiles'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEFAULT_PORTALS, type PortalItem } from './portal-constants'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getIdentityLabel(role?: string): string | undefined {
  return SESSION_ROLE_OPTIONS.find((option) => option.role === role)?.label ?? role
}

export interface UserSession {
  name: string
  role?: string
  initials?: string
  avatarUrl?: string
}

export interface MobileDrawerProps {
  id?: string
  isOpen: boolean
  onClose: () => void
  returnFocusRef?: React.RefObject<HTMLElement | null>
  activePortal?: string
  onPortalSelect?: (id: string) => void
  portals?: PortalItem[]
  user?: UserSession | null
  onIdentitySwitch?: (role: AuthenticatedRole) => void
  onSignOut?: () => void
  onSignIn?: () => void
  className?: string
}

export function MobileDrawer({
  id,
  isOpen,
  onClose,
  returnFocusRef,
  activePortal = 'hub',
  onPortalSelect,
  portals = DEFAULT_PORTALS,
  user = null,
  onIdentitySwitch,
  onSignOut,
  onSignIn,
  className,
}: MobileDrawerProps) {
  const titleId = React.useId()
  const drawerRef = React.useRef<HTMLElement>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null)
  const wasOpenRef = React.useRef(false)

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

  // Move focus into drawer on open and restore focus on close
  React.useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        previousActiveElementRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
      }
      wasOpenRef.current = true
      closeButtonRef.current?.focus()
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false
      const returnTarget = returnFocusRef?.current ?? previousActiveElementRef.current
      returnTarget?.focus()
    }
  }, [isOpen, returnFocusRef])

  // Close on Escape key & trap Tab focus inside drawer
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement as HTMLElement | null

        if (e.shiftKey) {
          if (!active || active === first || !drawerRef.current.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else if (!active || active === last || !drawerRef.current.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Slide-in Drawer */}
      <aside
        ref={drawerRef}
        id={id}
        aria-modal="true"
        role="dialog"
        aria-labelledby={titleId}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-300 ease-out',
          className
        )}
      >
        {/* Drawer Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-900 text-white shadow-xs">
              <Layers className="size-4" aria-hidden="true" />
            </div>
            <h2
              id={titleId}
              className="m-0 font-heading font-extrabold text-sm tracking-tight text-foreground"
            >
              Menu
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Portals Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Portals
          </div>
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {portals.map((portal) => {
              const isActive = activePortal === portal.id
              return (
                <button
                  key={portal.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    onPortalSelect?.(portal.id)
                    onClose()
                  }}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span>{portal.label}</span>
                  <ChevronRight
                    aria-hidden="true"
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
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-muted/40 p-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-900 text-[11px] font-bold text-white shadow-xs">
                  {user.initials || user.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {user.name}
                  </span>
                  {user.role && (
                    <span className="inline-block rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-primary">
                      {getIdentityLabel(user.role)}
                    </span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Open session menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel>
                  {onIdentitySwitch ? 'Switch identity' : 'Signed in'}
                </DropdownMenuLabel>
                {onIdentitySwitch && SESSION_ROLE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.role}
                    onClick={() => {
                      onIdentitySwitch?.(option.role)
                      onClose()
                    }}
                  >
                    <span className="flex-1">{option.label}</span>
                    {user.role === option.role && (
                      <Check className="size-3.5 text-primary" aria-hidden="true" />
                    )}
                  </DropdownMenuItem>
                ))}
                {onSignOut && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        onSignOut()
                        onClose()
                      }}
                    >
                      <LogOut className="size-3.5" aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSignIn?.()
                onClose()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <LogIn className="size-3.5" aria-hidden="true" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
