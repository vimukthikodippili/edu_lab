'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateMhaSessionPayload, MhaSessionWithDomains } from '@/types/sims/mha-session'

export function useCreateMhaSession() {
  return useMutation<MhaSessionWithDomains, Error, CreateMhaSessionPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<MhaSessionWithDomains>(ENDPOINTS.MHA_SESSION.CREATE, payload)
      return data
    },
  })
}
