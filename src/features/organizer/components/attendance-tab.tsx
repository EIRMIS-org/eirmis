import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useListAttendees } from "@/features/organizer/hooks/use-list-attendees";
import { useListInvitations } from "@/features/organizer/hooks/use-list-invitations";
import { eq, inList } from "@/lib/api";

/**
 * 30s live polling interval for organizer attendance dashboard queries,
 * aligned with the check-in staff attendance summary.
 */
export const ATTENDANCE_REFETCH_INTERVAL_MS = 30_000;

export interface AttendanceTabProps {
  eventId: string;
}

export function AttendanceTab({ eventId }: AttendanceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const invitationsQuery = useListInvitations(
    { event_id: eq(eventId) },
    { refetchInterval: ATTENDANCE_REFETCH_INTERVAL_MS },
  );
  const invitations = useMemo(
    () => invitationsQuery.data ?? [],
    [invitationsQuery.data],
  );
  const invitationIdList = useMemo(
    () => invitations.map((invitation) => invitation.id),
    [invitations],
  );
  const attendeesQuery = useListAttendees(
    invitationIdList.length > 0
      ? { invitation_id: inList(invitationIdList) }
      : undefined,
    {
      enabled: invitationIdList.length > 0,
      refetchInterval: ATTENDANCE_REFETCH_INTERVAL_MS,
    },
  );

  const invitationById = useMemo(
    () =>
      new Map(invitations.map((invitation) => [invitation.id, invitation])),
    [invitations],
  );

  const eventAttendees = useMemo(
    () =>
      (attendeesQuery.data ?? []).filter((attendee) =>
        invitationById.has(attendee.invitation_id),
      ),
    [attendeesQuery.data, invitationById],
  );

  const expectedCount = useMemo(
    () =>
      invitations.reduce(
        (sum, invitation) =>
          invitation.status === "accepted" ? sum + invitation.party_size : sum,
        0,
      ),
    [invitations],
  );

  const checkedInCount = useMemo(
    () =>
      eventAttendees.reduce(
        (count, attendee) => (attendee.checked_in ? count + 1 : count),
        0,
      ),
    [eventAttendees],
  );

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const hasSearchFilter = Boolean(normalizedQuery);

  const filteredAttendees = useMemo(() => {
    if (!normalizedQuery) return eventAttendees;
    return eventAttendees.filter((attendee) =>
      [attendee.full_name, attendee.email]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [eventAttendees, normalizedQuery]);

  const isPending = invitationsQuery.isPending || attendeesQuery.isPending;
  const isError = invitationsQuery.isError || attendeesQuery.isError;

  const handleRetry = () => {
    void invitationsQuery.refetch();
    void attendeesQuery.refetch();
  };

  const renderSummaryStrip = () => {
    if (isPending) {
      return (
        <section aria-label="Attendance summary">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </section>
      );
    }

    if (isError) {
      return null;
    }

    return (
      <section aria-label="Attendance summary">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Expected
              </dt>
            </CardHeader>
            <CardContent>
              <dd
                data-testid="attendance-expected-count"
                className="font-heading text-3xl font-bold tabular-nums text-foreground"
              >
                {expectedCount}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirmed party size across accepted invitations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Checked-in
              </dt>
            </CardHeader>
            <CardContent>
              <dd
                data-testid="attendance-checked-in-count"
                className="font-heading text-3xl font-bold tabular-nums text-primary"
              >
                {checkedInCount}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                Attendees scanned or checked in at the venue
              </p>
            </CardContent>
          </Card>
        </dl>
      </section>
    );
  };

  const renderFeedState = () => {
    if (isPending) {
      return (
        <div className="space-y-2" aria-label="Loading attendance feed">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load live attendance data.
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (eventAttendees.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No attendees yet — approvals will populate this view
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Attendee</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>Check-in status</TableHead>
            <TableHead>Checked in at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAttendees.map((attendee) => {
            const invitation = invitationById.get(attendee.invitation_id);
            const partySize = invitation?.party_size ?? 1;

            return (
              <TableRow key={attendee.id}>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {attendee.full_name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {attendee.email ?? "No email"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>Party of {partySize}</span>
                    {attendee.is_primary && (
                      <Badge variant="secondary" size="sm">
                        Primary
                      </Badge>
                    )}
                    {attendee.is_walk_in && (
                      <Badge variant="outline" size="sm">
                        Walk-in
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={attendee.checked_in ? "success" : "outline"}>
                    {attendee.checked_in ? "Checked in" : "Not checked in"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {attendee.checked_in_at
                    ? new Date(attendee.checked_in_at).toLocaleString()
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
          {filteredAttendees.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No attendees match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4">
      {renderSummaryStrip()}

      <Card>
        <CardHeader>
          <CardTitle>Check-in feed</CardTitle>
          <CardDescription>
            Live attendance roster for this event (refreshes every 30 seconds).
          </CardDescription>
          {!isPending && !isError && (
            <p className="mt-1 text-xs text-muted-foreground">
              {eventAttendees.length}{" "}
              {eventAttendees.length === 1 ? "attendee" : "attendees"}
              {hasSearchFilter ? ` (${filteredAttendees.length} matching)` : ""}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="search"
            aria-label="Filter event attendance"
            className="relative"
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or email"
              aria-label="Search attendees by name or email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="pl-9"
            />
          </div>
          {renderFeedState()}
        </CardContent>
      </Card>
    </div>
  );
}
