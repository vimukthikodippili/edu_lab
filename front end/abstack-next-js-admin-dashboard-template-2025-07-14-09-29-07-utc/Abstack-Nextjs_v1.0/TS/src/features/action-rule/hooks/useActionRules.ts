'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ActionRuleEntry } from '@/types/sims/action-rule'

export function useActionRules(activeOnly = false) {
  return useQuery<ActionRuleEntry[]>({
    queryKey: ['action-rules', activeOnly],
    queryFn: async () => {
      const { data } = await apiClient.get<ActionRuleEntry[]>(ENDPOINTS.ACTION_RULE.LIST, {
        params: { activeOnly },
      })
      return data
    },
  })
}
