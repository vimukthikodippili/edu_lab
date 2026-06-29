'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { SchoolCalendarConfig } from '../types'

export function useCalendarConfigs() {
  return useQuery<SchoolCalendarConfig[]>({
    queryKey: ['school-calendar-configs'],
    queryFn: async () => {
      const { data } = await apiClient.get<SchoolCalendarConfig[]>('/school-calendar-config')
      return data
    },
  })
}
