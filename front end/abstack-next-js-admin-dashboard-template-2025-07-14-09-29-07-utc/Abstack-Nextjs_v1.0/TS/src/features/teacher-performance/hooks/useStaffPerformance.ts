'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { StaffPerformanceDto } from '../types'

export function useStaffPerformance(staffId: string | null) {
  return useQuery<StaffPerformanceDto>({
    queryKey: ['teacher-performance-staff', staffId],
    enabled: !!staffId,
    queryFn: async () => {
      const { data } = await apiClient.get<StaffPerformanceDto>(ENDPOINTS.TEACHER_PERFORMANCE.BY_STAFF(staffId as string))
      return data
    },
  })
}
