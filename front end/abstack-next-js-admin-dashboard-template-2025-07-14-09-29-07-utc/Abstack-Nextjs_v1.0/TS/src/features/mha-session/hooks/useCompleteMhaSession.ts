'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaSessionSummary } from '@/types/sims/mha-session'

export function useCompleteMhaSession() {
  const queryClient = useQueryClient()

  return useMutation<MhaSessionSummary, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch<MhaSessionSummary>(ENDPOINTS.MHA_SESSION.COMPLETE(id))
      return data
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['mha-sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['mha-session', id] })
    },
  })
}
