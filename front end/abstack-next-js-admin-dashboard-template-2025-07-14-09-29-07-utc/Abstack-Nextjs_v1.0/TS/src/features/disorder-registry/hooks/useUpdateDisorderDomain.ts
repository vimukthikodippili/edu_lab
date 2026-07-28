'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DisorderRegistryEntry, UpdateDisorderRegistryPayload } from '@/types/sims/disorder-registry'

export function useUpdateDisorderDomain() {
  const qc = useQueryClient()
  return useMutation<DisorderRegistryEntry, Error, { id: string; payload: UpdateDisorderRegistryPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<DisorderRegistryEntry>(ENDPOINTS.DISORDER_REGISTRY.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['disorder-registry'] })
    },
  })
}
