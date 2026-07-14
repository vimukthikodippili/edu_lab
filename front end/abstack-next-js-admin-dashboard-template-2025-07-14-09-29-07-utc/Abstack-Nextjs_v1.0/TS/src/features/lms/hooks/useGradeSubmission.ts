import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { GradeSubmissionPayload, Submission } from '../types'

export function useGradeSubmission(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation<Submission, Error, { submissionId: string; payload: GradeSubmissionPayload }>({
    mutationFn: ({ submissionId, payload }) =>
      apiClient
        .patch(ENDPOINTS.LMS.GRADE(assignmentId, submissionId), payload)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'assignments', assignmentId, 'roster'] })
    },
  })
}
