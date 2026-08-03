'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { TeacherPtmScheduleRow } from '@/types/sims/ptm'

export function useTeacherPtmSchedule(eventId: string | null, teacherId?: string) {
  return useQuery<TeacherPtmScheduleRow[]>({
    queryKey: ['ptm-teacher-schedule', eventId, teacherId],
    queryFn: async () =>
      (
        await apiClient.get<TeacherPtmScheduleRow[]>(ENDPOINTS.PTM.TEACHER_SCHEDULE(eventId as string), {
          params: teacherId ? { teacherId } : undefined,
        })
      ).data,
    enabled: !!eventId,
  })
}
