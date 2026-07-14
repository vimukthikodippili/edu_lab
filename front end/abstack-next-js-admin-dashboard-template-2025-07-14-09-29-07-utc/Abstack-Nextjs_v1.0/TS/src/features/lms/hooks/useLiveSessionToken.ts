import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LiveSessionToken } from '../types'

export function useLiveSessionToken(sessionId: string) {
  return useMutation<LiveSessionToken, Error, void>({
    mutationFn: () =>
      apiClient.post(ENDPOINTS.LMS.LIVE_TOKEN(sessionId)).then((r) => r.data),
  })
}
