'use client'
import { useState } from 'react'
import { useRequestMarkCorrection } from '../hooks/useRequestMarkCorrection'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { MarkRosterRow } from '@/types/sims/grades'

interface Props {
  row: MarkRosterRow
  onClose: () => void
}

export function RequestCorrectionModal({ row, onClose }: Props) {
  const { showNotification } = useNotificationContext()
  const requestCorrection = useRequestMarkCorrection()
  const [correctedScore, setCorrectedScore] = useState(row.score !== null ? String(row.score) : '')
  const [reason, setReason] = useState('')

  const numeric = correctedScore.trim() === '' ? null : Number(correctedScore)
  const isInvalid = numeric === null || Number.isNaN(numeric) || numeric < 0 || numeric > row.maxScore
  const canSubmit = !isInvalid && reason.trim().length > 0 && !requestCorrection.isPending

  const handleSubmit = () => {
    if (!canSubmit || !row.markId) return
    requestCorrection.mutate(
      { markId: row.markId, correctedScore: numeric!, reason: reason.trim() },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: 'Correction request submitted for Principal approval.',
          })
          onClose()
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message ?? 'Failed to submit the correction request.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  return (
    <div
      className="modal d-block"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow rounded-4">
          <div
            className="modal-header border-0 rounded-top-4"
            style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
          >
            <h6 className="modal-title text-white fw-bold mb-0">Request Mark Correction</h6>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            <p className="small text-muted mb-3">
              {row.firstName} {row.lastName} ({row.admissionNumber}) — this mark has been submitted and is locked.
              A Principal must approve this correction before the score changes.
            </p>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Current score</label>
              <input type="text" className="form-control form-control-sm" value={row.score ?? '—'} disabled />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Corrected score</label>
              <input
                type="number"
                className={`form-control form-control-sm ${isInvalid && correctedScore !== '' ? 'is-invalid' : ''}`}
                min={0}
                max={row.maxScore}
                step="0.5"
                value={correctedScore}
                onChange={(e) => setCorrectedScore(e.target.value)}
              />
              <div className="form-text">Maximum: {row.maxScore}</div>
            </div>

            <div className="mb-1">
              <label className="form-label small fw-semibold">Reason (required)</label>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this mark needs to change…"
              />
            </div>
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm text-white fw-semibold"
              style={{ background: 'var(--edulab-accent)', border: 'none' }}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {requestCorrection.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
