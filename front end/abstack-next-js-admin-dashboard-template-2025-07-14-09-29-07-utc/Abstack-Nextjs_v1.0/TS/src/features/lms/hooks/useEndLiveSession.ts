import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LiveSession } from '../types'

export function useEndLiveSession(sessionId: string) {
  const queryClient = useQueryClient()
  return useMutation<LiveSession, Error, void>({
    mutationFn: () =>
      apiClient.post(ENDPOINTS.LMS.LIVE_END(sessionId)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'live-classes'] })
    },
  })
}
