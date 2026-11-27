export interface PostDecisionAttendee {
  id: string;
  invitation_id: string;
  status: string;
  [key: string]: unknown;
}

export interface PostDecisionDependencies {
  countPendingAttendees: (invitationId: string) => Promise<{
    count: number | null;
    error: { message: string } | null;
  }>;
  countApprovedAttendees: (invitationId: string) => Promise<{
    count: number | null;
    error: { message: string } | null;
  }>;
  fetchNotificationRecipient: (invitationId: string) => Promise<{
    data: { event_id: string; recipient_email: string } | null;
    error: { message: string } | null;
  }>;
  queueStatusUpdateEmail: (params: {
    event_id: string;
    invitation_id: string;
    recipient_email: string;
  }) => Promise<{ error: { message: string } | null }>;
  invokeQrBundle: (invitationId: string) => Promise<Response>;
}

export type PostDecisionResult =
  | { ok: true }
  | {
      ok: false;
      status: 500 | 502;
      error: string;
    };

/**
 * Runs after an attendee approval or rejection is persisted.
 *
 * When no pending attendees remain on the invitation:
 *  1. Queues the batched `attendee_status_update` email log.
 *  2. Dispatches the QR bundle if at least one attendee on the invitation is approved.
 */
export async function runPostDecisionDispatch(
  invitationId: string,
  deps: PostDecisionDependencies,
): Promise<PostDecisionResult> {
  const { count: pendingCount, error: pendingError } =
    await deps.countPendingAttendees(invitationId);

  if (pendingError) {
    console.error("Failed to count pending attendees:", pendingError.message);
    return {
      ok: false,
      status: 500,
      error: "Decision saved, but failed to check remaining attendees.",
    };
  }

  if (pendingCount !== 0) {
    return { ok: true };
  }

  const { data: notificationContext, error: notificationContextError } =
    await deps.fetchNotificationRecipient(invitationId);

  if (notificationContextError || !notificationContext) {
    console.error(
      "Failed to fetch attendee notification recipient:",
      notificationContextError?.message ?? "No invitation returned.",
    );
    return {
      ok: false,
      status: 500,
      error: "Decision saved, but notification could not be queued.",
    };
  }

  const { error: notificationError } = await deps.queueStatusUpdateEmail({
    event_id: notificationContext.event_id,
    invitation_id: invitationId,
    recipient_email: notificationContext.recipient_email,
  });

  if (notificationError) {
    console.error(
      "Failed to queue attendee status notification:",
      notificationError.message,
    );
    return {
      ok: false,
      status: 500,
      error: "Decision saved, but notification could not be queued.",
    };
  }

  const { count: approvedCount, error: approvedError } =
    await deps.countApprovedAttendees(invitationId);

  if (approvedError) {
    console.error("Failed to count approved attendees:", approvedError.message);
    return {
      ok: false,
      status: 500,
      error: "Decision saved, but failed to check approved attendees.",
    };
  }

  if (!approvedCount || approvedCount <= 0) {
    return { ok: true };
  }

  try {
    let qrBundleResponse = await deps.invokeQrBundle(invitationId);
    if (qrBundleResponse.status === 503 || qrBundleResponse.status === 546) {
      qrBundleResponse = await deps.invokeQrBundle(invitationId);
    }

    if (!qrBundleResponse.ok) {
      const responseBody = await qrBundleResponse.text();
      console.error(
        `QR bundle request failed (${qrBundleResponse.status}):`,
        responseBody,
      );
      return {
        ok: false,
        status: 502,
        error: "Decision saved, but the QR bundle request failed.",
      };
    }
  } catch (error) {
    console.error("Failed to request QR bundle:", error);
    return {
      ok: false,
      status: 502,
      error: "Decision saved, but the QR bundle request failed.",
    };
  }

  return { ok: true };
}
