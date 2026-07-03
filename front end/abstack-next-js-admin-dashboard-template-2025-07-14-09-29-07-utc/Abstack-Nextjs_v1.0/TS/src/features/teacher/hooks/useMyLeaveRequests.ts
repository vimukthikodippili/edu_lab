import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LeaveRequest } from '@/types/sims/teacher'

export function useMyLeaveRequests() {
  return useQuery<LeaveRequest[]>({
    queryKey: ['my-leave-requests'],
    queryFn: () =>
      apiClient.get<LeaveRequest[]>(ENDPOINTS.LEAVE.MY_REQUESTS).then((r) => r.data),
    refetchInterval: 30_000,
  })
}
