'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PaginatedStudents, StudentStatus } from '../types'

export interface StudentsFilter {
  page?: number
  limit?: number
  search?: string
  gradeId?: number
  classSectionId?: number
  status?: StudentStatus
  academicYear?: string
}

export function useStudents(filter: StudentsFilter = {}) {
  return useQuery<PaginatedStudents>({
    queryKey: ['students', filter],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedStudents>('/students', { params: filter })
      return data
    },
  })
}
