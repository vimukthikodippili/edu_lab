'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useRemindPending() {
  const qc = useQueryClient()
  return useMutation<{ remindedCount: number }, Error, string>({
    mutationFn: async (formId) => (await apiClient.post<{ remindedCount: number }>(ENDPOINTS.CONSENT.REMIND_PENDING(formId))).data,
    onSuccess: (_data, formId) => void qc.invalidateQueries({ queryKey: ['consent-forms', 'dashboard', formId] }),
  })
}
