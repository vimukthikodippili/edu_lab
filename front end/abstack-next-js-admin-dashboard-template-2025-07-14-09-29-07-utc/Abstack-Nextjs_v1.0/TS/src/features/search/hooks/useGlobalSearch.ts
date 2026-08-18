'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { GlobalSearchResult } from '../types'

export function useGlobalSearch(q: string) {
  const trimmed = q.trim()
  return useQuery<GlobalSearchResult[]>({
    queryKey: ['global-search', trimmed],
    enabled: trimmed.length > 0,
    queryFn: async () => {
      const { data } = await apiClient.get<GlobalSearchResult[]>('/search', { params: { q: trimmed } })
      return data
    },
  })
}
