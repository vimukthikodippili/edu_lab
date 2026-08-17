'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

interface DecidePayload {
  id: string
  reviewNote?: string
}

export function useApproveSubjectSelection() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, DecidePayload>({
    mutationFn: async ({ id, reviewNote }) => {
      const { data } = await apiClient.post(
        `/enrollments/subject-selection-requests/${id}/approve`,
        { reviewNote },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pending-subject-selections'] })
    },
  })
}

export function useRejectSubjectSelection() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, DecidePayload>({
    mutationFn: async ({ id, reviewNote }) => {
      const { data } = await apiClient.post(
        `/enrollments/subject-selection-requests/${id}/reject`,
        { reviewNote },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pending-subject-selections'] })
    },
  })
}
