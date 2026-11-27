import { ApiError, registerPublicGuest } from '@/lib/api'
import type { Invitation, RegisterPublicRequest } from '@/lib/api'
import { useApiMutation } from '@/lib/api/use-api-mutation'

export interface PublicRegistrationResult {
  invitation: Invitation
  emailWarning: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isInvitation(value: unknown): value is Invitation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.event_id === 'string' &&
    typeof value.guest_id === 'string' &&
    typeof value.status === 'string'
  )
}

export function useRegisterPublicGuest() {
  return useApiMutation<PublicRegistrationResult, RegisterPublicRequest>(
    async (body) => {
      try {
        const invitation = await registerPublicGuest(body)
        return { invitation, emailWarning: false }
      } catch (error) {
        // The Edge Function creates the invitation before attempting email
        // delivery or logging (502/500 with registration_created: true).
        // Preserve that success rather than encouraging a duplicate retry.
        if (error instanceof ApiError) {
          const responseBody = error.responseBody
          if (
            isRecord(responseBody) &&
            responseBody.registration_created === true &&
            isInvitation(responseBody.invitation)
          ) {
            return {
              invitation: responseBody.invitation,
              emailWarning: true,
            }
          }
        }

        throw error
      }
    },
    [],
    'Registration submitted',
  )
}
