'use client'
import { useState } from 'react'
import { RISK_CATEGORY_LABELS, type RiskCategory } from '@/types/sims/disorder-registry'
import { DOMAIN_RESULT_LEVEL_LABELS, SELECTABLE_DOMAIN_RESULT_LEVELS, type DomainResultLevel } from '@/types/sims/domain-result'
import {
  ANY_RISK_CATEGORY_LABEL,
  type ActionRuleEntry,
  type CreateActionRulePayload,
  type UpdateActionRulePayload,
} from '@/types/sims/action-rule'

interface ActionRuleFormModalProps {
  rule: ActionRuleEntry | null
  onClose: () => void
  onSubmit: (payload: CreateActionRulePayload | UpdateActionRulePayload) => void
  isPending: boolean
}

const ANY_CATEGORY_VALUE = '__any__'

export default function ActionRuleFormModal({ rule, onClose, onSubmit, isPending }: ActionRuleFormModalProps) {
  const [riskCategory, setRiskCategory] = useState<string>(rule?.riskCategory ?? ANY_CATEGORY_VALUE)
  const [minimumLevel, setMinimumLevel] = useState<DomainResultLevel>(rule?.minimumLevel ?? 'moderate')
  const [actionText, setActionText] = useState(rule?.actionText ?? '')
  const [priority, setPriority] = useState(rule?.priority ?? 1)
  const [isActive, setIsActive] = useState(rule?.isActive ?? true)

  const isValid = actionText.trim().length > 0 && priority >= 1

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      riskCategory: riskCategory === ANY_CATEGORY_VALUE ? null : (riskCategory as RiskCategory),
      minimumLevel,
      actionText: actionText.trim(),
      priority,
      isActive,
    })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{rule ? 'Edit Rule' : 'Add Rule'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Risk Category</label>
                  <select
                    className="form-select"
                    value={riskCategory}
                    onChange={(e) => setRiskCategory(e.target.value)}
                  >
                    <option value={ANY_CATEGORY_VALUE}>{ANY_RISK_CATEGORY_LABEL}</option>
                    {Object.entries(RISK_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Minimum Level</label>
                  <select
                    className="form-select"
                    value={minimumLevel}
                    onChange={(e) => setMinimumLevel(e.target.value as DomainResultLevel)}
                  >
                    {SELECTABLE_DOMAIN_RESULT_LEVELS.map((level) => (
                      <option key={level} value={level}>{DOMAIN_RESULT_LEVEL_LABELS[level]}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold small">Action Text</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Digital Wellbeing Program"
                    value={actionText}
                    maxLength={200}
                    onChange={(e) => setActionText(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Priority (lower runs first)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  />
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="isActive">
                      Active
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : rule ? 'Save Changes' : 'Add Rule'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
