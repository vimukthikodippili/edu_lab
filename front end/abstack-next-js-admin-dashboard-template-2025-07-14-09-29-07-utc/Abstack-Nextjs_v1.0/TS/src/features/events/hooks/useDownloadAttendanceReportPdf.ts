'use client'
import { useState } from 'react'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

// Blob-download pattern matches ASSESSMENT_MATRIX.EXPORT's existing precedent.
export function useDownloadAttendanceReportPdf() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = async (eventId: string, eventName: string) => {
    setIsDownloading(true)
    try {
      const res = await apiClient.get(ENDPOINTS.EVENTS.ATTENDANCE_REPORT_PDF(eventId), { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${eventName.replace(/\s+/g, '-').toLowerCase()}-attendance.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return { download, isDownloading }
}
