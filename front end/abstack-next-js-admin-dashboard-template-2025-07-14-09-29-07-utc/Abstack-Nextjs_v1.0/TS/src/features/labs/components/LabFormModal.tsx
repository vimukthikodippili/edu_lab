'use client'
import { useState } from 'react'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useLabTypes } from '../hooks/useLabTypes'
import type { Lab, CreateLabPayload, UpdateLabPayload } from '@/types/sims/labs'

interface LabFormModalProps {
  lab: Lab | null
  onClose: () => void
  onSubmit: (payload: CreateLabPayload | UpdateLabPayload) => void
  isPending: boolean
}

export default function LabFormModal({ lab, onClose, onSubmit, isPending }: LabFormModalProps) {
  const { data: staffData } = useStaff({ limit: 100 })
  const staffOptions = staffData?.data ?? []
  const { data: labTypes, isLoading: labTypesLoading } = useLabTypes()

  const [name, setName] = useState(lab?.name ?? '')
  const [labTypeId, setLabTypeId] = useState(lab?.labTypeId ?? '')
  const [capacity, setCapacity] = useState(lab?.capacity ?? 20)
  const [roomNumber, setRoomNumber] = useState(lab?.roomNumber ?? '')
  const [labInChargeId, setLabInChargeId] = useState(lab?.labInChargeId ?? '')

  const isValid = name.trim() && labTypeId && capacity > 0 && roomNumber.trim() && labInChargeId

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      name: name.trim(),
      labTypeId,
      capacity,
      roomNumber: roomNumber.trim(),
      labInChargeId,
    })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{lab ? 'Edit Lab' : 'Register Lab'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Lab Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Chemistry Lab 1"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
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
                <div className="col-6">
                  <label className="form-label fw-semibold small">Room Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. S-101"
                    value={roomNumber}
                    maxLength={50}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Capacity</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Lab In-Charge</label>
                  <select
                    className="form-select"
                    value={labInChargeId}
                    onChange={(e) => setLabInChargeId(e.target.value)}
                  >
                    <option value="">Select staff…</option>
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : lab ? 'Save Changes' : 'Register Lab'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
