import {
  AlertCircle,
  Bell,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDeleteReminderSchedule,
  useReminderSchedules,
  useUpsertReminderSchedule,
  useUpdateReminderSchedule,
} from "@/features/organizer/hooks/use-reminder-schedules";
import type { ReminderScheduleUpsert } from "@/lib/api";
import { FormRow, reminderScheduleUpsertResolver } from "@/lib/forms";
import { reminderScheduleUpsertSchema } from "@/lib/forms/schemas/reminder-schedule";

type ReminderScheduleRow = NonNullable<
  ReturnType<typeof useReminderSchedules>["data"]
>[number];

type ReminderFormInput = z.input<typeof reminderScheduleUpsertSchema>;

export interface RemindersTabProps {
  eventId: string;
}

export function RemindersTab({ eventId }: RemindersTabProps) {
  const schedulesQuery = useReminderSchedules(eventId);
  const upsertSchedule = useUpsertReminderSchedule();
  const updateSchedule = useUpdateReminderSchedule();
  const isSaving = upsertSchedule.isPending || updateSchedule.isPending;
  const deleteSchedule = useDeleteReminderSchedule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ReminderScheduleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReminderScheduleRow | null>(
    null,
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormInput, unknown, ReminderScheduleUpsert>({
    resolver: reminderScheduleUpsertResolver,
    defaultValues: {
      event_id: eventId,
      days_before_event: 3,
      send_time_of_day: "09:00",
      enabled: true,
    },
  });

  useEffect(() => {
    if (!isDialogOpen) return;
    if (editingSchedule) {
      reset({
        event_id: eventId,
        days_before_event: editingSchedule.days_before_event,
        send_time_of_day: editingSchedule.send_time_of_day,
        enabled: editingSchedule.enabled,
      });
    } else {
      reset({
        event_id: eventId,
        days_before_event: 3,
        send_time_of_day: "09:00",
        enabled: true,
      });
    }
  }, [editingSchedule, eventId, isDialogOpen, reset]);

  const openCreateDialog = () => {
    setEditingSchedule(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (schedule: ReminderScheduleRow) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const onSubmit = (values: ReminderScheduleUpsert) => {
    const body = {
        days_before_event: values.days_before_event,
        send_time_of_day: values.send_time_of_day ?? "09:00",
        enabled: values.enabled ?? true,
    };
    const callbacks = {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingSchedule(null);
        },
    };
    if (editingSchedule) {
      updateSchedule.mutate({ id: editingSchedule.id, body }, callbacks);
    } else {
      upsertSchedule.mutate({ event_id: eventId, ...body }, callbacks);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSchedule.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const schedules = schedulesQuery.data ?? [];

  const renderContent = () => {
    if (schedulesQuery.isPending) {
      return (
        <div className="space-y-2" aria-label="Loading reminder schedules">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (schedulesQuery.isError) {
      return (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load reminder schedules.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void schedulesQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (schedules.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No reminder schedules configured yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add automated email reminders to notify accepted guests before the
            event starts.
          </p>
          <Button className="mt-4" size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add reminder schedule
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timing</TableHead>
            <TableHead>Send time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last sent</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium text-foreground">
                {`${schedule.days_before_event} ${schedule.days_before_event === 1 ? "day" : "days"} before`}
              </TableCell>
              <TableCell>{schedule.send_time_of_day}</TableCell>
              <TableCell>
                <Badge variant={schedule.enabled ? "success" : "secondary"}>
                  {schedule.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {schedule.last_sent_at
                  ? new Date(schedule.last_sent_at).toLocaleString()
                  : "Not sent yet"}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(schedule)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(schedule)}
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
            <CardTitle>Reminder schedules</CardTitle>
            <CardDescription>
              Configure automated reminders sent to accepted guests prior to the
              event.
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add schedule
          </Button>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule
                ? "Edit reminder schedule"
                : "Add reminder schedule"}
            </DialogTitle>
            <DialogDescription>
              Choose how many days before the event and what local time the
              reminder should send.
            </DialogDescription>
          </DialogHeader>

          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <FormRow
              id="reminder-days-before"
              label="Days before event"
              type="number"
              min={1}
              max={365}
              error={errors.days_before_event?.message}
              {...register("days_before_event", { valueAsNumber: true })}
            />

            <FormRow
              id="reminder-send-time"
              label="Send time (24h HH:MM or HH:MM:SS)"
              placeholder="09:00"
              error={errors.send_time_of_day?.message}
              {...register("send_time_of_day")}
            />

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="reminder-enabled">Schedule enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Disabled schedules are skipped when reminders dispatch.
                </p>
              </div>
              <Controller
                control={control}
                name="enabled"
                render={({ field }) => (
                  <Switch
                    id="reminder-enabled"
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isSaving}
              >
                {isSaving ? "Saving…" : "Save schedule"}
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
            <DialogTitle>Delete reminder schedule</DialogTitle>
            <DialogDescription>
              Remove the reminder scheduled for{" "}
              {deleteTarget
                ? `${deleteTarget.days_before_event} day(s) before the event at ${deleteTarget.send_time_of_day}`
                : "this event"}
              ? This action cannot be undone.
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
              disabled={deleteSchedule.isPending}
              onClick={confirmDelete}
            >
              {deleteSchedule.isPending ? "Deleting…" : "Delete schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
