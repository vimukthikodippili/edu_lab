'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaCaseloadFilters, MhaCaseloadItem } from '@/types/sims/mha-caseload'

// MHA-140 — mirrors useMhaSessions' options-object convention: build a params object from only
// the filters that are actually set, one queryKey entry per filter with an 'all'/'any' fallback.
export function useMhaCaseload(filters: MhaCaseloadFilters = {}) {
  const { riskLevel, gradeId, hasPendingActions, hasSafetyFlag } = filters
  return useQuery<MhaCaseloadItem[]>({
    queryKey: [
      'mha-caseload',
      riskLevel ?? 'all',
      gradeId ?? 'all-grades',
      hasPendingActions ?? 'any',
      hasSafetyFlag ?? 'any',
    ],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (riskLevel) params.riskLevel = riskLevel
      if (gradeId !== undefined) params.gradeId = String(gradeId)
      if (hasPendingActions !== undefined) params.hasPendingActions = String(hasPendingActions)
      if (hasSafetyFlag !== undefined) params.hasSafetyFlag = String(hasSafetyFlag)
      const { data } = await apiClient.get<MhaCaseloadItem[]>(ENDPOINTS.MHA_SESSION.CASELOAD, {
        params: Object.keys(params).length > 0 ? params : undefined,
      })
      return data
    },
  })
}
