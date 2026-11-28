import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useListGuests } from "@/features/organizer/hooks/use-list-guests";
import { useListInvitations } from "@/features/organizer/hooks/use-list-invitations";
import { useUpdateInvitation } from "@/features/organizer/hooks/use-update-invitation";
import type { Invitation, InvitationOrganizerUpdate } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { downloadCSV } from "@/lib/csv-export";
import { FormRow, invitationOrganizerUpdateResolver } from "@/lib/forms";
import { invitationOrganizerUpdateSchema } from "@/lib/forms/schemas/invitation";
import { AddInvitationDialog } from "./add-invitation-dialog";

type InvitationEditInput = z.input<typeof invitationOrganizerUpdateSchema>;

const GUESTS_CSV_HEADERS = ["Name", "Email", "Status", "Max party"] as const;

function statusVariant(status?: Invitation["status"] | "not invited") {
  switch (status) {
    case "accepted":
      return "success" as const;
    case "pending":
    case "waitlisted":
      return "warning" as const;
    case "tentative":
      return "info" as const;
    case "declined":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export interface GuestsTabProps {
  eventId: string;
}

export function GuestsTab({ eventId }: GuestsTabProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingInvitation, setEditingInvitation] =
    useState<Invitation | null>(null);

  const guestsQuery = useListGuests();
  const invitationsQuery = useListInvitations({ event_id: `eq.${eventId}` });
  const updateInvitation = useUpdateInvitation();

  const editForm = useForm<
    InvitationEditInput,
    unknown,
    InvitationOrganizerUpdate
  >({
    resolver: invitationOrganizerUpdateResolver,
    defaultValues: {
      max_party_size: 1,
      status: "pending",
    },
  });

  useEffect(() => {
    if (!editingInvitation) return;
    editForm.reset({
      max_party_size: editingInvitation.max_party_size,
      status: editingInvitation.status,
    });
  }, [editForm, editingInvitation]);

  const handleEditSubmit = (values: InvitationOrganizerUpdate) => {
    if (!editingInvitation) return;
    const targetId = editingInvitation.id;
    updateInvitation.mutate(
      {
        id: targetId,
        body: values,
      },
      {
        onSuccess: (updated) => {
          queryClient.setQueriesData<Invitation[]>(
            { queryKey: qk.listInvitationsPrefix() },
            (current) =>
              current?.map((item) =>
                item.id === targetId
                  ? { ...item, ...(updated ?? {}), ...values }
                  : item,
              ),
          );
          setEditingInvitation(null);
        },
      },
    );
  };

  const guests = useMemo(() => guestsQuery.data ?? [], [guestsQuery.data]);
  const invitations = useMemo(
    () => invitationsQuery.data ?? [],
    [invitationsQuery.data],
  );

  const invitationByGuestId = useMemo(
    () =>
      new Map(
        invitations.map((invitation) => [invitation.guest_id, invitation]),
      ),
    [invitations],
  );

  const guestsByGuestId = useMemo(
    () => new Map(guests.map((guest) => [guest.id, guest])),
    [guests],
  );

  const eventGuests = useMemo(
    () => guests.filter((guest) => invitationByGuestId.has(guest.id)),
    [guests, invitationByGuestId],
  );

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const hasSearchFilter = Boolean(normalizedQuery);

  const filteredGuests = useMemo(() => {
    if (!normalizedQuery) return eventGuests;
    return eventGuests.filter((guest) =>
      [guest.full_name, guest.email]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [eventGuests, normalizedQuery]);

  const filteredInvitations = useMemo(() => {
    if (!normalizedQuery) return invitations;
    return invitations.filter((invitation) => {
      const guest = guestsByGuestId.get(invitation.guest_id);
      return [guest?.full_name, guest?.email]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [invitations, guestsByGuestId, normalizedQuery]);

  const handleExportCsv = () => {
    if (filteredGuests.length === 0) return;
    const rows = filteredGuests.map((guest) => {
      const invitation = invitationByGuestId.get(guest.id);
      return [
        guest.full_name ?? "Guest",
        guest.email ?? "No email",
        invitation?.status ?? "not invited",
        invitation?.max_party_size ?? 1,
      ];
    });
    downloadCSV(`event-${eventId}-guests`, GUESTS_CSV_HEADERS, rows);
  };

  const renderGuestsState = () => {
    if (guestsQuery.isPending) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (guestsQuery.isError) {
      return (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load guest roster.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => guestsQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (eventGuests.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No guests found for this event yet.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Invitation status</TableHead>
            <TableHead>Max party</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredGuests.map((guest) => {
            const invitation = invitationByGuestId.get(guest.id);
            const status = invitation?.status ?? "not invited";

            return (
              <TableRow key={guest.id}>
                <TableCell className="font-medium text-foreground">
                  {guest.full_name ?? "Guest"}
                </TableCell>
                <TableCell>{guest.email ?? "No email"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(status)}>{status}</Badge>
                </TableCell>
                <TableCell>{invitation?.max_party_size ?? 1}</TableCell>
              </TableRow>
            );
          })}
          {filteredGuests.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No guests match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  const renderInvitationsState = () => {
    if (invitationsQuery.isPending) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (invitationsQuery.isError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load invitations.
        </div>
      );
    }

    if (invitations.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          No invitations created yet.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Max party</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredInvitations.map((invitation) => {
            const guest = guestsByGuestId.get(invitation.guest_id);
            const status = invitation.status ?? "pending";

            return (
              <TableRow key={invitation.id}>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {guest?.full_name ?? "Guest"}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {invitation.id.slice(0, 8)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(status)}>{status}</Badge>
                </TableCell>
                <TableCell>{invitation.max_party_size ?? 1}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingInvitation(invitation)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {filteredInvitations.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No invitations match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Guest roster</CardTitle>
            <CardDescription>
              People invited to this event and their current status.
            </CardDescription>
            {!guestsQuery.isPending && !guestsQuery.isError && (
              <p className="mt-1 text-xs text-muted-foreground">
                {eventGuests.length}{" "}
                {eventGuests.length === 1 ? "guest" : "guests"}
                {hasSearchFilter ? ` (${filteredGuests.length} matching)` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportCsv}
              disabled={
                guestsQuery.isPending ||
                guestsQuery.isError ||
                filteredGuests.length === 0
              }
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Invitation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="search"
            aria-label="Filter event guests"
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
              aria-label="Search guests by name or email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="pl-9"
            />
          </div>
          {renderGuestsState()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Recent invitation records created for this event.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderInvitationsState()}</CardContent>
      </Card>

      <AddInvitationDialog
        eventId={eventId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        guestOptions={guests.map((guest) => ({
          id: guest.id,
          full_name: guest.full_name,
          email: guest.email,
        }))}
      />

      <Dialog
        open={Boolean(editingInvitation)}
        onOpenChange={(open) => {
          if (!open) setEditingInvitation(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit invitation</DialogTitle>
            <DialogDescription>
              Update party size limit or status for invitation{" "}
              {editingInvitation?.id.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={editForm.handleSubmit(handleEditSubmit)}
          >
            <FormRow
              id="edit-invitation-party-size"
              label="Max party size"
              type="number"
              min={1}
              error={editForm.formState.errors.max_party_size?.message}
              {...editForm.register("max_party_size", { valueAsNumber: true })}
            />
            <div>
              <Label htmlFor="edit-invitation-status">Status</Label>
              <select
                id="edit-invitation-status"
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...editForm.register("status")}
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="tentative">Tentative</option>
                <option value="waitlisted">Waitlisted</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingInvitation(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  editForm.formState.isSubmitting || updateInvitation.isPending
                }
              >
                {updateInvitation.isPending ? "Saving…" : "Save invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
