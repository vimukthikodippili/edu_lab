'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CounselorNote } from '../types'

export function useStudentNotes(studentId: string | null) {
  return useQuery<CounselorNote[]>({
    queryKey: ['counselor-notes', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<CounselorNote[]>(`/counselor-notes/student/${studentId}`)
      return data
    },
    enabled: !!studentId,
  })
}
