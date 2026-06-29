'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { GenerationResult } from '../types'

export interface GeneratePayload {
  academicYear: string
  gradeId?: number
}

export function useGenerateTimetable() {
  const qc = useQueryClient()
  return useMutation<GenerationResult, Error, GeneratePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<GenerationResult>('/timetable/generate', payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}
