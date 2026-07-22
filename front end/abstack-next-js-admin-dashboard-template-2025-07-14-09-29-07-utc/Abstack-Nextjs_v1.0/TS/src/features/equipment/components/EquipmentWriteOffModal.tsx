'use client'
import { useState } from 'react'
import { useWriteOffEquipment } from '../hooks/useWriteOffEquipment'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { Equipment } from '@/types/sims/equipment'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

interface EquipmentWriteOffModalProps {
  labId: string
  item: Equipment
  onClose: () => void
}

export default function EquipmentWriteOffModal({ labId, item, onClose }: EquipmentWriteOffModalProps) {
  const { showNotification } = useNotificationContext()
  const writeOffMutation = useWriteOffEquipment(labId)
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const isValid = quantity >= 1 && quantity <= item.quantity && reason.trim().length > 0

  const handleSubmit = () => {
    if (!isValid) return
    setError('')
    writeOffMutation.mutate(
      { id: item.id, payload: { quantity, reason: reason.trim() } },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Equipment written off.' })
          onClose()
        },
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
              <h5 className="modal-title">Write Off — {item.name}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <p className="text-muted small mb-3">Current stock: {item.quantity} {item.unit}</p>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Quantity to write off</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={item.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="mb-1">
                <label className="form-label fw-semibold small">Reason</label>
                <textarea
                  className="form-control"
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Broken during Grade 10 practical"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={writeOffMutation.isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" disabled={!isValid || writeOffMutation.isPending} onClick={handleSubmit}>
                {writeOffMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Write Off'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
