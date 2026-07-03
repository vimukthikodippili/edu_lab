import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { SubstituteAssignment } from '@/types/sims/substitute'

export function useSubstituteSuggestions(status?: string) {
  return useQuery<SubstituteAssignment[]>({
    queryKey: ['substitute-suggestions', status],
    queryFn: () =>
      apiClient
        .get<SubstituteAssignment[]>(ENDPOINTS.SUBSTITUTE.LIST, {
          params: status ? { status } : {},
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })
}
