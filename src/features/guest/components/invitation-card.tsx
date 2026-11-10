import { CalendarDaysIcon, ChevronRightIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Invitation } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const statusLabels: Record<Invitation['status'], string> = {
  pending: 'Awaiting response',
  accepted: 'Accepted',
  declined: 'Declined',
  tentative: 'Tentative',
  waitlisted: 'Waitlisted',
}

export function InvitationCard({
  invitation,
}: {
  invitation: Invitation
}) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Invitation
            </p>
            <h2 className="truncate text-lg font-semibold">
              Your invitation
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
            <span>Open to view event details</span>
          </div>
          <Badge variant="outline">{statusLabels[invitation.status]}</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open invitation"
          onClick={() => navigate(`/guest/invitations/${invitation.id}`)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  )
}
