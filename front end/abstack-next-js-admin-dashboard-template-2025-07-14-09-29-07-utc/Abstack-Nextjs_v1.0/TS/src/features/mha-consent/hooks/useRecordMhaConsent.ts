'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { MhaConsentRecord, RecordMhaConsentPayload } from '@/types/sims/mha-consent'

export function useRecordMhaConsent() {
  const qc = useQueryClient()
  return useMutation<MhaConsentRecord, Error, { studentId: string; payload: RecordMhaConsentPayload }>({
    mutationFn: async ({ studentId, payload }) => {
      const { data } = await apiClient.post<MhaConsentRecord>(ENDPOINTS.MHA_CONSENT.RECORD(studentId), payload)
      return data
    },
    onSuccess: (_result, { studentId }) => {
      void qc.invalidateQueries({ queryKey: ['mha-consent-status', studentId] })
    },
  })
}
