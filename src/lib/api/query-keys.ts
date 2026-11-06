import type { operations } from '../../../contract/generated/schema';

export const qk = {
    listEventsPrefix: () => ['listEvents'] as const,
    listEvents: (query?: operations['listEvents']['parameters']['query']) =>
        ['listEvents', query] as const,
    listGuestsPrefix: () => ['listGuests'] as const,
    listGuests: (query?: operations['listGuests']['parameters']['query']) =>
        ['listGuests', query] as const,
    listInvitationsPrefix: () => ['listInvitations'] as const,
    listInvitations: (
        query?: operations['listInvitations']['parameters']['query'],
    ) => ['listInvitations', query] as const,
    listAttendeesPrefix: () => ['listAttendees'] as const,
    listAttendees: (
        query?: operations['listAttendees']['parameters']['query'],
    ) => ['listAttendees', query] as const,
    listHeadcountRequestsPrefix: () => ['listHeadcountRequests'] as const,
    listHeadcountRequests: (
        query?: operations['listHeadcountRequests']['parameters']['query'],
    ) => ['listHeadcountRequests', query] as const,
    listReminderSchedules: (eventId?: string) =>
        ['listReminderSchedules', eventId] as const,
    listReminderSchedulesPrefix: () => ['listReminderSchedules'] as const,
    getInvitationDesignPrefix: () => ['getInvitationDesign'] as const,
    getInvitationDesign: (eventId: string) =>
        ['getInvitationDesign', eventId] as const,
    listInvitationImagesPrefix: () => ['listInvitationImages'] as const,
    listInvitationImages: (eventId: string) =>
        ['listInvitationImages', eventId] as const,
    listCheckInAssignmentsPrefix: () => ['listCheckInAssignments'] as const,
    listCheckInAssignments: (eventId: string) =>
        ['listCheckInAssignments', eventId] as const,
    listEmailLogsPrefix: () => ['listEmailLogs'] as const,
    listEmailLogs: (eventId: string) => ['listEmailLogs', eventId] as const,
    listAuditLogEntries: () => ['listAuditLogEntries'] as const,
    getOrganizerProfile: () => ['getOrganizerProfile'] as const,
    getAdminProfile: () => ['getAdminProfile'] as const,
    adminListOrganizersPrefix: () => ['adminListOrganizers'] as const,
    adminListOrganizers: (page = 0, status = 'eq.pending') =>
        ['adminListOrganizers', page, status] as const,
    getAssignedEvent: (eventId: string) => ['getAssignedEvent', eventId] as const,
    discoverPublicEvents: () => ['discoverPublicEvents'] as const,
    listPublicGalleryImages: (eventId: string) =>
        ['listPublicGalleryImages', eventId] as const,
};
