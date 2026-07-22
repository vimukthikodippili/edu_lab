'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Settings2, Pencil, Trash2, ChevronDown, ChevronUp, ListTree, ArrowLeft } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSportTypes } from '@/features/sports/hooks/useSportTypes'
import { useCreateSportType } from '@/features/sports/hooks/useCreateSportType'
import { useUpdateSportType } from '@/features/sports/hooks/useUpdateSportType'
import { useDeleteSportType } from '@/features/sports/hooks/useDeleteSportType'
import SportTypeFormModal from '@/features/sports/components/SportTypeFormModal'
import SportTypeMetricsPanel from '@/features/sports/components/SportTypeMetricsPanel'
import type { SportType, CreateSportTypePayload, UpdateSportTypePayload } from '@/types/sims/sports'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function SportTypesPage() {
  const { showNotification } = useNotificationContext()
  const { data: sportTypes, isLoading } = useSportTypes()

  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<SportType | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const createMutation = useCreateSportType()
  const updateMutation = useUpdateSportType()
  const deleteMutation = useDeleteSportType()

  const openCreate = () => { setEditingType(null); setShowModal(true) }
  const openEdit = (t: SportType) => { setEditingType(t); setShowModal(true) }

  const handleSubmit = (payload: CreateSportTypePayload | UpdateSportTypePayload) => {
    if (editingType) {
      updateMutation.mutate(
        { id: editingType.id, payload },
        {
          onSuccess: () => {
            showNotification({ variant: 'success', message: 'Sport type updated.' })
            setShowModal(false)
          },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateSportTypePayload, {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Sport type added.' })
          setShowModal(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      })
    }
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Sport type deleted.' })
        setPendingDelete(null)
      },
      onError: (err) => {
        showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        setPendingDelete(null)
      },
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <Settings2 size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Sport Types</h4>
            <p className="text-muted small mb-0">
              Add new sport types (e.g. Karate) and manage the performance metrics tracked for each
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/sports" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" /> Back to Sports
          </Link>
          <button type="button" className="btn btn-sm text-white" style={{ background: '#f59e0b' }} onClick={openCreate}>
            + Add Sport Type
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 60 }} />
          ))}
        </div>
      )}

      {!isLoading && (sportTypes?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            No sport types configured yet. Click &ldquo;+ Add Sport Type&rdquo; to create one.
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {(sportTypes ?? []).map((t) => (
          <div key={t.id} className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-semibold">{t.name}</span>
                    {t.isPersonalBestEligible && (
                      <span className="badge bg-success bg-opacity-15 text-success">Personal bests tracked</span>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-1 flex-shrink-0 flex-wrap">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(t)}>
                    <Pencil size={14} className="me-1" /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <ListTree size={14} className="me-1" /> Metrics
                    {expandedId === t.id ? <ChevronUp size={14} className="ms-1" /> : <ChevronDown size={14} className="ms-1" />}
                  </button>
                  {pendingDelete === t.id ? (
                    <span className="d-inline-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(t.id)}
                      >
                        {deleteMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Confirm delete'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => setPendingDelete(null)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setPendingDelete(t.id)}
                    >
                      <Trash2 size={14} className="me-1" /> Delete
                    </button>
                  )}
                </div>
              </div>
              {expandedId === t.id && <SportTypeMetricsPanel sportTypeId={t.id} />}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <SportTypeFormModal
          sportType={editingType}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

export default function AdminSportTypesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD]}>
      <SportTypesPage />
    </RoleGuard>
  )
}
