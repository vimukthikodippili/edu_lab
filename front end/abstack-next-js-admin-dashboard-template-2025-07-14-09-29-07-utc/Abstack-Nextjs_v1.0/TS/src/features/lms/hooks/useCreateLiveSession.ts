import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateLiveSessionPayload, LiveSession } from '../types'

export function useCreateLiveSession() {
  const queryClient = useQueryClient()
  return useMutation<LiveSession, Error, CreateLiveSessionPayload>({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.LMS.LIVE_CLASSES, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'live-classes', 'mine'] })
    },
  })
}
