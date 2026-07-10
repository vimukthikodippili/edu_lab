'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ClassSection } from '../types'

export function useMyClassTeacherSections() {
  return useQuery<ClassSection[]>({
    queryKey: ['my-class-teacher-sections'],
    queryFn: async () => {
      const { data } = await apiClient.get<ClassSection[]>('/students/class-sections/my-class-teacher-section')
      return data
    },
  })
}
