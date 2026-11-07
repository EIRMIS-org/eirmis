import { ArrowLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalsTab } from "@/features/organizer/components/approvals-tab";
import { GuestsTab } from "@/features/organizer/components/guests-tab";

/**
 * Task 07 — Organizer Portal: this page is the event workspace shell for the
 * guest, approval, and QR tabs. The tab state is kept in the URL so the active
 * view stays stable after refresh and matches the task requirement for
 * deep-linkable organizer screens.
 */
const TAB_VALUES = ["guests", "approvals", "qr"] as const;

type WorkspaceTab = (typeof TAB_VALUES)[number];

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return value !== null && TAB_VALUES.includes(value as WorkspaceTab);
}

export function EventWorkspacePage() {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = isWorkspaceTab(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "guests";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
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

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardDescription>Event</CardDescription>
                <CardTitle className="mt-1 text-2xl">
                  {eventId ? `Event ${eventId}` : "Event workspace"}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Draft</Badge>
                <Badge variant="secondary">Capacity 120</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                  Start
                </p>
                <p className="mt-1 font-medium text-foreground">Nov 18, 2026</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                  Timezone
                </p>
                <p className="mt-1 font-medium text-foreground">
                  America/New_York
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                  Guests
                </p>
                <p className="mt-1 font-medium text-foreground">42 invited</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="qr">QR dispatch</TabsTrigger>
          </TabsList>

          <TabsContent value="guests" className="space-y-4">
            <GuestsTab eventId={eventId ?? ""} />
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <ApprovalsTab eventId={eventId ?? ""} capacity={120} />
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>QR dispatch</CardTitle>
                <CardDescription>
                  Approved invitations can be bundled and sent here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This tab is reserved for multi-select QR bundle dispatch.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
