'use client'
import { useState } from 'react'
import { FileSignature, CheckCircle2, XCircle, History } from 'lucide-react'
import { useMyPendingConsentForms } from '../hooks/useMyPendingConsentForms'
import { useMyConsentResponses } from '../hooks/useMyConsentResponses'
import { useRespondToConsent } from '../hooks/useRespondToConsent'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useNotificationContext } from '@/context/useNotificationContext'

function ApiErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

export function ParentConsentContent() {
  const { data: profile } = useMyGuardianProfile()
  const { data: pending, isLoading: pendingLoading } = useMyPendingConsentForms()
  const { data: responses, isLoading: responsesLoading } = useMyConsentResponses()
  const respond = useRespondToConsent()
  const { showNotification } = useNotificationContext()

  const [decliningKey, setDecliningKey] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const studentName = (studentId: string): string => {
    const s = profile?.students.find((st) => st.id === studentId)
    return s ? `${s.firstName} ${s.lastName}` : 'your child'
  }

  const handleSign = (formId: string, studentId: string) => {
    respond.mutate(
      { formId, payload: { studentId, response: 'signed' } },
      {
        onSuccess: () => showNotification({ variant: 'success', message: `Signed for ${studentName(studentId)}.` }),
        onError: (err) => showNotification({ variant: 'danger', message: ApiErrorMessage(err) }),
      },
    )
  }

  const handleDecline = (formId: string, studentId: string) => {
    respond.mutate(
      { formId, payload: { studentId, response: 'declined', reason: reason.trim() || undefined } },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: `Declined for ${studentName(studentId)}.` })
          setDecliningKey(null)
          setReason('')
        },
        onError: (err) => showNotification({ variant: 'danger', message: ApiErrorMessage(err) }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <FileSignature size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Consent Forms</h4>
          <p className="text-muted small mb-0">Sign or decline consent for trips and events on behalf of your children.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <span className="fw-bold text-white">Pending Your Response</span>
        </div>
        <div className="card-body p-0">
          {pendingLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !pending?.length ? (
            <div className="p-5 text-center text-muted">
              <FileSignature size={36} className="mb-2 opacity-25" />
              <p className="mb-0">Nothing pending — you&apos;re all caught up.</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {pending.map(({ form, studentId }) => {
                const key = `${form.id}-${studentId}`
                return (
                  <div key={key} className="list-group-item p-4">
                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                      <div>
                        <div className="fw-semibold">{form.title}</div>
                        <div className="small text-muted mb-1">For {studentName(studentId)}</div>
                        <p className="small mb-1">{form.description}</p>
                        <div className="small text-muted">Deadline: {new Date(form.deadline).toLocaleDateString()}</div>
                      </div>
                      <div className="d-flex flex-column gap-2" style={{ minWidth: 180 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-success d-flex align-items-center gap-1 justify-content-center"
                          disabled={respond.isPending}
                          onClick={() => handleSign(form.id, studentId)}
                        >
                          <CheckCircle2 size={13} /> Sign
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 justify-content-center"
                          disabled={respond.isPending}
                          onClick={() => setDecliningKey(decliningKey === key ? null : key)}
                        >
                          <XCircle size={13} /> Decline
                        </button>
                      </div>
                    </div>
                    {decliningKey === key && (
                      <div className="d-flex gap-2 mt-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Reason (optional)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <button type="button" className="btn btn-sm btn-danger" disabled={respond.isPending} onClick={() => handleDecline(form.id, studentId)}>
                          {respond.isPending ? 'Submitting…' : 'Confirm Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header border-0 py-3 px-4 rounded-top-3 bg-white">
          <span className="fw-bold d-flex align-items-center gap-2"><History size={16} /> Response History</span>
        </div>
        <div className="card-body p-0">
          {responsesLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !responses?.length ? (
            <div className="p-5 text-center text-muted">No responses recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Child</th>
                    <th>Response</th>
                    <th>Reason</th>
                    <th className="pe-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r.id}>
                      <td className="ps-4 small fw-semibold">{studentName(r.studentId)}</td>
                      <td className="small">
                        <span className={`badge ${r.response === 'signed' ? 'bg-success' : 'bg-danger'}`}>{r.response}</span>
                      </td>
                      <td className="small">{r.reason ?? <span className="text-muted">—</span>}</td>
                      <td className="pe-4 small">{new Date(r.respondedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
