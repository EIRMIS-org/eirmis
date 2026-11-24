import { useMutation } from '@tanstack/react-query'
import { dispatchQrBundle } from '@/lib/api'

export function useDispatchQr() {
  return useMutation({
    mutationFn: (invitationId: string) =>
      dispatchQrBundle({ invitation_id: invitationId }),
  })
}
