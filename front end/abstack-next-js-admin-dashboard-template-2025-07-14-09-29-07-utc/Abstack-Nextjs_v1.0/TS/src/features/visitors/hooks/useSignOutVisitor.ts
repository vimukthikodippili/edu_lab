'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SignOutResult } from '@/types/sims/visitors'

export function useSignOutVisitor() {
  const qc = useQueryClient()
  return useMutation<SignOutResult, Error, string>({
    mutationFn: async (logId) => (await apiClient.post<SignOutResult>(ENDPOINTS.VISITORS.SIGN_OUT(logId))).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['visitors-active'] }),
  })
}
