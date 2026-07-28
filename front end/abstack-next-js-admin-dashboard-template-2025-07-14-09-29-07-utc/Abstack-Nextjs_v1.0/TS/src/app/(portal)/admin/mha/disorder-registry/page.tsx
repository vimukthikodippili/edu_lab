'use client'
import { useState } from 'react'
import { Brain, Pencil, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useDisorderRegistry } from '@/features/disorder-registry/hooks/useDisorderRegistry'
import { useCreateDisorderDomain } from '@/features/disorder-registry/hooks/useCreateDisorderDomain'
import { useUpdateDisorderDomain } from '@/features/disorder-registry/hooks/useUpdateDisorderDomain'
import DisorderRegistryFormModal from '@/features/disorder-registry/components/DisorderRegistryFormModal'
import {
  DISORDER_SECTION_LABELS,
  RISK_CATEGORY_LABELS,
  type CreateDisorderRegistryPayload,
  type DisorderRegistryEntry,
  type UpdateDisorderRegistryPayload,
} from '@/types/sims/disorder-registry'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function DisorderRegistryPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === ROLES.SYSTEM_ADMIN
  const { showNotification } = useNotificationContext()

  const [showInactive, setShowInactive] = useState(true)
  const [showFormFor, setShowFormFor] = useState<DisorderRegistryEntry | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: domains = [], isLoading } = useDisorderRegistry(!showInactive)
  const createMutation = useCreateDisorderDomain()
  const updateMutation = useUpdateDisorderDomain()

  const handleCreate = (payload: CreateDisorderRegistryPayload | UpdateDisorderRegistryPayload) => {
    createMutation.mutate(payload as CreateDisorderRegistryPayload, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Domain added.' })
        setShowAddForm(false)
      },
      onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
    })
  }

  const handleUpdate = (payload: CreateDisorderRegistryPayload | UpdateDisorderRegistryPayload) => {
    if (!showFormFor) return
    updateMutation.mutate(
      { id: showFormFor.id, payload },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Domain updated.' })
          setShowFormFor(null)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleToggleActive = (domain: DisorderRegistryEntry) => {
    updateMutation.mutate(
      { id: domain.id, payload: { isActive: !domain.isActive } },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: domain.isActive ? 'Domain deactivated.' : 'Domain reactivated.',
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
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Disorder / Test Registry</h4>
            <p className="text-muted small mb-0">
              The 21 MHA screening domains that drive the intake form — configuration only, never a diagnosis of any student
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-1"
            style={{ background: '#667eea', color: '#fff' }}
            onClick={() => setShowAddForm(true)}
            disabled={isLoading}
          >
            + Add Domain
          </button>
        )}
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
          {showInactive ? 'Showing all domains' : 'Showing active domains only'}
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <span className="fw-semibold">
            {isLoading ? 'Loading…' : `${domains.length} Domain${domains.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isLoading && (
          <div className="p-3 placeholder-glow">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 38 }} />
            ))}
          </div>
        )}

        {!isLoading && domains.length === 0 && (
          <div className="text-center text-muted py-5">No domains found.</div>
        )}

        {!isLoading && domains.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="text-muted small">
                  <th className="px-3">Code</th>
                  <th>Name</th>
                  <th>Section</th>
                  <th>Risk Category</th>
                  <th>Age</th>
                  <th>Status</th>
                  {isAdmin && <th className="text-end px-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr key={domain.id} className={domain.isActive ? '' : 'opacity-50'}>
                    <td className="px-3 small text-muted">{domain.code}</td>
                    <td>
                      <span className="fw-medium">{domain.name}</span>
                      {domain.safetyFlag && (
                        <ShieldAlert size={14} className="text-danger ms-2" aria-label="Safety-flag domain" />
                      )}
                    </td>
                    <td className="small">{DISORDER_SECTION_LABELS[domain.section]}</td>
                    <td>
                      <span className="badge bg-secondary bg-opacity-15 text-secondary">
                        {RISK_CATEGORY_LABELS[domain.riskCategory]}
                      </span>
                    </td>
                    <td className="small">{domain.ageMin}–{domain.ageMax}</td>
                    <td>
                      <span className={`badge ${domain.isActive ? 'bg-success bg-opacity-15 text-success' : 'bg-secondary bg-opacity-15 text-secondary'}`}>
                        {domain.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="text-end px-3">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-1 text-secondary"
                            title="Edit"
                            onClick={() => setShowFormFor(domain)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${domain.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            disabled={updateMutation.isPending}
                            onClick={() => handleToggleActive(domain)}
                          >
                            {domain.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <DisorderRegistryFormModal
          domain={null}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreate}
          isPending={createMutation.isPending}
        />
      )}
      {showFormFor && (
        <DisorderRegistryFormModal
          domain={showFormFor}
          onClose={() => setShowFormFor(null)}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}

export default function AdminDisorderRegistryPage() {
  return (
    <RoleGuard
      allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}
    >
      <DisorderRegistryPage />
    </RoleGuard>
  )
}
