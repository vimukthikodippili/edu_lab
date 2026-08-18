'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export type AttendanceTrendGranularity = 'day' | 'month' | 'year'

export interface StaffAttendanceTrendBucket {
  bucket: string
  presentLikeCount: number
  totalCount: number
  rate: number
}

export function useStaffAttendanceTrend(granularity: AttendanceTrendGranularity, from: string, to: string) {
  return useQuery<StaffAttendanceTrendBucket[]>({
    queryKey: ['attendance', 'staff-trend', granularity, from, to],
    enabled: !!from && !!to,
    queryFn: async () => {
      const { data } = await apiClient.get<StaffAttendanceTrendBucket[]>('/attendance/staff/trend', {
        params: { granularity, from, to },
      })
      return data
    },
  })
}
