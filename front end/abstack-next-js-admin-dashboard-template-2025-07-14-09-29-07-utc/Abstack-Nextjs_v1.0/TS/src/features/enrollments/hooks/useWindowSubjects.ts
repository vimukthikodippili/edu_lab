'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Subject } from '@/features/subjects/types'
import type { SubjectSelectionWindowSubjectRow } from '@/types/sims/subject-selection'

export function useWindowCoreSubjects(windowId: string | null) {
  return useQuery<SubjectSelectionWindowSubjectRow[]>({
    queryKey: ['subject-selection-window-core-subjects', windowId],
    enabled: !!windowId,
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectSelectionWindowSubjectRow[]>(
        `/enrollments/subject-selection-windows/${windowId}/core-subjects`,
      )
      return data
    },
  })
}

export function useWindowOptionalSubjects(windowId: string | null) {
  return useQuery<SubjectSelectionWindowSubjectRow[]>({
    queryKey: ['subject-selection-window-optional-subjects', windowId],
    enabled: !!windowId,
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectSelectionWindowSubjectRow[]>(
        `/enrollments/subject-selection-windows/${windowId}/optional-subjects`,
      )
      return data
    },
  })
}

export function useSetWindowCoreSubjects(windowId: string) {
  const qc = useQueryClient()
  return useMutation<Subject[], Error, string[]>({
    mutationFn: async (subjectIds) => {
      const { data } = await apiClient.post(
        `/enrollments/subject-selection-windows/${windowId}/core-subjects`,
        { subjectIds },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-selection-window-core-subjects', windowId] })
    },
  })
}

export function useSetWindowOptionalSubjects(windowId: string) {
  const qc = useQueryClient()
  return useMutation<Subject[], Error, string[]>({
    mutationFn: async (subjectIds) => {
      const { data } = await apiClient.post(
        `/enrollments/subject-selection-windows/${windowId}/optional-subjects`,
        { subjectIds },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subject-selection-window-optional-subjects', windowId] })
    },
  })
}
