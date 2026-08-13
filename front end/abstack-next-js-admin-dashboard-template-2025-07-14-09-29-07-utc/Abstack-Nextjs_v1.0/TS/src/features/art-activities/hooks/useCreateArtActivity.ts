import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { ArtActivity, CreateArtActivityPayload } from '@/types/sims/art-activity'

export function useCreateArtActivity() {
  const queryClient = useQueryClient()
  return useMutation<ArtActivity, Error, CreateArtActivityPayload>({
    mutationFn: (payload) => apiClient.post('/art-activities', payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['art-activities', variables.classSectionId] })
    },
  })
}
