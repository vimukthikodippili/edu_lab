'use client'
import { useState } from 'react'
import type { MarkAsLeavingPayload } from '../hooks/useMarkAsLeaving'

interface Props {
  studentName: string
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: MarkAsLeavingPayload) => void
}

export function MarkAsLeavingModal({ studentName, isOpen, isSubmitting, onClose, onSubmit }: Props) {
  const [status, setStatus] = useState<MarkAsLeavingPayload['status']>('transferred')
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ status, reason: reason.trim() || undefined })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Mark {studentName} as Leaving</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Reason for leaving</label>
                  <div className="d-flex gap-3">
                    <div className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        id="leaving-transferred"
                        checked={status === 'transferred'}
                        onChange={() => setStatus('transferred')}
                      />
                      <label className="form-check-label" htmlFor="leaving-transferred">Transferred</label>
                    </div>
                    <div className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        id="leaving-graduated"
                        checked={status === 'graduated'}
                        onChange={() => setStatus('graduated')}
                      />
                      <label className="form-check-label" htmlFor="leaving-graduated">Graduated</label>
                    </div>
                  </div>
                </div>
                <div className="mb-1">
                  <label className="form-label fw-semibold small">Notes (optional)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. transferring to Royal College, Colombo…"
                  />
                </div>
                <p className="text-muted small mb-0">
                  This updates the student&apos;s status and cannot easily be undone from this screen.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
