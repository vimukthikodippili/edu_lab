import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useRecordLiveAttendanceLeave(sessionId: string) {
  return useMutation<void, Error, void>({
    mutationFn: () => apiClient.post(ENDPOINTS.LMS.LIVE_ATTENDANCE_LEAVE(sessionId)).then(() => undefined),
  })
}
