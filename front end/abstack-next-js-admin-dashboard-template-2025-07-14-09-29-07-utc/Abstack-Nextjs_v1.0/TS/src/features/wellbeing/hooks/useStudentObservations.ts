'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { BehavioralObservation } from '../types'

export function useStudentObservations(studentId: string | null) {
  return useQuery<BehavioralObservation[]>({
    queryKey: ['student-observations', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get<BehavioralObservation[]>(`/behavioral-observations/student/${studentId}`)
      return data
    },
    enabled: !!studentId,
  })
}
