'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ALStream } from '../types'

export function useStreams(includeInactive = false) {
  return useQuery<ALStream[]>({
    queryKey: ['al-streams', { includeInactive }],
    queryFn: async () => {
      const { data } = await apiClient.get<ALStream[]>('/enrollments/streams', {
        params: includeInactive ? { includeInactive: 'true' } : {},
      })
      return data
    },
  })
}
