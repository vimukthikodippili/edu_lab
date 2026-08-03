'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BlockNewVisitorPayload, Visitor } from '@/types/sims/visitors'

export function useBlockNewVisitor() {
  const qc = useQueryClient()
  return useMutation<Visitor, Error, BlockNewVisitorPayload>({
    mutationFn: async (payload) => (await apiClient.post<Visitor>(ENDPOINTS.VISITORS.BLOCK_NEW, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['visitors-search'] }),
  })
}
