'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectSelectionWindow } from '@/types/sims/subject-selection'

export interface CreateSubjectSelectionWindowPayload {
  gradeStageId: string
  academicYear: number
  openDate: string
  closeDate: string
  minOptionalSubjects: number
  maxOptionalSubjects: number
  requiresStreamSelection?: boolean
}

export function useCreateSubjectSelectionWindow() {
  const qc = useQueryClient()
  return useMutation<SubjectSelectionWindow, Error, CreateSubjectSelectionWindowPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SubjectSelectionWindow>(
        '/enrollments/subject-selection-windows',
        payload,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-selection-windows'] })
    },
  })
}
