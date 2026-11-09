import { ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Event } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface EventsTableProps {
  events: Event[]
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusVariant(status: Event['status']) {
  switch (status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'warning'
    case 'closed':
      return 'secondary'
    case 'archived':
      return 'outline'
  }
}

export function EventsTable({ events }: EventsTableProps) {
  const navigate = useNavigate()
  const largestCapacity = Math.max(...events.map((event) => event.capacity), 1)

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            All events
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Event</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="min-w-52">Capacity</TableHead>
            <TableHead className="text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const relativeCapacity = Math.round(
              (event.capacity / largestCapacity) * 100,
            )

            return (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="font-semibold text-foreground">
                    {event.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {event.venue_name || event.city || 'Location not set'}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatEventDate(event.starts_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(event.status)}>
                    {event.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium tabular-nums text-foreground">
                      {event.capacity.toLocaleString()} seats
                    </span>
                    <span className="text-muted-foreground">
                      {relativeCapacity}% of largest
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${event.capacity} seat capacity, ${relativeCapacity}% of your largest event`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${relativeCapacity}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/organizer/events/${encodeURIComponent(event.id)}`)
                    }
                  >
                    Manage
                    <ArrowUpRight aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
