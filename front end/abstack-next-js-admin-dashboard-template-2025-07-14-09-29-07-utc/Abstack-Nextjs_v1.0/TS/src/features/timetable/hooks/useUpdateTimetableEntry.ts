'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { TimetableEntry } from '../types'

export interface UpdateEntryPayload {
  id: number
  day?: number
  period?: number
  roomNumber?: string | null
}

export function useUpdateTimetableEntry() {
  const qc = useQueryClient()
  return useMutation<TimetableEntry, Error, UpdateEntryPayload>({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await apiClient.patch<TimetableEntry>(`/timetable/entries/${id}`, body)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}
