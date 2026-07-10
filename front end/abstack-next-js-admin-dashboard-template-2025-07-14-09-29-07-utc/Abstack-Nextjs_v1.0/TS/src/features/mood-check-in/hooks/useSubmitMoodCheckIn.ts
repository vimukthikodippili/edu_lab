'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { MoodCheckIn } from '../types'

export function useSubmitMoodCheckIn() {
  const qc = useQueryClient()
  return useMutation<MoodCheckIn, Error, number>({
    mutationFn: async (moodValue) => {
      const { data } = await apiClient.post<MoodCheckIn>('/mood-check-ins', { moodValue })
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(['mood-check-in-today'], data)
    },
  })
}
