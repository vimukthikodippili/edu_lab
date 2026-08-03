'use client'
import { useState } from 'react'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'

export function useDownloadBadgePdf() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = async (logId: string, visitorName: string) => {
    setIsDownloading(true)
    try {
      const res = await apiClient.get(ENDPOINTS.VISITORS.BADGE_PDF(logId), { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${visitorName.replace(/\s+/g, '-').toLowerCase()}-visitor-badge.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return { download, isDownloading }
}
