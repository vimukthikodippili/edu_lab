import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useRecordLiveAttendanceJoin(sessionId: string) {
  return useMutation<void, Error, void>({
    mutationFn: () => apiClient.post(ENDPOINTS.LMS.LIVE_ATTENDANCE_JOIN(sessionId)).then(() => undefined),
  })
}
