import { AlertCircle, ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTab } from "@/features/organizer/components/activity-tab";
import { ApprovalsTab } from "@/features/organizer/components/approvals-tab";
import { CheckInTab } from "@/features/organizer/components/checkin-tab";
import { EditEventDialog } from "@/features/organizer/components/edit-event-dialog";
import { GuestsTab } from "@/features/organizer/components/guests-tab";
import { InvitationDesignTab } from "@/features/organizer/components/invitation-design-tab";
import { QrDispatchTab } from "@/features/organizer/components/qr-dispatch-tab";
import { RemindersTab } from "@/features/organizer/components/reminders-tab";
import { useListEvents } from "@/features/organizer/hooks/use-list-events";
import { useListInvitations } from "@/features/organizer/hooks/use-list-invitations";
import type { Event } from "@/lib/api";

const TAB_VALUES = [
  "guests",
  "approvals",
  "qr",
  "reminders",
  "design",
  "checkin",
  "activity",
] as const;

type WorkspaceTab = (typeof TAB_VALUES)[number];

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return value !== null && TAB_VALUES.includes(value as WorkspaceTab);
}

function statusBadgeVariant(status: Event["status"]) {
  switch (status) {
    case "published":
      return "success" as const;
    case "draft":
      return "warning" as const;
    case "closed":
      return "secondary" as const;
    case "archived":
      return "outline" as const;
  }
}

function formatStartDate(startsAt: string, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(startsAt));
  } catch {
    return new Date(startsAt).toLocaleString();
  }
}

export function EventWorkspacePage() {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const eventsQuery = useListEvents();
  const invitationsQuery = useListInvitations(
    eventId ? { event_id: `eq.${eventId}` } : undefined,
  );

  const event = eventsQuery.data?.find((item) => item.id === eventId);
  const invitedCount = invitationsQuery.data?.length ?? 0;

  const activeTab: WorkspaceTab = isWorkspaceTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as WorkspaceTab)
    : "guests";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  const renderHeaderCard = () => {
    if (eventsQuery.isPending) {
      return (
        <Card aria-label="Loading event details">
          <CardHeader className="gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (eventsQuery.isError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div
              role="alert"
              className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Unable to load event details.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void eventsQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!event) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Event not found</CardTitle>
            <CardDescription>
              We couldn&apos;t find an event matching ID{" "}
              <span className="font-mono">{eventId}</span>.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardDescription>Event</CardDescription>
              <CardTitle className="mt-1 text-2xl">{event.title}</CardTitle>
              {event.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={statusBadgeVariant(event.status)}
                className="capitalize"
              >
                {event.status}
              </Badge>
              <Badge variant="secondary">
                Capacity {event.capacity.toLocaleString()}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit event
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                Start
              </p>
              <p className="mt-1 font-medium text-foreground">
                {formatStartDate(event.starts_at, event.event_timezone)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                Timezone
              </p>
              <p className="mt-1 font-medium text-foreground">
                {event.event_timezone}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                Guests
              </p>
              <p className="mt-1 font-medium text-foreground">
                {invitationsQuery.isPending
                  ? "Loading…"
                  : `${invitedCount} invited`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/organizer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to events
            </Link>
          </div>
          <Badge variant="secondary">Event workspace</Badge>
        </div>

        {renderHeaderCard()}

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="qr">QR dispatch</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="checkin">Check-in</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="guests" className="space-y-4">
            <GuestsTab eventId={eventId ?? ""} />
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <ApprovalsTab
              eventId={eventId ?? ""}
              capacity={event?.capacity}
            />
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <QrDispatchTab eventId={eventId ?? ""} />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <RemindersTab eventId={eventId ?? ""} />
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <InvitationDesignTab eventId={eventId ?? ""} />
          </TabsContent>

          <TabsContent value="checkin" className="space-y-4">
            <CheckInTab eventId={eventId ?? ""} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityTab eventId={eventId ?? ""} />
          </TabsContent>
        </Tabs>
      </div>

      {event && (
        <EditEventDialog
          event={event}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}
    </main>
  );
}
