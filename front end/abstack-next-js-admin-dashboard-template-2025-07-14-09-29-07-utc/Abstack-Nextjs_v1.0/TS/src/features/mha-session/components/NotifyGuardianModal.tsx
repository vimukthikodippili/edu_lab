'use client'
import { useState } from 'react'
import { MessageCircleHeart } from 'lucide-react'
import { useNotifyGuardian } from '../hooks/useNotifyGuardian'

interface NotifyGuardianModalProps {
  sessionId: string
  studentName: string
  onClose: () => void
  onSent: (guardiansNotified: number) => void
}

const NOTE_MAX_LENGTH = 200

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

// AC #69 — exact wording, must match the backend's buildWellbeingCheckInTemplate() literally.
function buildTemplatePreview(studentName: string): string {
  return `A wellbeing check-in has been recommended for ${studentName}. Please contact the school counselor for a conversation.`
}

export default function NotifyGuardianModal({ sessionId, studentName, onClose, onSent }: NotifyGuardianModalProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const notifyMutation = useNotifyGuardian()

  const handleSend = () => {
    setError(null)
    notifyMutation.mutate(
      { sessionId, payload: { note: note.trim() || undefined } },
      {
        onSuccess: (result) => onSent(result.guardiansNotified),
        onError: (err) => setError(extractErrorMessage(err)),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <MessageCircleHeart size={20} className="text-success" /> Notify Guardian (Non-Clinical)
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="small text-muted">
                Sends a non-clinical wellbeing check-in notification (SMS + push) to every guardian linked to this
                student. No risk levels, domain names, or clinical language are ever included.
              </p>

              <label className="form-label fw-semibold small">Message Preview</label>
              <div className="p-3 mb-3 rounded-3 bg-light border small">
                {buildTemplatePreview(studentName)}
                {note.trim() && <span> {note.trim()}</span>}
              </div>

              <label className="form-label fw-semibold small" htmlFor="guardianNote">
                Optional Note (plain language only)
              </label>
              <textarea
                id="guardianNote"
                className="form-control"
                rows={2}
                maxLength={NOTE_MAX_LENGTH}
                placeholder="e.g. Please call after 4pm."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="d-flex justify-content-between mt-1">
                <span className="small text-muted">No risk levels, domain names, or clinical terms.</span>
                <span className="small text-muted">{note.length}/{NOTE_MAX_LENGTH}</span>
              </div>

              {error && <div className="alert alert-danger small mt-3 mb-0">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={notifyMutation.isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success btn-sm" onClick={handleSend} disabled={notifyMutation.isPending}>
                {notifyMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
