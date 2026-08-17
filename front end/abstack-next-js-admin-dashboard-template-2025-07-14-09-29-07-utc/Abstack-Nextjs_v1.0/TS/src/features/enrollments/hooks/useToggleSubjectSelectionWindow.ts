'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubjectSelectionWindow } from '@/types/sims/subject-selection'

export function useToggleSubjectSelectionWindow() {
  const qc = useQueryClient()
  return useMutation<SubjectSelectionWindow, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<SubjectSelectionWindow>(
        `/enrollments/subject-selection-windows/${id}/toggle-active`,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-selection-windows'] })
    },
  })
}
