'use client'
import { useState } from 'react'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useSportTypes } from '@/features/sports/hooks/useSportTypes'
import type { Sport, CreateSportPayload, UpdateSportPayload } from '@/types/sims/sports'

interface SportFormModalProps {
  sport: Sport | null
  onClose: () => void
  onSubmit: (payload: CreateSportPayload | UpdateSportPayload) => void
  isPending: boolean
}

export default function SportFormModal({ sport, onClose, onSubmit, isPending }: SportFormModalProps) {
  const { data: staffData } = useStaff({ limit: 100 })
  const coaches = staffData?.data ?? []
  const { data: sportTypes, isLoading: sportTypesLoading } = useSportTypes()

  const [name, setName] = useState(sport?.name ?? '')
  const [sportTypeId, setSportTypeId] = useState(sport?.sportTypeId ?? '')
  const [seasonStart, setSeasonStart] = useState(sport?.seasonStart?.slice(0, 10) ?? '')
  const [seasonEnd, setSeasonEnd] = useState(sport?.seasonEnd?.slice(0, 10) ?? '')
  const [description, setDescription] = useState(sport?.description ?? '')
  const [coachId, setCoachId] = useState(sport?.coachId ?? '')

  const isValid = name.trim() && sportTypeId && seasonStart && seasonEnd && coachId

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      name: name.trim(),
      sportTypeId,
      seasonStart,
      seasonEnd,
      description: description.trim() || undefined,
      coachId,
    })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{sport ? 'Edit Sport' : 'Create Sport'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Sport Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Under-17 Cricket"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12">
                  <label className="form-label fw-semibold small">Sport Type</label>
                  <select
                    className="form-select"
                    value={sportTypeId}
                    disabled={sportTypesLoading}
                    onChange={(e) => setSportTypeId(e.target.value)}
                  >
                    <option value="">Select sport type…</option>
                    {(sportTypes ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {!sportTypesLoading && (sportTypes ?? []).length === 0 && (
                    <div className="form-text text-warning">
                      No sport types configured yet — add one under Sport Types.
                    </div>
                  )}
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Season Start</label>
                  <input
                    type="date"
                    className="form-control"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Season End</label>
                  <input
                    type="date"
                    className="form-control"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">Coach</label>
                <select
                  className="form-select"
                  value={coachId}
                  onChange={(e) => setCoachId(e.target.value)}
                >
                  <option value="">Select coach…</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="mb-1">
                <label className="form-label fw-semibold small">Description (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : sport ? 'Save Changes' : 'Create Sport'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
