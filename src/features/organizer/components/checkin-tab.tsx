import {
  AlertCircle,
  Ban,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateCheckInAssignment,
  useDeleteCheckInAssignment,
  useUpdateCheckInAssignment,
} from "@/features/organizer/hooks/use-checkin-assignment-mutations";
import { useListCheckInAssignments } from "@/features/organizer/hooks/use-list-checkin-assignments";
import { checkInAssignmentCreateResolver, FormRow } from "@/lib/forms";
import { checkInAssignmentCreateSchema } from "@/lib/forms/schemas/checkin-assignment";

type AssignmentRow = NonNullable<
  ReturnType<typeof useListCheckInAssignments>["data"]
>[number];

type AssignmentCreateInput = z.input<typeof checkInAssignmentCreateSchema>;
type AssignmentCreateOutput = z.output<typeof checkInAssignmentCreateSchema>;

function statusBadgeVariant(status: AssignmentRow["status"]) {
  switch (status) {
    case "active":
      return "success" as const;
    case "invited":
      return "warning" as const;
    case "revoked":
      return "destructive" as const;
  }
}

export interface CheckInTabProps {
  eventId: string;
}

export function CheckInTab({ eventId }: CheckInTabProps) {
  const assignmentsQuery = useListCheckInAssignments(eventId);
  const createAssignment = useCreateCheckInAssignment();
  const updateAssignment = useUpdateCheckInAssignment();
  const deleteAssignment = useDeleteCheckInAssignment();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRow | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentCreateInput, unknown, AssignmentCreateOutput>({
    resolver: checkInAssignmentCreateResolver,
    defaultValues: {
      event_id: eventId,
      staff_email: "",
    },
  });

  useEffect(() => {
    if (!isAddOpen) return;
    reset({
      event_id: eventId,
      staff_email: "",
    });
  }, [eventId, isAddOpen, reset]);

  const onSubmit = (values: AssignmentCreateOutput) => {
    createAssignment.mutate(
      {
        event_id: eventId,
        staff_email: values.staff_email,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
        },
      },
    );
  };

  const toggleStatus = (assignment: AssignmentRow) => {
    const nextStatus = assignment.status === "revoked" ? "active" : "revoked";
    updateAssignment.mutate({
      id: assignment.id,
      body: { status: nextStatus },
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteAssignment.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const assignments = assignmentsQuery.data ?? [];

  const renderContent = () => {
    if (assignmentsQuery.isPending) {
      return (
        <div className="space-y-2" aria-label="Loading check-in assignments">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (assignmentsQuery.isError) {
      return (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load check-in staff assignments.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void assignmentsQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (assignments.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <UserCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No check-in staff assigned yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign staff members by email so they can scan attendee QR codes on
            event day.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Assign check-in staff
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell className="font-medium text-foreground">
                {assignment.staff_email}
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(assignment.status)}>
                  {assignment.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(assignment.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updateAssignment.isPending}
                    onClick={() => toggleStatus(assignment)}
                  >
                    {assignment.status === "revoked" ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reactivate
                      </>
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" />
                        Revoke
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(assignment)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Check-in staff</CardTitle>
            <CardDescription>
              Delegate QR code scanning and attendee check-in access for this
              event.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Assign staff
          </Button>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign check-in staff</DialogTitle>
            <DialogDescription>
              Enter the staff member&apos;s email address to grant check-in
              access for this event.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <FormRow
              id="checkin-staff-email"
              label="Staff email"
              type="email"
              placeholder="staff@example.com"
              error={errors.staff_email?.message}
              {...register("staff_email")}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createAssignment.isPending}
              >
                {createAssignment.isPending ? "Assigning…" : "Assign staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete check-in assignment</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.staff_email}
              </span>{" "}
              from this event&apos;s check-in staff list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAssignment.isPending}
              onClick={confirmDelete}
            >
              {deleteAssignment.isPending ? "Deleting…" : "Delete assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
