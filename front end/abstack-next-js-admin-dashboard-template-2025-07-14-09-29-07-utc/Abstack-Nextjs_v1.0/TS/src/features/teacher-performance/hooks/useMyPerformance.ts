'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { TeacherPerformanceDto } from '../types'

export function useMyPerformance() {
  return useQuery<TeacherPerformanceDto>({
    queryKey: ['teacher-performance-me'],
    queryFn: async () => {
      const { data } = await apiClient.get<TeacherPerformanceDto>(ENDPOINTS.TEACHER_PERFORMANCE.ME)
      return data
    },
  })
}
