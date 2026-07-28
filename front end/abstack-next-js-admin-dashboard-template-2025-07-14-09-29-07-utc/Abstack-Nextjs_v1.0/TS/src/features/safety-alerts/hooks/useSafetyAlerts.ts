'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SafetyAlert } from '@/types/sims/safety-alert'

// MHA-133/AC #3 — polls so delivery status (queued -> retrying -> sent/failed) updates live as
// background retries resolve, mirroring useLateAlerts.ts's live-feed precedent.
export function useSafetyAlerts() {
  return useQuery<SafetyAlert[]>({
    queryKey: ['safety-alerts'],
    queryFn: async () => {
      const { data } = await apiClient.get<SafetyAlert[]>(ENDPOINTS.SAFETY_ALERTS.LIST)
      return data
    },
    refetchInterval: 30_000,
  })
}
