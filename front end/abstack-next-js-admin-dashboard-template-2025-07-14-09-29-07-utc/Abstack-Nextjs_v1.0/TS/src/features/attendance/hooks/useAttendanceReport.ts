'use client'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

export interface StudentReportRow {
  studentId: string
  studentName: string
  admissionNumber: string
  present: number
  absent: number
  late: number
  excused: number
  medical: number
  total: number
  attendanceRate: number
}

export interface ReportSummary {
  present: number
  absent: number
  late: number
  excused: number
  medical: number
  total: number
  attendanceRate: number
}

export interface AttendanceReport {
  filters: ReportFilters
  summary: ReportSummary
  rows: StudentReportRow[]
  generatedAt: string
}

export interface ReportFilters {
  classSectionId?: number | null
  studentId?: string | null
  startDate: string
  endDate: string
}

export function useAttendanceReport(filters: ReportFilters | null) {
  return useQuery<AttendanceReport>({
    queryKey: ['attendance-report', filters],
    enabled: !!filters,
    queryFn: async () => {
      const params: Record<string, unknown> = {
        startDate: filters!.startDate,
        endDate: filters!.endDate,
      }
      if (filters!.classSectionId) params.classSectionId = filters!.classSectionId
      if (filters!.studentId) params.studentId = filters!.studentId
      const { data } = await apiClient.get<AttendanceReport>('/attendance/reports', { params })
      return data
    },
  })
}
