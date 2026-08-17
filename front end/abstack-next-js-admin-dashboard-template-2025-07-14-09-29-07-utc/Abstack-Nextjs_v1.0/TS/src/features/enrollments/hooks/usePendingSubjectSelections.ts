'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PendingSubjectSelectionRequestRow } from '@/types/sims/subject-selection'

export function usePendingSubjectSelections(gradeStageId?: string) {
  return useQuery<PendingSubjectSelectionRequestRow[]>({
    queryKey: ['pending-subject-selections', gradeStageId],
    queryFn: async () => {
      const { data } = await apiClient.get<PendingSubjectSelectionRequestRow[]>(
        '/enrollments/subject-selection-requests',
        { params: gradeStageId ? { gradeStageId } : {} },
      )
      return data
    },
  })
}
