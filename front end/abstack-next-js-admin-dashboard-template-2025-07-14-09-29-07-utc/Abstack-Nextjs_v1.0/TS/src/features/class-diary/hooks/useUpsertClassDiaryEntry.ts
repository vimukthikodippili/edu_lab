'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { ClassDiaryEntryRecord, UpsertClassDiaryEntryPayload } from '../types'

export function useUpsertClassDiaryEntry() {
  const qc = useQueryClient()
  return useMutation<ClassDiaryEntryRecord, Error, UpsertClassDiaryEntryPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put<ClassDiaryEntryRecord>(ENDPOINTS.CLASS_DIARY.ENTRY, payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['class-diary-daily'] })
    },
  })
}
