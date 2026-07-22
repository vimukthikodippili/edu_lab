'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { Package, ArrowLeft, Plus, FileSpreadsheet, FileText, Ban } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import apiClient from '@/lib/api/axios'
import { useLabs } from '@/features/labs/hooks/useLabs'
import { useEquipmentForLab } from '@/features/equipment/hooks/useEquipmentForLab'
import { useCreateEquipment } from '@/features/equipment/hooks/useCreateEquipment'
import { useUpdateEquipment } from '@/features/equipment/hooks/useUpdateEquipment'
import EquipmentFormModal from '@/features/equipment/components/EquipmentFormModal'
import EquipmentConditionControl from '@/features/equipment/components/EquipmentConditionControl'
import EquipmentWriteOffModal from '@/features/equipment/components/EquipmentWriteOffModal'
import type { Equipment, CreateEquipmentPayload, UpdateEquipmentPayload } from '@/types/sims/equipment'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function EquipmentContent({ labId }: { labId: string }) {
  const { showNotification } = useNotificationContext()
  const { data: labs } = useLabs()
  const lab = labs?.find((l) => l.id === labId)
  const { data: equipment = [], isLoading } = useEquipmentForLab(labId)

  const createMutation = useCreateEquipment(labId)
  const updateMutation = useUpdateEquipment(labId)

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [writeOffItem, setWriteOffItem] = useState<Equipment | null>(null)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const openCreate = () => { setEditingItem(null); setShowFormModal(true) }
  const openEdit = (item: Equipment) => { setEditingItem(item); setShowFormModal(true) }

  const handleSubmit = (payload: CreateEquipmentPayload | UpdateEquipmentPayload) => {
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, payload },
        {
          onSuccess: () => { showNotification({ variant: 'success', message: 'Equipment updated.' }); setShowFormModal(false) },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateEquipmentPayload, {
        onSuccess: () => { showNotification({ variant: 'success', message: 'Equipment registered.' }); setShowFormModal(false) },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      })
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format)
    try {
      const res = await apiClient.get('/equipment/report/export', {
        params: { labId, format },
        responseType: 'blob',
      })
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `equipment-inventory-${lab?.name ?? labId}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showNotification({ variant: 'danger', message: 'Export failed. Please try again.' })
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}
          >
            <Package size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">{lab ? `${lab.name} — Equipment Inventory` : 'Equipment Inventory'}</h4>
            <p className="text-muted small mb-0">Stock levels, conditions, and write-offs</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/labs/directory" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" /> Back to Directory
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
          >
            {exporting === 'excel' ? <span className="spinner-border spinner-border-sm" /> : <FileSpreadsheet size={14} />} Excel
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
          >
            {exporting === 'pdf' ? <span className="spinner-border spinner-border-sm" /> : <FileText size={14} />} PDF
          </button>
          <button type="button" className="btn btn-sm text-white" style={{ background: '#06b6d4' }} onClick={openCreate} disabled={!lab}>
            <Plus size={14} className="me-1" /> Register Equipment
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 64 }} />
          ))}
        </div>
      )}

      {!isLoading && equipment.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">No equipment registered for this lab yet.</div>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {equipment.map((item) => (
          <div key={item.id} className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className="fw-semibold">{item.name}</span>
                    <span className="badge bg-secondary bg-opacity-15 text-secondary">{item.category.name}</span>
                    {item.lowStock && (
                      <span className="badge bg-danger bg-opacity-15 text-danger">Low Stock</span>
                    )}
                  </div>
                  <div className="small text-muted mb-1">
                    Quantity: {item.quantity} {item.unit}
                    {item.minStockLevel != null && ` · Min: ${item.minStockLevel}`}
                    {item.serialNumber && ` · S/N: ${item.serialNumber}`}
                  </div>
                  <div className="small text-muted">Purchased: {item.purchaseDate}</div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap position-relative">
                  {lab && (
                    <EquipmentConditionControl labId={labId} labInChargeId={lab.labInChargeId} item={item} />
                  )}
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(item)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                    onClick={() => setWriteOffItem(item)}
                    disabled={item.quantity === 0}
                  >
                    <Ban size={13} /> Write Off
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showFormModal && lab && (
        <EquipmentFormModal
          labTypeId={lab.labTypeId}
          equipment={editingItem}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {writeOffItem && (
        <EquipmentWriteOffModal labId={labId} item={writeOffItem} onClose={() => setWriteOffItem(null)} />
      )}
    </div>
  )
}

export default function LabEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER]}>
      <EquipmentContent labId={id} />
    </RoleGuard>
  )
}
