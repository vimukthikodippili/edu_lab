'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PromotionPreviewRow } from '../types-promotion'

export function usePromotionPreview() {
  return useMutation<PromotionPreviewRow[], Error, { sourceAcademicYear: string; targetAcademicYear: string }>({
    mutationFn: async (params) => {
      const { data } = await apiClient.get<PromotionPreviewRow[]>('/students/promote-year/preview', { params })
      return data
    },
  })
}
