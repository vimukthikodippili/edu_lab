'use client'
import { useState } from 'react'
import {
  DISORDER_SECTION_LABELS,
  RISK_CATEGORY_LABELS,
  type CreateDisorderRegistryPayload,
  type DisorderRegistryEntry,
  type DisorderSection,
  type RiskCategory,
  type UpdateDisorderRegistryPayload,
} from '@/types/sims/disorder-registry'

interface DisorderRegistryFormModalProps {
  domain: DisorderRegistryEntry | null
  onClose: () => void
  onSubmit: (payload: CreateDisorderRegistryPayload | UpdateDisorderRegistryPayload) => void
  isPending: boolean
}

function toCsv(items: string[]): string {
  return items.join(', ')
}

function fromCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export default function DisorderRegistryFormModal({ domain, onClose, onSubmit, isPending }: DisorderRegistryFormModalProps) {
  const [code, setCode] = useState(domain?.code ?? '')
  const [name, setName] = useState(domain?.name ?? '')
  const [section, setSection] = useState<DisorderSection>(domain?.section ?? 'educational_disorders')
  const [riskCategory, setRiskCategory] = useState<RiskCategory>(domain?.riskCategory ?? 'academic_risk')
  const [ageMin, setAgeMin] = useState(domain?.ageMin ?? 5)
  const [ageMax, setAgeMax] = useState(domain?.ageMax ?? 19)
  const [symptoms, setSymptoms] = useState(toCsv(domain?.symptoms ?? []))
  const [tests, setTests] = useState(toCsv(domain?.tests ?? []))
  const [safetyFlag, setSafetyFlag] = useState(domain?.safetyFlag ?? false)

  const isValid = code.trim().length > 0 && name.trim().length > 0 && ageMax >= ageMin

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      code: code.trim(),
      name: name.trim(),
      section,
      riskCategory,
      ageMin,
      ageMax,
      symptoms: fromCsv(symptoms),
      tests: fromCsv(tests),
      safetyFlag,
    })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{domain ? 'Edit Domain' : 'Add Domain'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold small">Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MHA-DOM-22"
                    value={code}
                    maxLength={40}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="col-md-8">
                  <label className="form-label fw-semibold small">Domain / Disorder Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Depression"
                    value={name}
                    maxLength={200}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Section</label>
                  <select
                    className="form-select"
                    value={section}
                    onChange={(e) => setSection(e.target.value as DisorderSection)}
                  >
                    {Object.entries(DISORDER_SECTION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Risk Category</label>
                  <select
                    className="form-select"
                    value={riskCategory}
                    onChange={(e) => setRiskCategory(e.target.value as RiskCategory)}
                  >
                    {Object.entries(RISK_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold small">Age Min</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={25}
                    value={ageMin}
                    onChange={(e) => setAgeMin(Number(e.target.value))}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold small">Age Max</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={25}
                    value={ageMax}
                    onChange={(e) => setAgeMax(Number(e.target.value))}
                  />
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="safetyFlag"
                      checked={safetyFlag}
                      onChange={(e) => setSafetyFlag(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="safetyFlag">
                      Safety flag (triggers immediate counselor/principal escalation)
                    </label>
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold small">Symptoms (comma-separated)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. persistent sadness, loss of interest, fatigue"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold small">Reference Test(s) (comma-separated)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. DASS-21, PHQ-A (Adolescent Depression)"
                    value={tests}
                    onChange={(e) => setTests(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : domain ? 'Save Changes' : 'Add Domain'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
