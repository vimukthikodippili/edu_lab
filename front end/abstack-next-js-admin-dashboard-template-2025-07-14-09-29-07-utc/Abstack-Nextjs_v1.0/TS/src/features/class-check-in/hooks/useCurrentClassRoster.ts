'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { CurrentClassRoster } from '../types'

export function useCurrentClassRoster(enabled: boolean) {
  return useQuery<CurrentClassRoster>({
    queryKey: ['check-in-current-class-roster'],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentClassRoster>(
        ENDPOINTS.CLASS_CHECK_IN.CURRENT_CLASS_ROSTER,
      )
      return data
    },
  })
}
