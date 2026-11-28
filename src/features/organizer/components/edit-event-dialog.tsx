import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useUpdateEvent } from "@/features/organizer/hooks/use-update-event";
import type { Event, EventUpdate } from "@/lib/api";
import { toZonedIsoString, toZonedLocalString } from "@/lib/datetime";
import { eventUpdateResolver } from "@/lib/forms";
import { eventUpdateSchema } from "@/lib/forms/schemas/event";

type EventUpdateInput = z.input<typeof eventUpdateSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

export interface EditEventDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
}: EditEventDialogProps) {
  const updateEvent = useUpdateEvent();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventUpdateInput, unknown, EventUpdate>({
    resolver: eventUpdateResolver,
    defaultValues: {
      title: event.title,
      description: event.description ?? "",
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      rsvp_deadline: event.rsvp_deadline,
      event_timezone: event.event_timezone,
      capacity: event.capacity,
      visibility_mode: event.visibility_mode,
      status: event.status,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      title: event.title,
      description: event.description ?? "",
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      rsvp_deadline: event.rsvp_deadline,
      event_timezone: event.event_timezone,
      capacity: event.capacity,
      visibility_mode: event.visibility_mode,
      status: event.status,
    });
  }, [event, open, reset]);

  const onSubmit = (values: EventUpdate) => {
    updateEvent.mutate(
      {
        id: event.id,
        body: {
          ...values,
          description: values.description || null,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>
            Update the event details, schedule, capacity, or visibility.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <Label htmlFor="edit-event-title">Event title</Label>
            <Input
              id="edit-event-title"
              className="mt-1.5"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <Label htmlFor="edit-event-description">Description</Label>
            <Textarea
              id="edit-event-description"
              className="mt-1.5"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-event-starts-at">Starts</Label>
              <Controller
                control={control}
                name="starts_at"
                render={({ field }) => (
                  <Input
                    id="edit-event-starts-at"
                    type="datetime-local"
                    className="mt-1.5"
                    value={toZonedLocalString(field.value || "", event.event_timezone)}
                    onBlur={field.onBlur}
                    onChange={(e) =>
                      field.onChange(
                        toZonedIsoString(e.target.value, event.event_timezone),
                      )
                    }
                    aria-invalid={Boolean(errors.starts_at)}
                  />
                )}
              />
              <FieldError message={errors.starts_at?.message} />
            </div>

            <div>
              <Label htmlFor="edit-event-ends-at">Ends</Label>
              <Controller
                control={control}
                name="ends_at"
                render={({ field }) => (
                  <Input
                    id="edit-event-ends-at"
                    type="datetime-local"
                    className="mt-1.5"
                    value={toZonedLocalString(field.value || "", event.event_timezone)}
                    onBlur={field.onBlur}
                    onChange={(e) =>
                      field.onChange(
                        toZonedIsoString(e.target.value, event.event_timezone),
                      )
                    }
                    aria-invalid={Boolean(errors.ends_at)}
                  />
                )}
              />
              <FieldError message={errors.ends_at?.message} />
            </div>

            <div>
              <Label htmlFor="edit-event-rsvp-deadline">RSVP deadline</Label>
              <Controller
                control={control}
                name="rsvp_deadline"
                render={({ field }) => (
                  <Input
                    id="edit-event-rsvp-deadline"
                    type="datetime-local"
                    className="mt-1.5"
                    value={toZonedLocalString(field.value || "", event.event_timezone)}
                    onBlur={field.onBlur}
                    onChange={(e) =>
                      field.onChange(
                        toZonedIsoString(e.target.value, event.event_timezone),
                      )
                    }
                    aria-invalid={Boolean(errors.rsvp_deadline)}
                  />
                )}
              />
              <FieldError message={errors.rsvp_deadline?.message} />
            </div>

            <div>
              <Label htmlFor="edit-event-timezone">Timezone</Label>
              <Input
                id="edit-event-timezone"
                className="mt-1.5"
                aria-invalid={Boolean(errors.event_timezone)}
                {...register("event_timezone")}
              />
              <FieldError message={errors.event_timezone?.message} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="edit-event-capacity">Capacity</Label>
              <Input
                id="edit-event-capacity"
                type="number"
                min={1}
                step={1}
                className="mt-1.5"
                aria-invalid={Boolean(errors.capacity)}
                {...register("capacity", {
                  setValueAs: (value: string) =>
                    value === "" ? undefined : Number(value),
                })}
              />
              <FieldError message={errors.capacity?.message} />
            </div>

            <div>
              <Label htmlFor="edit-event-visibility">Visibility</Label>
              <select
                id="edit-event-visibility"
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("visibility_mode")}
              >
                <option value="open_registration">Open registration</option>
                <option value="invite_only">Invite only</option>
              </select>
              <FieldError message={errors.visibility_mode?.message} />
            </div>

            <div>
              <Label htmlFor="edit-event-status">Status</Label>
              <select
                id="edit-event-status"
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("status")}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
              <FieldError message={errors.status?.message} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || updateEvent.isPending}
            >
              {updateEvent.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
