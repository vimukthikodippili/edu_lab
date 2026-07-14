'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CounselorNote } from '../types'

export interface SetApprovedSummaryPayload {
  id: string
  studentId: string
  summary: string | null
}

export function useSetApprovedSummary() {
  const qc = useQueryClient()
  return useMutation<CounselorNote, Error, SetApprovedSummaryPayload>({
    mutationFn: async ({ id, summary }) => {
      const { data } = await apiClient.patch<CounselorNote>(`/counselor-notes/${id}/approved-summary`, { summary })
      return data
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['counselor-notes', variables.studentId] })
    },
  })
}
