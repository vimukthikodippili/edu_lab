'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import type { PortalRoleId } from '../types'

interface SystemRoleResponse {
  hasAccount: boolean
  roleId: number | null
}

export function useStaffSystemRole(staffId: string) {
  return useQuery<SystemRoleResponse>({
    queryKey: ['staff', staffId, 'system-role'],
    queryFn: async () => {
      const { data } = await apiClient.get<SystemRoleResponse>(`/staff/${staffId}/system-role`)
      return data
    },
    enabled: !!staffId,
  })
}

export function useChangeStaffSystemRole(staffId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { roleId: PortalRoleId }>({
    mutationFn: async (payload) => {
      await apiClient.patch(`/staff/${staffId}/system-role`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', staffId, 'system-role'] })
    },
  })
}
