import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDecideAttendee } from "@/features/organizer/hooks/use-decide-attendee";
import { useListAttendees } from "@/features/organizer/hooks/use-list-attendees";
import { useListInvitations } from "@/features/organizer/hooks/use-list-invitations";
import type { Attendee } from "@/lib/api";

interface ApprovalsTabProps {
  eventId: string;
  capacity?: number;
}

interface OverrideState {
  attendee: Attendee;
  decision: "approve" | "reject";
}

export function ApprovalsTab({ eventId, capacity = 120 }: ApprovalsTabProps) {
  const invitationsQuery = useListInvitations({ event_id: eventId });
  const attendeesQuery = useListAttendees();
  const decideAttendee = useDecideAttendee();

  const [reviewReasonById, setReviewReasonById] = useState<
    Record<string, string>
  >({});
  const [overrideTarget, setOverrideTarget] = useState<OverrideState | null>(
    null,
  );

  const invitationIds = useMemo(
    () =>
      new Set((invitationsQuery.data ?? []).map((invitation) => invitation.id)),
    [invitationsQuery.data],
  );

  const eventAttendees = useMemo(
    () =>
      (attendeesQuery.data ?? [])
        .filter((attendee) => invitationIds.has(attendee.invitation_id))
        .sort(
          (left, right) =>
            new Date(right.submitted_at).getTime() -
            new Date(left.submitted_at).getTime(),
        ),
    [attendeesQuery.data, invitationIds],
  );

  const approvedCount = eventAttendees.filter(
    (attendee) => attendee.status === "approved",
  ).length;

  const requestDecision = (
    attendee: Attendee,
    decision: "approve" | "reject",
  ) => {
    const reason = reviewReasonById[attendee.id]?.trim();

    const nextApproved =
      decision === "approve" ? approvedCount + 1 : approvedCount;
    if (decision === "approve" && nextApproved > capacity) {
      setOverrideTarget({ attendee, decision });
      return;
    }

    decideAttendee.mutate({
      id: attendee.id,
      body: {
        decision,
        reason: reason || null,
      },
    });
  };

  const confirmOverride = () => {
    if (!overrideTarget) return;

    const reason = reviewReasonById[overrideTarget.attendee.id]?.trim();
    decideAttendee.mutate({
      id: overrideTarget.attendee.id,
      body: {
        decision: overrideTarget.decision,
        reason: reason || null,
      },
    });
    setOverrideTarget(null);
  };

  const renderQueue = () => {
    if (invitationsQuery.isPending || attendeesQuery.isPending) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (invitationsQuery.isError || attendeesQuery.isError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load the attendee queue.
        </div>
      );
    }

    if (eventAttendees.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No attendees are waiting for review for this event yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {eventAttendees.map((attendee) => {
          const statusTone =
            attendee.status === "approved"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
              : attendee.status === "rejected"
                ? "bg-red-500/10 text-red-700 border-red-200"
                : "bg-amber-500/10 text-amber-700 border-amber-200";

          return (
            <Card key={attendee.id} className="border-border/80">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {attendee.full_name}
                    </CardTitle>
                    {attendee.is_primary ? (
                      <Badge variant="secondary">Primary</Badge>
                    ) : null}
                  </div>
                  <CardDescription>
                    {attendee.email ?? "No email recorded"}
                  </CardDescription>
                </div>
                <Badge className={statusTone} variant="outline">
                  {attendee.status}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                      Submitted
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {new Date(attendee.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                      Invitation
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {attendee.invitation_id.slice(0, 8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                      Walk-in
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {attendee.is_walk_in ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Review note
                  </label>
                  <Textarea
                    value={
                      reviewReasonById[attendee.id] ??
                      attendee.review_reason ??
                      ""
                    }
                    onChange={(event) =>
                      setReviewReasonById((current) => ({
                        ...current,
                        [attendee.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional note for the approval or rejection decision"
                    className="min-h-22.5"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-emerald-700 hover:bg-emerald-500/10"
                    onClick={() => requestDecision(attendee, "approve")}
                    disabled={decideAttendee.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-red-700 hover:bg-red-500/10"
                    onClick={() => requestDecision(attendee, "reject")}
                    disabled={decideAttendee.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  {attendee.status === "approved" && (
                    <span className="ml-auto inline-flex items-center gap-2 text-xs text-emerald-700">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Approved for check-in
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Attendee approvals</CardTitle>
            <CardDescription>
              Review guest-party registrations for this event and decide each
              one.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            {approvedCount}/{capacity} approved
          </div>
        </CardHeader>
        <CardContent>{renderQueue()}</CardContent>
      </Card>

      <Dialog
        open={Boolean(overrideTarget)}
        onOpenChange={(open) => {
          if (!open) setOverrideTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Capacity override confirmation</DialogTitle>
            <DialogDescription>
              Approving {overrideTarget?.attendee.full_name ?? "this attendee"}{" "}
              would take the event beyond the configured capacity of {capacity}.
              This action is still recorded as an audited override.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">
              Current approved total: {approvedCount}
            </p>
            <p className="mt-1">
              After approval, the total would be {approvedCount + 1}.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOverrideTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmOverride}>
              Confirm override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
