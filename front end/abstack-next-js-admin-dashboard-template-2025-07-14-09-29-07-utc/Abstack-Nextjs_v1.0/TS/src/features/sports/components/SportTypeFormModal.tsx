'use client'
import { useState } from 'react'
import type { SportType, CreateSportTypePayload, UpdateSportTypePayload } from '@/types/sims/sports'

interface SportTypeFormModalProps {
  sportType: SportType | null
  onClose: () => void
  onSubmit: (payload: CreateSportTypePayload | UpdateSportTypePayload) => void
  isPending: boolean
}

export default function SportTypeFormModal({ sportType, onClose, onSubmit, isPending }: SportTypeFormModalProps) {
  const [name, setName] = useState(sportType?.name ?? '')
  const [isPersonalBestEligible, setIsPersonalBestEligible] = useState(sportType?.isPersonalBestEligible ?? false)

  const isValid = name.trim().length > 0

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({ name: name.trim(), isPersonalBestEligible })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{sportType ? 'Edit Sport Type' : 'Add Sport Type'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Sport Type Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Karate"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isPersonalBestEligible"
                  checked={isPersonalBestEligible}
                  onChange={(e) => setIsPersonalBestEligible(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="isPersonalBestEligible">
                  Track personal bests for this sport (e.g. race times, distances)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : sportType ? 'Save Changes' : 'Add Sport Type'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
