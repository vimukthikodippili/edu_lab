import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ArtActivity } from '@/types/sims/art-activity'

export function useArtActivities(classSectionId: number | null) {
  return useQuery<ArtActivity[]>({
    queryKey: ['art-activities', classSectionId],
    queryFn: () =>
      apiClient.get('/art-activities', { params: { classSectionId } }).then((r) => r.data),
    enabled: !!classSectionId,
  })
}
