'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SetBlockedPayload, Visitor } from '@/types/sims/visitors'

interface SetBlockedVars {
  visitorId: string
  payload: SetBlockedPayload
}

export function useSetBlocked() {
  const qc = useQueryClient()
  return useMutation<Visitor, Error, SetBlockedVars>({
    mutationFn: async ({ visitorId, payload }) =>
      (await apiClient.patch<Visitor>(ENDPOINTS.VISITORS.SET_BLOCKED(visitorId), payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['visitors-search'] }),
  })
}
