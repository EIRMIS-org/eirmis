import * as React from 'react'
import { Menu, LogOut, LogIn, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MobileDrawer,
  type PortalItem,
  type UserSession,
  DEFAULT_PORTALS,
} from './mobile-drawer'

export interface GlobalNavProps {
  activePortal?: string
  onPortalSelect?: (id: string) => void
  portals?: PortalItem[]
  user?: UserSession | null
  onSignOut?: () => void
  onSignIn?: () => void
  brandTitle?: string
  badgeText?: string
  onBrandClick?: () => void
  sticky?: boolean
  className?: string
  // If controlled externally
  isMobileMenuOpen?: boolean
  onMobileMenuToggle?: () => void
}

export function GlobalNav({
  activePortal = 'hub',
  onPortalSelect,
  portals = DEFAULT_PORTALS,
  user = null,
  onSignOut,
  onSignIn,
  brandTitle = 'EIRMIS',
  badgeText = 'PRODUCTION PREVIEW',
  onBrandClick,
  sticky = true,
  className,
  isMobileMenuOpen: externalIsOpen,
  onMobileMenuToggle: externalOnToggle,
}: GlobalNavProps) {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false)

  const isDrawerOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const handleToggle = externalOnToggle !== undefined ? externalOnToggle : () => setInternalIsOpen((v) => !v)
  const handleClose = externalOnToggle !== undefined ? externalOnToggle : () => setInternalIsOpen(false)

  return (
    <>
      <header
        className={cn(
          'w-full border-b border-border bg-surface/85 backdrop-blur-md transition-colors',
          sticky ? 'sticky top-0 z-40' : 'relative',
          className
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Brand / Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBrandClick}
              className="flex items-center gap-2.5 text-left focus:outline-hidden"
            >
              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-900 text-white shadow-xs transition-transform hover:scale-105">
                <Layers className="size-4.5" />
              </div>
              <span className="font-heading text-base font-extrabold tracking-tight text-foreground">
                {brandTitle}
              </span>
            </button>
            {badgeText && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary select-none">
                {badgeText}
              </span>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {portals.map((portal) => {
              const isActive = activePortal === portal.id
              return (
                <button
                  key={portal.id}
                  type="button"
                  onClick={() => onPortalSelect?.(portal.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150',
                    isActive
                      ? 'border border-primary/25 bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {portal.label}
                </button>
              )
            })}
          </nav>

          {/* Right Session Pill & Mobile Hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="hidden sm:flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pr-3 pl-1.5 shadow-xs">
                <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-900 text-[10px] font-bold text-white shadow-xs">
                  {user.initials || user.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">
                  {user.name}
                </span>
                {user.role && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-primary">
                    {user.role}
                  </span>
                )}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    title="Sign out"
                    className="ml-0.5 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary-hover transition-colors"
              >
                <LogIn className="size-3.5" />
                <span>Sign in</span>
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={handleToggle}
              aria-label="Toggle navigation menu"
              className="flex md:hidden size-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-over Drawer for Mobile */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={handleClose}
        activePortal={activePortal}
        onPortalSelect={onPortalSelect}
        portals={portals}
        user={user}
        onSignOut={onSignOut}
        onSignIn={onSignIn}
      />
    </>
  )
}
