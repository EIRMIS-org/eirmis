export interface PromotedInvitationRow {
  id: string;
  event_id: string;
  guest_id: string;
}

export interface GuestPromotionResult {
  invitation_id: string;
  guest_id: string;
  promoted: true;
  email_status: "sent" | "failed";
  email_logged: boolean;
  audit_logged: boolean;
  error: string | null;
}

export interface PostPromotionSummary {
  promoted_count: number;
  promoted_invitation_ids: string[];
  results: GuestPromotionResult[];
}

export interface AuditEntryInput {
  actor_type: "system" | "organizer";
  actor_id: string | null;
  action: "waitlist.promoted";
  entity_type: "invitation";
  entity_id: string;
  new_value: {
    event_id: string;
    guest_email: string;
    provider_message_id: string;
  };
}

export interface PostPromotionDependencies {
  actorType: "system" | "organizer";
  actorId: string | null;
  now?: () => Date;
  fetchGuestEmail: (guestId: string) => Promise<{
    email: string | null;
    error: { message: string } | null;
  }>;
  sendPromotionEmail: (guestEmail: string) => Promise<{
    providerMessageId: string;
  }>;
  insertEmailLog: (entry: {
    event_id: string;
    invitation_id: string;
    recipient_email: string;
    type: "waitlist_promoted";
    status: "sent" | "failed";
    provider_message_id?: string;
    sent_at?: string;
  }) => Promise<{ error: { message: string } | null }>;
  insertAuditLog: (
    entry: AuditEntryInput,
  ) => Promise<{ error: { message: string } | null }>;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Processes notifications, email logs, and audit entries for each promoted
 * invitation independently so a single guest failure never drops the rest of
 * the batch.
 */
export async function processPromotedInvitations(
  promotedInvitations: PromotedInvitationRow[],
  deps: PostPromotionDependencies,
): Promise<PostPromotionSummary> {
  const promotedInvitationIds: string[] = [];
  const results: GuestPromotionResult[] = [];

  for (const invitation of promotedInvitations) {
    if (
      !isUuid(invitation?.id) ||
      !isUuid(invitation?.event_id) ||
      !isUuid(invitation?.guest_id)
    ) {
      console.error(
        "Invalid promoted invitation row returned by promote_waitlist_fifo.",
      );
      results.push({
        invitation_id: typeof invitation?.id === "string" ? invitation.id : "",
        guest_id: typeof invitation?.guest_id === "string" ? invitation.guest_id : "",
        promoted: true,
        email_status: "failed",
        email_logged: false,
        audit_logged: false,
        error: "Failed to load promoted invitation details.",
      });
      continue;
    }

    promotedInvitationIds.push(invitation.id);

    const { email: guestEmail, error: guestError } = await deps.fetchGuestEmail(
      invitation.guest_id,
    );

    if (guestError) {
      console.error(
        `Error fetching promoted invitation guest (${invitation.guest_id}):`,
        guestError.message,
      );
      results.push({
        invitation_id: invitation.id,
        guest_id: invitation.guest_id,
        promoted: true,
        email_status: "failed",
        email_logged: false,
        audit_logged: false,
        error: "Failed to load promoted invitation guest.",
      });
      continue;
    }

    if (!guestEmail) {
      console.error(
        `Invitation ${invitation.id} has no guest email for notification.`,
      );
      results.push({
        invitation_id: invitation.id,
        guest_id: invitation.guest_id,
        promoted: true,
        email_status: "failed",
        email_logged: false,
        audit_logged: false,
        error: "Promoted invitation is missing guest email.",
      });
      continue;
    }

    let providerMessageId: string;
    try {
      const sent = await deps.sendPromotionEmail(guestEmail);
      providerMessageId = sent.providerMessageId;
    } catch (error) {
      console.error(
        `Failed to send waitlist promotion email for invitation ${invitation.id}:`,
        error,
      );
      let emailLogged = false;
      try {
        const { error: failedLogError } = await deps.insertEmailLog({
          event_id: invitation.event_id,
          invitation_id: invitation.id,
          recipient_email: guestEmail,
          type: "waitlist_promoted",
          status: "failed",
        });
        emailLogged = !failedLogError;
        if (failedLogError) {
          console.error(
            `Failed to log failed waitlist promotion email for invitation ${invitation.id}:`,
            failedLogError.message,
          );
        }
      } catch (logErr) {
        console.error(
          `Failed to log failed waitlist promotion email for invitation ${invitation.id}:`,
          logErr,
        );
      }

      results.push({
        invitation_id: invitation.id,
        guest_id: invitation.guest_id,
        promoted: true,
        email_status: "failed",
        email_logged: emailLogged,
        audit_logged: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : "Promotion succeeded but email dispatch failed.",
      });
      continue;
    }

    const errors: string[] = [];

    const sentAt = (deps.now ? deps.now() : new Date()).toISOString();
    const { error: emailLogError } = await deps.insertEmailLog({
      event_id: invitation.event_id,
      invitation_id: invitation.id,
      recipient_email: guestEmail,
      type: "waitlist_promoted",
      status: "sent",
      provider_message_id: providerMessageId,
      sent_at: sentAt,
    });

    const emailLogged = !emailLogError;
    if (emailLogError) {
      console.error(
        `Failed to log waitlist promotion email for invitation ${invitation.id}:`,
        emailLogError.message,
      );
      errors.push("Email sent, but email logging failed.");
    }

    const { error: auditError } = await deps.insertAuditLog({
      actor_type: deps.actorType,
      actor_id: deps.actorId,
      action: "waitlist.promoted",
      entity_type: "invitation",
      entity_id: invitation.id,
      new_value: {
        event_id: invitation.event_id,
        guest_email: guestEmail,
        provider_message_id: providerMessageId,
      },
    });

    const auditLogged = !auditError;
    if (auditError) {
      console.error(
        `Failed to write waitlist promotion audit log for invitation ${invitation.id}:`,
        auditError.message,
      );
      errors.push("Promotion succeeded, but audit logging failed.");
    }

    results.push({
      invitation_id: invitation.id,
      guest_id: invitation.guest_id,
      promoted: true,
      email_status: "sent",
      email_logged: emailLogged,
      audit_logged: auditLogged,
      error: errors.length > 0 ? errors.join(" ") : null,
    });
  }

  return {
    promoted_count: promotedInvitationIds.length,
    promoted_invitation_ids: promotedInvitationIds,
    results,
  };
}
