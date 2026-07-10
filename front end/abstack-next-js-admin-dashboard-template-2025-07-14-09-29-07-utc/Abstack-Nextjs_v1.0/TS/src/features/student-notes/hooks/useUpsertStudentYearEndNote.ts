'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StudentYearEndNote, UpsertStudentYearEndNotePayload } from '../types'

export function useUpsertStudentYearEndNote(studentId: string) {
  const qc = useQueryClient()
  return useMutation<StudentYearEndNote, Error, UpsertStudentYearEndNotePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put<StudentYearEndNote>(`/student-notes/${studentId}`, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['student-year-end-notes', studentId] })
    },
  })
}
