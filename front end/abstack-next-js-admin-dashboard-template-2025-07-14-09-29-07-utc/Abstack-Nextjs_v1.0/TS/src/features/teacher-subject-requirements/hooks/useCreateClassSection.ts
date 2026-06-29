'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ClassSection } from '../types'

export interface CreateClassSectionPayload {
  gradeId: number
  name: string
  academicYear: string
}

export function useCreateClassSection() {
  const qc = useQueryClient()
  return useMutation<ClassSection, Error, CreateClassSectionPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<ClassSection>('/students/class-sections', payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['class-sections'] })
    },
  })
}
