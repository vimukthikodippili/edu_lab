'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateDisorderRegistryPayload, DisorderRegistryEntry } from '@/types/sims/disorder-registry'

export function useCreateDisorderDomain() {
  const qc = useQueryClient()
  return useMutation<DisorderRegistryEntry, Error, CreateDisorderRegistryPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<DisorderRegistryEntry>(ENDPOINTS.DISORDER_REGISTRY.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['disorder-registry'] })
    },
  })
}
