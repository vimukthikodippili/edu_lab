'use client'
import { useState } from 'react'
import Link from 'next/link'
import { FlaskConical, Pencil, Trash2, Settings2, ListChecks } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useLabs } from '@/features/labs/hooks/useLabs'
import { useCreateLab } from '@/features/labs/hooks/useCreateLab'
import { useUpdateLab } from '@/features/labs/hooks/useUpdateLab'
import { useDeleteLab } from '@/features/labs/hooks/useDeleteLab'
import LabFormModal from '@/features/labs/components/LabFormModal'
import LabMaintenanceToggle from '@/features/labs/components/LabMaintenanceToggle'
import type { Lab, CreateLabPayload, UpdateLabPayload } from '@/types/sims/labs'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function LabsSetupPage() {
  const { showNotification } = useNotificationContext()
  const { data: labs, isLoading } = useLabs()

  const [showModal, setShowModal] = useState(false)
  const [editingLab, setEditingLab] = useState<Lab | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const createMutation = useCreateLab()
  const updateMutation = useUpdateLab()
  const deleteMutation = useDeleteLab()

  const openCreate = () => { setEditingLab(null); setShowModal(true) }
  const openEdit = (lab: Lab) => { setEditingLab(lab); setShowModal(true) }

  const handleSubmit = (payload: CreateLabPayload | UpdateLabPayload) => {
    if (editingLab) {
      updateMutation.mutate(
        { id: editingLab.id, payload },
        {
          onSuccess: () => {
            showNotification({ variant: 'success', message: 'Lab updated.' })
            setShowModal(false)
          },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateLabPayload, {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Lab registered.' })
          setShowModal(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      })
    }
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Lab deleted.' })
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
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}
          >
            <FlaskConical size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Lab Setup &amp; Management</h4>
            <p className="text-muted small mb-0">Register labs and specialist rooms, and assign a Lab In-Charge</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/labs/directory" className="btn btn-outline-secondary btn-sm">
            <ListChecks size={14} className="me-1" /> Directory
          </Link>
          <Link href="/admin/lab-types" className="btn btn-outline-secondary btn-sm">
            <Settings2 size={14} className="me-1" /> Lab Types
          </Link>
          <button type="button" className="btn btn-sm text-white" style={{ background: '#06b6d4' }} onClick={openCreate}>
            + Add Lab
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 72 }} />
          ))}
        </div>
      )}

      {!isLoading && (labs?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">No labs registered yet.</div>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {(labs ?? []).map((lab) => (
          <div key={lab.id} className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className="fw-semibold">{lab.name}</span>
                    <span className="badge bg-secondary bg-opacity-15 text-secondary">{lab.labType.name}</span>
                    {lab.isUnderMaintenance && (
                      <span className="badge bg-warning bg-opacity-25 text-warning-emphasis">Under Maintenance</span>
                    )}
                  </div>
                  <div className="small text-muted mb-1">Room: {lab.roomNumber} · Capacity: {lab.capacity}</div>
                  <div className="small text-muted">
                    Lab In-Charge: {lab.labInCharge.firstName} {lab.labInCharge.lastName}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-1 flex-shrink-0 flex-wrap">
                  <LabMaintenanceToggle lab={lab} />
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(lab)}>
                    <Pencil size={14} className="me-1" /> Edit
                  </button>
                  {pendingDelete === lab.id ? (
                    <span className="d-inline-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(lab.id)}
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
                      onClick={() => setPendingDelete(lab.id)}
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
        <LabFormModal
          lab={editingLab}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

export default function AdminLabsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <LabsSetupPage />
    </RoleGuard>
  )
}
