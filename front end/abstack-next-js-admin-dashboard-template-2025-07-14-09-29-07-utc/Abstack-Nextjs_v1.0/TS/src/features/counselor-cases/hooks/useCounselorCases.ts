'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { CounselorCase, CounselorCaseStatus } from '../types'

export function useCounselorCases(status?: CounselorCaseStatus) {
  return useQuery<CounselorCase[]>({
    queryKey: ['counselor-cases', status ?? 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<CounselorCase[]>('/counselor-cases', {
        params: status ? { status } : undefined,
      })
      return data
    },
  })
}
