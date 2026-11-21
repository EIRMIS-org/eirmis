import { AlertCircle, Pencil, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
import { FormRow, invitationOrganizerUpdateResolver } from "@/lib/forms";
import { invitationOrganizerUpdateSchema } from "@/lib/forms/schemas/invitation";
import { AddInvitationDialog } from "./add-invitation-dialog";

type InvitationEditInput = z.input<typeof invitationOrganizerUpdateSchema>;

export interface GuestsTabProps {
  eventId: string;
}

export function GuestsTab({ eventId }: GuestsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    updateInvitation.mutate(
      {
        id: editingInvitation.id,
        body: values,
      },
      {
        onSuccess: () => {
          setEditingInvitation(null);
        },
      },
    );
  };

  const guests = guestsQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const invitationByGuestId = new Map(
    invitations.map((invitation) => [invitation.guest_id, invitation]),
  );
  const eventGuests = guests.filter((guest) =>
    invitationByGuestId.has(guest.id),
  );

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
          {eventGuests.map((guest) => {
            const invitation = invitationByGuestId.get(guest.id);

            return (
              <TableRow key={guest.id}>
                <TableCell className="font-medium text-foreground">
                  {guest.full_name ?? "Guest"}
                </TableCell>
                <TableCell>{guest.email ?? "No email"}</TableCell>
                <TableCell>{invitation?.status ?? "not invited"}</TableCell>
                <TableCell>{invitation?.max_party_size ?? 1}</TableCell>
              </TableRow>
            );
          })}
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
            <TableHead>Invitation</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Max party</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium text-foreground">
                {invitation.id.slice(0, 8)}
              </TableCell>
              <TableCell>{invitation.guest_id ?? "Unknown guest"}</TableCell>
              <TableCell>{invitation.status ?? "pending"}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Guest roster</CardTitle>
            <CardDescription>
              People invited to this event and their current status.
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Invitation
          </Button>
        </CardHeader>
        <CardContent>{renderGuestsState()}</CardContent>
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
