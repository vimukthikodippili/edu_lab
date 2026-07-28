'use client'
import { useState } from 'react'
import type { Guardian } from '@/features/students/types'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useMhaConsentStatus } from '../hooks/useMhaConsentStatus'
import { useRecordMhaConsent } from '../hooks/useRecordMhaConsent'
import RecordConsentFormModal from './RecordConsentFormModal'
import { MHA_CONSENT_METHOD_LABELS, type RecordMhaConsentPayload } from '@/types/sims/mha-consent'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MHAConsentPanel({ studentId, guardians }: { studentId: string; guardians: Guardian[] }) {
  const { showNotification } = useNotificationContext()
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { data: status, isLoading } = useMhaConsentStatus(studentId)
  const recordMutation = useRecordMhaConsent()

  const handleSubmit = (payload: RecordMhaConsentPayload) => {
    recordMutation.mutate(
      { studentId, payload },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Guardian consent recorded.' })
          setShowForm(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const priorHistory = (status?.history ?? []).filter((h) => h.id !== status?.current?.id)

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-transparent border-bottom fw-semibold py-3 d-flex align-items-center justify-content-between">
        <span>
          <i className="pi pi-shield me-2 text-primary" />
          MHA Guardian Consent
        </span>
        {!isLoading && (
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowForm(true)}>
            {status?.current ? 'Record New Consent' : '+ Record Consent'}
          </button>
        )}
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-muted small">Loading consent status…</div>
        ) : !status?.current ? (
          <div
            className="d-flex align-items-start gap-2 rounded-3 p-3"
            style={{ background: '#fff7ed', color: '#c2410c' }}
          >
            <i className="pi pi-exclamation-triangle mt-1" />
            <div className="small">
              <strong>No consent recorded.</strong> An MHA screening session cannot be initiated for
              this student until guardian consent is documented here.
            </div>
          </div>
        ) : (
          <>
            <div
              className="d-flex align-items-start gap-2 rounded-3 p-3 mb-3"
              style={{ background: '#f0fdf4', color: '#15803d' }}
            >
              <i className="pi pi-check-circle mt-1" />
              <div className="small">
                <strong>Consent on file.</strong> Screening may be initiated for this student.
              </div>
            </div>

            <dl className="row mb-0 small">
              <dt className="col-4 text-muted fw-normal">Guardian</dt>
              <dd className="col-8">{status.current.guardianName}</dd>
              <dt className="col-4 text-muted fw-normal">Contact</dt>
              <dd className="col-8">{status.current.guardianContact}</dd>
              <dt className="col-4 text-muted fw-normal">Method</dt>
              <dd className="col-8">{MHA_CONSENT_METHOD_LABELS[status.current.method]}</dd>
              <dt className="col-4 text-muted fw-normal">Consented On</dt>
              <dd className="col-8 mb-0">{formatDate(status.current.consentedAt)}</dd>
            </dl>

            {priorHistory.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  {showHistory ? 'Hide' : 'Show'} {priorHistory.length} prior consent record{priorHistory.length !== 1 ? 's' : ''}
                </button>
                {showHistory && (
                  <div className="d-flex flex-column gap-2 mt-2">
                    {priorHistory.map((h) => (
                      <div key={h.id} className="border rounded-3 p-2 small text-muted">
                        <div>{h.guardianName} · {h.guardianContact}</div>
                        <div>{MHA_CONSENT_METHOD_LABELS[h.method]} · consented {formatDate(h.consentedAt)}</div>
                        {h.supersededAt && <div>Superseded {formatDate(h.supersededAt)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <RecordConsentFormModal
          guardians={guardians}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          isPending={recordMutation.isPending}
        />
      )}
    </div>
  )
}
