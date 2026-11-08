import { useMemo, useState } from 'react'
import { AlertCircleIcon, PlusIcon, UsersIcon } from 'lucide-react'
import type {
  Attendee,
  HeadcountIncreaseRequest,
  Invitation,
} from '@/lib/api'
import {
  AttendeeItem,
  type AttendeeItemProps,
  InsetGroupedList,
  QuotaBar,
} from '@/components/eirmis/portal-cards'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useListAttendees } from '@/features/organizer/hooks/use-list-attendees'
import { useListHeadcountRequests } from '@/features/organizer/hooks/use-list-headcount-requests'
import { AddAttendeeModal } from './add-attendee-modal'
import { HeadcountRequestModal } from './headcount-request-modal'
import { ResubmitAttendeeModal } from './resubmit-attendee-modal'

const attendeeStatusToItemStatus: Record<
  Attendee['status'],
  NonNullable<AttendeeItemProps['status']>
> = {
  approved: 'confirmed',
  pending: 'pending',
  rejected: 'declined',
}

export function RosterEditor({ invitation }: { invitation: Invitation }) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isHeadcountOpen, setIsHeadcountOpen] = useState(false)
  const [resubmitTarget, setResubmitTarget] = useState<Attendee | null>(null)
  const [localAttendeesById, setLocalAttendeesById] = useState<
    Record<string, Attendee>
  >({})
  const [submittedRequest, setSubmittedRequest] =
    useState<HeadcountIncreaseRequest | null>(null)

  const attendeesQuery = useListAttendees({ invitation_id: invitation.id })
  const headcountQuery = useListHeadcountRequests({
    invitation_id: invitation.id,
  })

  const attendees = useMemo(() => {
    const serverAttendees = (attendeesQuery.data ?? []).filter(
      (attendee) => attendee.invitation_id === invitation.id,
    )
    const mergedById = new Map<string, Attendee>()
    for (const attendee of serverAttendees) {
      const local = localAttendeesById[attendee.id]
      if (local && attendee.status === 'rejected' && local.status === 'pending') {
        mergedById.set(attendee.id, local)
      } else {
        mergedById.set(attendee.id, attendee)
      }
    }
    for (const local of Object.values(localAttendeesById)) {
      if (local.invitation_id === invitation.id && !mergedById.has(local.id)) {
        mergedById.set(local.id, local)
      }
    }
    return Array.from(mergedById.values())
  }, [attendeesQuery.data, invitation.id, localAttendeesById])

  const headcountRequests = (headcountQuery.data ?? [])
    .filter((req) => req.invitation_id === invitation.id)
    .sort(
      (left, right) =>
        new Date(right.requested_at).getTime() -
        new Date(left.requested_at).getTime(),
    )

  const latestHeadcountRequest =
    headcountRequests.find(
      (req) => submittedRequest && req.id === submittedRequest.id,
    ) ??
    submittedRequest ??
    headcountRequests.find((req) => req.status === 'pending') ??
    headcountRequests[0] ??
    null

  const isAtCeiling = attendees.length >= invitation.max_party_size
  const isAccepted = invitation.status === 'accepted'

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4 text-primary" aria-hidden="true" />
              <span>Party Roster</span>
            </CardTitle>
            <CardDescription>
              Your invitation ceiling is{' '}
              <strong className="font-semibold text-foreground">
                {invitation.max_party_size}
              </strong>{' '}
              {invitation.max_party_size === 1 ? 'head' : 'heads'}.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isAtCeiling || !isAccepted}
            onClick={() => setIsAddOpen(true)}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            Add Member
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <QuotaBar
            current={attendees.length}
            max={invitation.max_party_size}
            label="Party Quota"
            unit="heads"
          />

          {!isAccepted && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Accept your invitation RSVP above to add party members or request
              additional headcount.
            </div>
          )}

          {attendeesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : attendeesQuery.isError ? (
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p role="alert" className="text-xs text-destructive">
                We could not load your party roster.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => attendeesQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : attendees.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No party members submitted yet.
            </div>
          ) : (
            <InsetGroupedList>
              {attendees.map((attendee) => (
                <div key={attendee.id} className="bg-surface">
                  <AttendeeItem
                    name={attendee.full_name}
                    role={attendee.is_primary ? 'Primary Guest' : 'Party Member'}
                    email={attendee.email ?? undefined}
                    status={attendeeStatusToItemStatus[attendee.status]}
                  />
                  {attendee.checked_in && (
                    <div className="flex items-center justify-between border-t border-border/40 bg-emerald-500/5 px-4 py-2 text-xs">
                      <span className="text-muted-foreground">
                        Checked in at venue
                      </span>
                      <Badge variant="success" size="sm">
                        Pass Used
                      </Badge>
                    </div>
                  )}
                  {attendee.status === 'rejected' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="error" size="sm">
                            Rejected
                          </Badge>
                          <span className="font-medium text-destructive">
                            Requires update
                          </span>
                        </div>
                        {attendee.review_reason && (
                          <p className="text-xs text-muted-foreground">
                            Reason: {attendee.review_reason}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResubmitTarget(attendee)}
                      >
                        Fix &amp; Resubmit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </InsetGroupedList>
          )}

          {isAtCeiling && (
            <div
              role="status"
              className="space-y-3 rounded-xl border border-amber-300/60 bg-amber-500/10 p-4 text-xs"
            >
              <div className="flex items-start gap-2">
                <AlertCircleIcon
                  className="mt-0.5 size-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    Party limit reached (max {invitation.max_party_size}). Need
                    more spots?
                  </p>
                  <p className="text-muted-foreground">
                    You have reached your allocated party ceiling of{' '}
                    {invitation.max_party_size}. Submit a headcount increase
                    request for the organizer to review.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isAccepted}
                onClick={() => setIsHeadcountOpen(true)}
              >
                Request Additional Heads
              </Button>
            </div>
          )}

          {latestHeadcountRequest && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">
                  Headcount request (+
                  {latestHeadcountRequest.requested_additional_heads}{' '}
                  {latestHeadcountRequest.requested_additional_heads === 1
                    ? 'head'
                    : 'heads'}
                  )
                </p>
                {latestHeadcountRequest.note && (
                  <p className="text-muted-foreground">
                    {latestHeadcountRequest.note}
                  </p>
                )}
              </div>
              {latestHeadcountRequest.status === 'pending' ? (
                <Badge variant="warning" size="sm">
                  Request Pending Approval
                </Badge>
              ) : latestHeadcountRequest.status === 'approved' ? (
                <Badge variant="success" size="sm">
                  Approved (Ceiling: {invitation.max_party_size})
                </Badge>
              ) : (
                <Badge variant="error" size="sm">
                  Rejected
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddAttendeeModal
        invitationId={invitation.id}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmitted={(created) =>
          setLocalAttendeesById((current) => ({
            ...current,
            [created.id]: created,
          }))
        }
      />

      <ResubmitAttendeeModal
        attendee={resubmitTarget}
        open={Boolean(resubmitTarget)}
        onOpenChange={(open) => {
          if (!open) setResubmitTarget(null)
        }}
        onResubmitted={(updated) =>
          setLocalAttendeesById((current) => ({
            ...current,
            [updated.id]: updated,
          }))
        }
      />

      <HeadcountRequestModal
        invitationId={invitation.id}
        open={isHeadcountOpen}
        onOpenChange={setIsHeadcountOpen}
        onSubmitted={(request) => setSubmittedRequest(request)}
      />
    </>
  )
}
