import * as React from 'react'
import { Menu, LogIn, Layers, ChevronDown, Check, LogOut } from 'lucide-react'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MobileDrawer,
  type UserSession,
} from './mobile-drawer'
import { DEFAULT_PORTALS, type PortalItem } from './portal-constants'

function getIdentityLabel(role?: string): string | undefined {
  return SESSION_ROLE_OPTIONS.find((option) => option.role === role)?.label ?? role
}

export interface GlobalNavProps {
  activePortal?: string
  onPortalSelect?: (id: string) => void
  portals?: PortalItem[]
  user?: UserSession | null
  onIdentitySwitch?: (role: AuthenticatedRole) => void
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
  onIdentitySwitch,
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
              <DropdownMenu>
                <DropdownMenuTrigger className="hidden sm:flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pr-2.5 pl-1.5 shadow-xs hover:bg-muted/60">
                  <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-900 text-[10px] font-bold text-white shadow-xs">
                    {user.initials || user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="max-w-[120px] truncate text-xs font-semibold text-foreground">
                    {user.name}
                  </span>
                  {user.role && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-primary">
                      {getIdentityLabel(user.role)}
                    </span>
                  )}
                  <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">Open session menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuLabel>
                    {onIdentitySwitch ? 'Switch identity' : 'Signed in'}
                    <span className="mt-0.5 block truncate font-normal text-muted-foreground">
                      {user.name}
                    </span>
                  </DropdownMenuLabel>
                  {onIdentitySwitch && SESSION_ROLE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.role}
                      onClick={() => onIdentitySwitch?.(option.role)}
                    >
                      <span className="flex-1">{option.label}</span>
                      {user.role === option.role && (
                        <Check className="size-3.5 text-primary" aria-hidden="true" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {onSignOut && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={onSignOut}
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
        onIdentitySwitch={onIdentitySwitch}
        onSignOut={onSignOut}
        onSignIn={onSignIn}
      />
    </>
  )
}
