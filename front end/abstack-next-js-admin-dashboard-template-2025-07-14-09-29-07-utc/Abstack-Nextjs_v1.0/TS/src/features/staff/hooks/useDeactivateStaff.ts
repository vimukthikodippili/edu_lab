'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api/axios'

export function useDeactivateStaff() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation<void, Error, string>({
    mutationFn: async (staffId) => {
      await apiClient.delete(`/staff/${staffId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      router.push('/admin/staff')
    },
  })
}
