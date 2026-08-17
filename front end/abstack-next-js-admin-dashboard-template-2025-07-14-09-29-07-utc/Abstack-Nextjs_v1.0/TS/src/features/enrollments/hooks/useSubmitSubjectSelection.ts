'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SubmitSubjectSelectionPayload } from '@/types/sims/subject-selection'

export function useSubmitSubjectSelection() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, SubmitSubjectSelectionPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/students/me/subject-selection', payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['available-subject-selection'] })
    },
  })
}
