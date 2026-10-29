export interface PortalItem {
  id: string
  label: string
  href?: string
}

export const DEFAULT_PORTALS: PortalItem[] = [
  { id: 'hub', label: 'Public Hub', href: '#' },
  { id: 'organizer', label: 'Organizer Portal', href: '#' },
  { id: 'admin', label: 'Admin Portal', href: '#' },
  { id: 'guest', label: 'Guest Portal', href: '#' },
  { id: 'staff', label: 'Staff Scanner', href: '#' },
]
