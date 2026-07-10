'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { BehavioralObservation } from '../types'

export interface LogBehavioralObservationPayload {
  studentId: string
  notes: string
}

export function useLogBehavioralObservation() {
  return useMutation<BehavioralObservation, Error, LogBehavioralObservationPayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<BehavioralObservation>('/behavioral-observations', payload)
      return data
    },
  })
}
