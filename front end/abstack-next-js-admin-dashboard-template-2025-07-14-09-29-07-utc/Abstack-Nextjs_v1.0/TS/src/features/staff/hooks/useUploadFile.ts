'use client'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'

interface UploadedFile {
  id: string
  path: string
}

export function useUploadFile() {
  return useMutation<{ file: UploadedFile }, Error, File>({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post<{ file: UploadedFile }>('/files/upload', form, {
        headers: { 'Content-Type': undefined },
      })
      return data
    },
  })
}
