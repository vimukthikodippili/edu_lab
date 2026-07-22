import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { Assessment, AssessmentType } from '@/types/sims/grades'
import type { TopicAllocation } from '@/features/subject-topics/components/TopicAllocationEditor'

interface CreateAssessmentPayload {
  subjectId: string
  termId: number
  classSectionId: number
  title: string
  assessmentType: AssessmentType
  scheduledDate: string
  topicAllocations: TopicAllocation[]
  sectionHeadOverride?: boolean
  requiresMaterialsCheck?: boolean
  instructions?: string
}

export function useCreateAssessment() {
  const queryClient = useQueryClient()
  return useMutation<Assessment, Error, CreateAssessmentPayload>({
    mutationFn: (payload) =>
      apiClient.post('/grades/assessments', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subject-plans'] })
      queryClient.invalidateQueries({ queryKey: ['assessments'] })
    },
  })
}
