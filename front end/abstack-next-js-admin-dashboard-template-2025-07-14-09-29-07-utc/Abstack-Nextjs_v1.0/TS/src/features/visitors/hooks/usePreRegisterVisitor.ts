'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CreatePreRegisteredVisitorPayload, PreRegisteredVisitor } from '@/types/sims/visitors'

export function usePreRegisterVisitor() {
  return useMutation<PreRegisteredVisitor, Error, CreatePreRegisteredVisitorPayload>({
    mutationFn: async (payload) =>
      (await apiClient.post<PreRegisteredVisitor>(ENDPOINTS.VISITORS.PRE_REGISTER, payload)).data,
  })
}
