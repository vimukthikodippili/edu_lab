'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CounselorNote } from '../types'

export interface CreateNotePayload {
  studentId: string
  notes: string
  caseId?: string
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation<CounselorNote, Error, CreateNotePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<CounselorNote>('/counselor-notes', payload)
      return data
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['counselor-notes', variables.studentId] })
    },
  })
}
