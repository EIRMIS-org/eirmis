import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDispatchQrBundle } from "@/features/organizer/hooks/use-dispatch-qr-bundle";
import { useListInvitations } from "@/features/organizer/hooks/use-list-invitations";

interface QrDispatchTabProps {
  eventId: string;
}

export function QrDispatchTab({ eventId }: QrDispatchTabProps) {
  const invitationsQuery = useListInvitations({ event_id: eventId });
  const dispatchQrBundle = useDispatchQrBundle();
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const approvedInvitations = useMemo(
    () =>
        (invitationsQuery.data ?? []).filter(
        (invitation) => invitation.status === "accepted",
        ),
    [invitationsQuery.data],
  );

  const selectedInvitations = approvedInvitations.filter(
    (invitation) => selectedIds[invitation.id],
  );
  const allSelected =
    approvedInvitations.length > 0 &&
    approvedInvitations.every((invitation) => selectedIds[invitation.id]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds({});
      return;
    }

    const next = approvedInvitations.reduce<Record<string, boolean>>(
      (accumulator, invitation) => ({
        ...accumulator,
        [invitation.id]: true,
      }),
      {},
    );
    setSelectedIds(next);
  };

  const toggleInvitation = (invitationId: string) => {
    setSelectedIds((current) => ({
      ...current,
      [invitationId]: !current[invitationId],
    }));
  };

  const handleDispatch = () => {
    const target = selectedInvitations;
    if (target.length === 0) return;

    const payload =
      target.length === 1
        ? { invitation_id: target[0].id }
        : { event_id: eventId };

    dispatchQrBundle.mutate(payload, {
      onSuccess: () => {
        toast.success(
          `QR bundle dispatched for ${target.length} invitation${target.length > 1 ? "s" : ""}`,
        );
        setSelectedIds({});
      },
    });
  };

  const renderTable = () => {
    if (invitationsQuery.isPending) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (invitationsQuery.isError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load approved invitations.
        </div>
      );
    }

    if (approvedInvitations.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No approved invitations are ready for QR dispatch yet.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all approved invitations"
              />
            </TableHead>
            <TableHead>Invitation</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Party size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvedInvitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>
                <Checkbox
                  checked={Boolean(selectedIds[invitation.id])}
                  onCheckedChange={() => toggleInvitation(invitation.id)}
                  aria-label={`Select invitation ${invitation.id}`}
                />
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {invitation.id.slice(0, 8)}
              </TableCell>
              <TableCell>{invitation.guest_id.slice(0, 8)}</TableCell>
              <TableCell>{invitation.status}</TableCell>
              <TableCell>{invitation.max_party_size}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>QR dispatch</CardTitle>
          <CardDescription>
            Select approved invitations and send the bundle to the guest list.
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={handleDispatch}
          disabled={
            selectedInvitations.length === 0 || dispatchQrBundle.isPending
          }
        >
          <Send className="mr-2 h-4 w-4" />
          {dispatchQrBundle.isPending
            ? "Dispatching…"
            : `Dispatch QR${selectedInvitations.length > 0 ? ` (${selectedInvitations.length})` : ""}`}
        </Button>
      </CardHeader>
      <CardContent>{renderTable()}</CardContent>
    </Card>
  );
}
