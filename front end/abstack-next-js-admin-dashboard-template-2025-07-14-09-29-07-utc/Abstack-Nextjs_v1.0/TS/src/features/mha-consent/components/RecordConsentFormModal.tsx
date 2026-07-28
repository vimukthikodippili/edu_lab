'use client'
import { useState } from 'react'
import type { Guardian } from '@/features/students/types'
import { MHA_CONSENT_METHOD_LABELS, type MhaConsentMethod, type RecordMhaConsentPayload } from '@/types/sims/mha-consent'

interface RecordConsentFormModalProps {
  guardians: Guardian[]
  onClose: () => void
  onSubmit: (payload: RecordMhaConsentPayload) => void
  isPending: boolean
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function RecordConsentFormModal({ guardians, onClose, onSubmit, isPending }: RecordConsentFormModalProps) {
  const [guardianId, setGuardianId] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianContact, setGuardianContact] = useState('')
  const [method, setMethod] = useState<MhaConsentMethod>('written')
  const [consentedAt, setConsentedAt] = useState(todayIso())

  const isValid = guardianName.trim().length > 0 && guardianContact.trim().length > 0

  const handlePickGuardian = (id: string) => {
    setGuardianId(id)
    const g = guardians.find((x) => x.id === id)
    if (g) {
      setGuardianName(`${g.firstName} ${g.lastName}`)
      setGuardianContact(g.email ? `${g.phone} · ${g.email}` : g.phone)
    }
  }

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      guardianId: guardianId || undefined,
      guardianName: guardianName.trim(),
      guardianContact: guardianContact.trim(),
      method,
      consentedAt: consentedAt ? new Date(consentedAt).toISOString() : undefined,
    })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Record Guardian Consent</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {guardians.length > 0 && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Linked Guardian (optional autofill)</label>
                  <select
                    className="form-select"
                    value={guardianId}
                    onChange={(e) => handlePickGuardian(e.target.value)}
                  >
                    <option value="">— Enter details manually —</option>
                    {guardians.map((g) => (
                      <option key={g.id} value={g.id}>{g.firstName} {g.lastName} ({g.relationship})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-semibold small">Guardian Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Sunethra Perera"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Guardian Contact</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Phone or email"
                  value={guardianContact}
                  onChange={(e) => setGuardianContact(e.target.value)}
                />
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Consent Method</label>
                  <select
                    className="form-select"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as MhaConsentMethod)}
                  >
                    {Object.entries(MHA_CONSENT_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Consented On</label>
                  <input
                    type="date"
                    className="form-control"
                    value={consentedAt}
                    max={todayIso()}
                    onChange={(e) => setConsentedAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="alert alert-info small mt-3 mb-0">
                Recording a new consent supersedes any prior consent for this student — the previous
                record is kept, never deleted, as a permanent history.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : 'Record Consent'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
