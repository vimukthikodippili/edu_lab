'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CommitPromotionEntry } from '../types-promotion'
import type { Student } from '../types'

export function useCommitPromotion() {
  const qc = useQueryClient()
  return useMutation<Student[], Error, CommitPromotionEntry[]>({
    mutationFn: async (entries) => {
      const { data } = await apiClient.post<Student[]>('/students/promote-year/commit', { entries })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students'] })
      void qc.invalidateQueries({ queryKey: ['class-sections'] })
    },
  })
}
