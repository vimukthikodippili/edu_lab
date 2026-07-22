'use client'
import { useState } from 'react'
import { useLabTypes } from '@/features/labs/hooks/useLabTypes'
import type { EquipmentCategory, CreateEquipmentCategoryPayload, UpdateEquipmentCategoryPayload } from '@/types/sims/equipment'

interface EquipmentCategoryFormModalProps {
  category: EquipmentCategory | null
  onClose: () => void
  onSubmit: (payload: CreateEquipmentCategoryPayload | UpdateEquipmentCategoryPayload) => void
  isPending: boolean
}

export default function EquipmentCategoryFormModal({ category, onClose, onSubmit, isPending }: EquipmentCategoryFormModalProps) {
  const { data: labTypes, isLoading: labTypesLoading } = useLabTypes()
  const [labTypeId, setLabTypeId] = useState(category?.labTypeId ?? '')
  const [name, setName] = useState(category?.name ?? '')

  const isValid = labTypeId && name.trim().length > 0

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({ labTypeId, name: name.trim() })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{category ? 'Edit Equipment Category' : 'Add Equipment Category'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Lab Type</label>
                <select
                  className="form-select"
                  value={labTypeId}
                  disabled={labTypesLoading}
                  onChange={(e) => setLabTypeId(e.target.value)}
                >
                  <option value="">Select type…</option>
                  {(labTypes ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-1">
                <label className="form-label fw-semibold small">Category Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Glassware"
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
                {isPending ? <span className="spinner-border spinner-border-sm" /> : category ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
