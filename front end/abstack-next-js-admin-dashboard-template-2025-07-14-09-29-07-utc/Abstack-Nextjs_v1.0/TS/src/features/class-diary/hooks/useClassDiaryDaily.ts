'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ClassDiarySlot } from '../types'

export function useClassDiaryDaily(date: string) {
  return useQuery<ClassDiarySlot[]>({
    queryKey: ['class-diary-daily', date],
    enabled: Boolean(date),
    queryFn: async () => {
      const { data } = await apiClient.get<ClassDiarySlot[]>(ENDPOINTS.CLASS_DIARY.DAILY, {
        params: { date },
      })
      return data
    },
  })
}
