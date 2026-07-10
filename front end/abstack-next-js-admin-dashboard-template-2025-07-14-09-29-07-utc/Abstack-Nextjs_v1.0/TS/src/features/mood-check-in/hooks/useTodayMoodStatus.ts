'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { MoodCheckIn } from '../types'

export function useTodayMoodStatus() {
  return useQuery<MoodCheckIn | null>({
    queryKey: ['mood-check-in-today'],
    queryFn: async () => {
      const { data } = await apiClient.get<MoodCheckIn | null>('/mood-check-ins/today')
      return data ?? null
    },
  })
}
