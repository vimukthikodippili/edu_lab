'use client'
import { useState } from 'react'
import { ListChecks, Pencil, Eye, EyeOff } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useActionRules } from '@/features/action-rule/hooks/useActionRules'
import { useCreateActionRule } from '@/features/action-rule/hooks/useCreateActionRule'
import { useUpdateActionRule } from '@/features/action-rule/hooks/useUpdateActionRule'
import ActionRuleFormModal from '@/features/action-rule/components/ActionRuleFormModal'
import { RISK_CATEGORY_LABELS } from '@/types/sims/disorder-registry'
import { DOMAIN_RESULT_LEVEL_LABELS } from '@/types/sims/domain-result'
import {
  ANY_RISK_CATEGORY_LABEL,
  type ActionRuleEntry,
  type CreateActionRulePayload,
  type UpdateActionRulePayload,
} from '@/types/sims/action-rule'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function ActionRulesPage() {
  const { showNotification } = useNotificationContext()

  const [showInactive, setShowInactive] = useState(true)
  const [showFormFor, setShowFormFor] = useState<ActionRuleEntry | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: rules = [], isLoading } = useActionRules(!showInactive)
  const createMutation = useCreateActionRule()
  const updateMutation = useUpdateActionRule()

  const handleCreate = (payload: CreateActionRulePayload | UpdateActionRulePayload) => {
    createMutation.mutate(payload as CreateActionRulePayload, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Rule added.' })
        setShowAddForm(false)
      },
      onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
    })
  }

  const handleUpdate = (payload: CreateActionRulePayload | UpdateActionRulePayload) => {
    if (!showFormFor) return
    updateMutation.mutate(
      { id: showFormFor.id, payload },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Rule updated.' })
          setShowFormFor(null)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleToggleActive = (rule: ActionRuleEntry) => {
    updateMutation.mutate(
      { id: rule.id, payload: { isActive: !rule.isActive } },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: rule.isActive ? 'Rule deactivated.' : 'Rule reactivated.',
          })
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <ListChecks size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Recommended Action Rules</h4>
            <p className="text-muted small mb-0">
              The rule set that generates Recommended Actions at session completion — configuration only
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sm d-flex align-items-center gap-1"
          style={{ background: '#667eea', color: '#fff' }}
          onClick={() => setShowAddForm(true)}
          disabled={isLoading}
        >
          + Add Rule
        </button>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
          {showInactive ? 'Showing all rules' : 'Showing active rules only'}
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <span className="fw-semibold">
            {isLoading ? 'Loading…' : `${rules.length} Rule${rules.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isLoading && (
          <div className="p-3 placeholder-glow">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 38 }} />
            ))}
          </div>
        )}

        {!isLoading && rules.length === 0 && (
          <div className="text-center text-muted py-5">No rules found.</div>
        )}

        {!isLoading && rules.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="text-muted small">
                  <th className="px-3">Priority</th>
                  <th>Risk Category</th>
                  <th>Minimum Level</th>
                  <th>Action Text</th>
                  <th>Status</th>
                  <th className="text-end px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...rules].sort((a, b) => a.priority - b.priority).map((rule) => (
                  <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                    <td className="px-3 small text-muted">{rule.priority}</td>
                    <td className="small">
                      {rule.riskCategory ? RISK_CATEGORY_LABELS[rule.riskCategory] : ANY_RISK_CATEGORY_LABEL}
                    </td>
                    <td className="small">{DOMAIN_RESULT_LEVEL_LABELS[rule.minimumLevel]}</td>
                    <td className="fw-medium">{rule.actionText}</td>
                    <td>
                      <span className={`badge ${rule.isActive ? 'bg-success bg-opacity-15 text-success' : 'bg-secondary bg-opacity-15 text-secondary'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-end px-3">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-1 text-secondary"
                          title="Edit"
                          onClick={() => setShowFormFor(rule)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${rule.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          disabled={updateMutation.isPending}
                          onClick={() => handleToggleActive(rule)}
                        >
                          {rule.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <ActionRuleFormModal
          rule={null}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreate}
          isPending={createMutation.isPending}
        />
      )}
      {showFormFor && (
        <ActionRuleFormModal
          rule={showFormFor}
          onClose={() => setShowFormFor(null)}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}

export default function AdminActionRulesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN]}>
      <ActionRulesPage />
    </RoleGuard>
  )
}
