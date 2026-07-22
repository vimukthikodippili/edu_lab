'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { LabDirectoryRow } from '@/types/sims/labs'

export function useLabsDirectory() {
  return useQuery<LabDirectoryRow[]>({
    queryKey: ['labs-directory'],
    queryFn: async () => {
      const { data } = await apiClient.get<LabDirectoryRow[]>(ENDPOINTS.LABS.DIRECTORY)
      return data
    },
    // The badge is time-sensitive (period-based) — keep it reasonably fresh without polling
    // aggressively.
    refetchInterval: 60_000,
  })
}
