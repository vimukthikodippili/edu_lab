'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export function useDeleteTimetableEntry() {
  const qc = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.delete(`/timetable/entries/${id}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}
