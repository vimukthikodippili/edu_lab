import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ArtActivityRoster } from '@/types/sims/art-activity'

export function useArtActivityRoster(activityId: string | null) {
  return useQuery<ArtActivityRoster>({
    queryKey: ['art-activity-roster', activityId],
    queryFn: () => apiClient.get(`/art-activities/${activityId}/roster`).then((r) => r.data),
    enabled: !!activityId,
  })
}
