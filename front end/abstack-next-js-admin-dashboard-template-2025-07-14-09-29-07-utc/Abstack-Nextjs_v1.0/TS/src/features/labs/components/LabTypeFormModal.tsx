'use client'
import { useState } from 'react'
import type { LabType, CreateLabTypePayload, UpdateLabTypePayload } from '@/types/sims/labs'

interface LabTypeFormModalProps {
  labType: LabType | null
  onClose: () => void
  onSubmit: (payload: CreateLabTypePayload | UpdateLabTypePayload) => void
  isPending: boolean
}

export default function LabTypeFormModal({ labType, onClose, onSubmit, isPending }: LabTypeFormModalProps) {
  const [name, setName] = useState(labType?.name ?? '')

  const isValid = name.trim().length > 0

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({ name: name.trim() })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{labType ? 'Edit Lab Type' : 'Add Lab Type'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-1">
                <label className="form-label fw-semibold small">Lab Type Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Robotics"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : labType ? 'Save Changes' : 'Add Lab Type'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
