'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useEnrollStudent(sportId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (studentId) =>
      apiClient.post(ENDPOINTS.SPORTS.ENROLL(sportId), { studentId }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sport-roster', sportId] })
      void qc.invalidateQueries({ queryKey: ['sports-directory'] })
    },
  })
}
