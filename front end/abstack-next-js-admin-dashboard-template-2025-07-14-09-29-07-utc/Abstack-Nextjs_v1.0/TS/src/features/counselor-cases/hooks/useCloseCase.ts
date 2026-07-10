'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CounselorCase } from '../types'

export function useCloseCase() {
  const qc = useQueryClient()
  return useMutation<CounselorCase, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<CounselorCase>(`/counselor-cases/${id}/close`)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['counselor-cases'] })
    },
  })
}
