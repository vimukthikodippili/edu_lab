'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ActionRuleEntry, UpdateActionRulePayload } from '@/types/sims/action-rule'

export function useUpdateActionRule() {
  const qc = useQueryClient()
  return useMutation<ActionRuleEntry, Error, { id: string; payload: UpdateActionRulePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.patch<ActionRuleEntry>(ENDPOINTS.ACTION_RULE.UPDATE(id), payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['action-rules'] })
    },
  })
}
