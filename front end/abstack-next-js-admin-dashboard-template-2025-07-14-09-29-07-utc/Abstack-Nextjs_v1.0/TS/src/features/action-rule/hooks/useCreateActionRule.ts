'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ActionRuleEntry, CreateActionRulePayload } from '@/types/sims/action-rule'

export function useCreateActionRule() {
  const qc = useQueryClient()
  return useMutation<ActionRuleEntry, Error, CreateActionRulePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<ActionRuleEntry>(ENDPOINTS.ACTION_RULE.CREATE, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['action-rules'] })
    },
  })
}
