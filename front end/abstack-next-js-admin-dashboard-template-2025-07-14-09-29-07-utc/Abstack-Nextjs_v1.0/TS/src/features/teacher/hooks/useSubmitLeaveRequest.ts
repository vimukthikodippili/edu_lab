import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LeaveRequest } from '@/types/sims/teacher'
import type { LeaveFormValues } from '../schemas/leaveSchema'

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation<LeaveRequest, Error, LeaveFormValues>({
    mutationFn: (payload) =>
      apiClient.post<LeaveRequest>(ENDPOINTS.LEAVE.REQUESTS, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] })
    },
  })
}
