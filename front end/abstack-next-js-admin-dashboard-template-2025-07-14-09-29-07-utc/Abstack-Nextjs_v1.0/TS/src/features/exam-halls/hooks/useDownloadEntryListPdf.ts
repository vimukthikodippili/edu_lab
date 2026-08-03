'use client'
import { useState } from 'react'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDownloadEntryListPdf() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = async (examId: string, examHallId: string, hallName: string) => {
    setIsDownloading(true)
    try {
      const res = await apiClient.get(ENDPOINTS.EXAMS.ENTRY_LIST_PDF(examId, examHallId), { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${hallName.replace(/\s+/g, '-').toLowerCase()}-entry-list.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return { download, isDownloading }
}
