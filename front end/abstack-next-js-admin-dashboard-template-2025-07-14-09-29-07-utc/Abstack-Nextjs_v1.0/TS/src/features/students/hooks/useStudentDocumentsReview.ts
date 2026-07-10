'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { StudentDocumentsReview } from '../types-documents'

export function useStudentDocumentsReview(studentId: string) {
  return useQuery<StudentDocumentsReview>({
    queryKey: ['student-documents-review', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<StudentDocumentsReview>(`/students/${studentId}/documents`)
      return data
    },
  })
}
