-- =============================================================================
-- Restrict guest updates to editable attendee fields/states.
--
-- The previous WITH CHECK clause verified ownership and is_primary = false,
-- but allowed guests to change a pending attendee's status to 'approved' and
-- to assign a qr_token. Keep the existing row-ownership and old-row checks in
-- USING, and validate the resulting row in WITH CHECK as well.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS
    "attendees: guest updates own non-primary pending/rejected"
ON public.attendees;

CREATE POLICY "attendees: guest updates own non-primary pending/rejected"
ON public.attendees
FOR UPDATE
TO public
USING (
    is_primary = false
    AND status = ANY (
        ARRAY[
            'pending'::attendee_status_enum,
            'rejected'::attendee_status_enum
        ]
    )
    AND EXISTS (
        SELECT 1
        FROM public.invitations i
        WHERE i.id = attendees.invitation_id
          AND is_guest(i.guest_id)
    )
)
WITH CHECK (
    is_primary = false
    AND is_walk_in = false
    AND status = ANY (
        ARRAY[
            'pending'::attendee_status_enum,
            'rejected'::attendee_status_enum
        ]
    )
    AND qr_token IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.invitations i
        WHERE i.id = attendees.invitation_id
          AND is_guest(i.guest_id)
    )
);

COMMIT;
