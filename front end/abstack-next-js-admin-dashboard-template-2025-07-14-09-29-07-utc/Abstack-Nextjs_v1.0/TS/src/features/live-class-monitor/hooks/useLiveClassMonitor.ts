import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LiveClassStatusEntry } from '@/types/sims/live-class-monitor'

export function useLiveClassMonitor(gradeFrom?: number, gradeTo?: number) {
  return useQuery<LiveClassStatusEntry[]>({
    queryKey: ['live-class-monitor', gradeFrom, gradeTo],
    queryFn: () =>
      apiClient
        .get<LiveClassStatusEntry[]>(ENDPOINTS.LIVE_CLASS_MONITOR.STATUS, {
          params: { gradeFrom, gradeTo },
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })
}
