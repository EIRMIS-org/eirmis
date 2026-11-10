import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormRow, invitationCreateResolver } from "@/lib/forms";
import { useCreateInvitation } from "@/features/organizer/hooks/use-create-invitation";

export interface GuestOption {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

/**
 * Task 07 — Organizer Portal (assigned to Jebzzzzz): this dialog is the direct
 * invitation-creation path for the Guests tab. It uses the shared invitation
 * resolver and create mutation so the organizer can add an invitation and have
 * it appear immediately in the event workspace without leaving the task flow.
 */
export interface AddInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  guestOptions: GuestOption[];
}

export function AddInvitationDialog({
  open,
  onOpenChange,
  eventId,
  guestOptions,
}: AddInvitationDialogProps) {
  const createInvitation = useCreateInvitation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: invitationCreateResolver,
    defaultValues: {
      event_id: eventId,
      guest_id: guestOptions[0]?.id ?? "",
      max_party_size: 1,
      status: "pending",
      dietary_preference: "",
      special_requests: "",
    },
  });

  useEffect(() => {
    reset({
      event_id: eventId,
      guest_id: guestOptions[0]?.id ?? "",
      max_party_size: 1,
      status: "pending",
      dietary_preference: "",
      special_requests: "",
    });
  }, [eventId, guestOptions, reset]);

  const onSubmit = (values: {
    event_id: string;
    guest_id: string;
    max_party_size?: number;
    status?: "pending" | "accepted" | "declined" | "tentative" | "waitlisted";
    dietary_preference?: string | null;
    special_requests?: string | null;
  }) => {
    createInvitation.mutate(
      {
        ...values,
        event_id: eventId,
        guest_id: values.guest_id || guestOptions[0]?.id || "",
        max_party_size: values.max_party_size || 1,
        status: values.status ?? "pending",
        dietary_preference: values.dietary_preference || null,
        special_requests: values.special_requests || null,
      },
      {
        onSuccess: () => {
          reset({
            event_id: eventId,
            guest_id: guestOptions[0]?.id ?? "",
            max_party_size: 1,
            status: "pending",
            dietary_preference: "",
            special_requests: "",
          });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add invitation</DialogTitle>
          <DialogDescription>
            Create a new invitation for this event and assign it to a guest.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormRow
              id="guest_id"
              label="Guest ID"
              placeholder="Select or paste a guest ID"
              error={errors.guest_id?.message}
              {...register("guest_id")}
            />

            <FormRow
              id="max_party_size"
              label="Party size"
              type="number"
              min={1}
              error={errors.max_party_size?.message}
              {...register("max_party_size", { valueAsNumber: true })}
            />
          </div>

          <FormRow
            id="dietary_preference"
            label="Dietary preference"
            placeholder="Optional"
            error={errors.dietary_preference?.message}
            {...register("dietary_preference")}
          />

          <FormRow
            id="special_requests"
            label="Special requests"
            placeholder="Optional notes"
            error={errors.special_requests?.message}
            {...register("special_requests")}
          />

          <FormRow
            id="status"
            label="Invitation status"
            error={errors.status?.message}
            defaultValue="pending"
            {...register("status")}
          />

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
              disabled={isSubmitting || createInvitation.isPending}
            >
              {createInvitation.isPending ? "Saving…" : "Save invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
