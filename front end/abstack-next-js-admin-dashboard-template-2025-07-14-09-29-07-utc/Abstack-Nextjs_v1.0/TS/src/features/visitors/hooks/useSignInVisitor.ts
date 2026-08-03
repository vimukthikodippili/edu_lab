'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SignInVisitorPayload, VisitorLog } from '@/types/sims/visitors'

export function useSignInVisitor() {
  const qc = useQueryClient()
  return useMutation<VisitorLog, Error, SignInVisitorPayload>({
    mutationFn: async (payload) => (await apiClient.post<VisitorLog>(ENDPOINTS.VISITORS.SIGN_IN, payload)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['visitors-active'] }),
  })
}
