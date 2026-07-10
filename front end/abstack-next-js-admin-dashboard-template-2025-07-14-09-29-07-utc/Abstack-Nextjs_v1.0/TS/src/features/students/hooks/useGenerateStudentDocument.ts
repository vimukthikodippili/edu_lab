'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { GeneratedDocumentResult, StudentDocumentType } from '../types-documents'

export function useGenerateStudentDocument(studentId: string) {
  const qc = useQueryClient()
  return useMutation<GeneratedDocumentResult, Error, StudentDocumentType>({
    mutationFn: async (type) => {
      const path = type === 'character_certificate' ? 'character-certificate' : 'leaving-report'
      const { data } = await apiClient.post<GeneratedDocumentResult>(`/students/${studentId}/documents/${path}`)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['student-documents-review', studentId] })
    },
  })
}
