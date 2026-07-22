'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Settings2, Pencil, Trash2, ArrowLeft, Boxes } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useLabTypes } from '@/features/labs/hooks/useLabTypes'
import { useCreateLabType } from '@/features/labs/hooks/useCreateLabType'
import { useUpdateLabType } from '@/features/labs/hooks/useUpdateLabType'
import { useDeleteLabType } from '@/features/labs/hooks/useDeleteLabType'
import LabTypeFormModal from '@/features/labs/components/LabTypeFormModal'
import { useEquipmentCategories } from '@/features/equipment/hooks/useEquipmentCategories'
import { useCreateEquipmentCategory } from '@/features/equipment/hooks/useCreateEquipmentCategory'
import { useUpdateEquipmentCategory } from '@/features/equipment/hooks/useUpdateEquipmentCategory'
import { useDeleteEquipmentCategory } from '@/features/equipment/hooks/useDeleteEquipmentCategory'
import EquipmentCategoryFormModal from '@/features/equipment/components/EquipmentCategoryFormModal'
import type { LabType, CreateLabTypePayload, UpdateLabTypePayload } from '@/types/sims/labs'
import type { EquipmentCategory, CreateEquipmentCategoryPayload, UpdateEquipmentCategoryPayload } from '@/types/sims/equipment'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function EquipmentCategoriesSection() {
  const { showNotification } = useNotificationContext()
  const { data: categories, isLoading } = useEquipmentCategories()

  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const createMutation = useCreateEquipmentCategory()
  const updateMutation = useUpdateEquipmentCategory()
  const deleteMutation = useDeleteEquipmentCategory()

  const openCreate = () => { setEditingCategory(null); setShowModal(true) }
  const openEdit = (c: EquipmentCategory) => { setEditingCategory(c); setShowModal(true) }

  const handleSubmit = (payload: CreateEquipmentCategoryPayload | UpdateEquipmentCategoryPayload) => {
    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, payload },
        {
          onSuccess: () => { showNotification({ variant: 'success', message: 'Category updated.' }); setShowModal(false) },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateEquipmentCategoryPayload, {
        onSuccess: () => { showNotification({ variant: 'success', message: 'Category added.' }); setShowModal(false) },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      })
    }
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => { showNotification({ variant: 'success', message: 'Category deleted.' }); setPendingDelete(null) },
      onError: (err) => { showNotification({ variant: 'danger', message: extractErrorMessage(err) }); setPendingDelete(null) },
    })
  }

  return (
    <div className="mt-5">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Boxes size={18} className="text-secondary" />
          <h5 className="mb-0 fw-bold">Equipment Categories</h5>
        </div>
        <button type="button" className="btn btn-sm text-white" style={{ background: '#06b6d4' }} onClick={openCreate}>
          + Add Category
        </button>
      </div>
      <p className="text-muted small mb-3">Configurable per lab type (e.g. Science: Glassware, Chemicals) — used when registering equipment.</p>

      {isLoading && (
        <div className="placeholder-glow">
          <div className="placeholder col-12 mb-2 rounded" style={{ height: 48 }} />
        </div>
      )}

      {!isLoading && (categories?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-4">No equipment categories configured yet.</div>
        </div>
      )}

      <div className="d-flex flex-column gap-2">
        {(categories ?? []).map((c) => (
          <div key={c.id} className="card border-0 shadow-sm">
            <div className="card-body py-2">
              <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <div>
                  <span className="fw-semibold">{c.name}</span>
                  <span className="badge bg-secondary bg-opacity-15 text-secondary ms-2">{c.labType.name}</span>
                </div>
                <div className="d-flex align-items-center gap-1 flex-shrink-0 flex-wrap">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(c)}>
                    <Pencil size={13} />
                  </button>
                  {pendingDelete === c.id ? (
                    <span className="d-inline-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(c.id)}
                      >
                        {deleteMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Confirm'}
                      </button>
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setPendingDelete(null)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setPendingDelete(c.id)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <EquipmentCategoryFormModal
          category={editingCategory}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

function LabTypesPage() {
  const { showNotification } = useNotificationContext()
  const { data: labTypes, isLoading } = useLabTypes()

  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<LabType | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const createMutation = useCreateLabType()
  const updateMutation = useUpdateLabType()
  const deleteMutation = useDeleteLabType()

  const openCreate = () => { setEditingType(null); setShowModal(true) }
  const openEdit = (t: LabType) => { setEditingType(t); setShowModal(true) }

  const handleSubmit = (payload: CreateLabTypePayload | UpdateLabTypePayload) => {
    if (editingType) {
      updateMutation.mutate(
        { id: editingType.id, payload },
        {
          onSuccess: () => {
            showNotification({ variant: 'success', message: 'Lab type updated.' })
            setShowModal(false)
          },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateLabTypePayload, {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Lab type added.' })
          setShowModal(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      })
    }
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Lab type deleted.' })
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
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}
          >
            <Settings2 size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Lab Types</h4>
            <p className="text-muted small mb-0">
              Add custom lab types beyond the defaults (Science, Computer, Language, Art, Other)
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/labs" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" /> Back to Labs
          </Link>
          <button type="button" className="btn btn-sm text-white" style={{ background: '#06b6d4' }} onClick={openCreate}>
            + Add Lab Type
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

      {!isLoading && (labTypes?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            No lab types configured yet. Click &ldquo;+ Add Lab Type&rdquo; to create one.
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {(labTypes ?? []).map((t) => (
          <div key={t.id} className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <span className="fw-semibold">{t.name}</span>
                <div className="d-flex align-items-center gap-1 flex-shrink-0 flex-wrap">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(t)}>
                    <Pencil size={14} className="me-1" /> Edit
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
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <LabTypeFormModal
          labType={editingType}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <EquipmentCategoriesSection />
    </div>
  )
}

export default function AdminLabTypesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <LabTypesPage />
    </RoleGuard>
  )
}
