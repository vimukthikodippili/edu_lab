'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { StudentTimeline } from '@/types/sims/student-timeline'

export function useStudentTimeline(studentId: string) {
  return useQuery<StudentTimeline>({
    queryKey: ['student-timeline', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<StudentTimeline>(ENDPOINTS.STUDENTS.TIMELINE(studentId))
      return data
    },
    enabled: !!studentId,
  })
}
