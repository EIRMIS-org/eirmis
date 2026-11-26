# EIRMIS

Event invitation, RSVP, capacity management, and attendee check-in domain.

## Language

**Event Capacity**:
The maximum number of approved attendees allowed across all invitations for an event.
_Avoid_: Capacity ceiling, seat limit, headroom

**Approved Headcount**:
The total number of currently approved attendees occupying seats for an event.
_Avoid_: Party size total, current count

**Waitlist Promotion**:
The strict first-in, first-out advancement of a waitlisted invitation into accepted status when event capacity permits, reserving a single seat for the primary attendee while leaving any additional attendees pending organizer review.
_Avoid_: Waitlist bump, auto-approval

**Primary Attendee**:
The invited guest represented by an invitation, whose seat is reserved when the invitation is accepted or promoted from the waitlist.
_Avoid_: Main guest, lead attendee

**Additional Attendee**:
A non-primary attendee submitted under an invitation who remains pending and consumes no event capacity until explicitly approved by the organizer.
_Avoid_: Plus-one, companion, extra guest

**HTML Invitation Design**:
A self-contained HTML file uploaded as an event's invitation design that remains hidden from guests until it passes both structural validation and asynchronous malware scanning.
_Avoid_: Custom HTML, HTML template

**Scan Job**:
A single malware-scanning submission tied to one uploaded HTML Invitation Design, whose verdict applies only while that upload is still the event's active pending design.
_Avoid_: Scan request, validation run
