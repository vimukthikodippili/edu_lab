'use client'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useEquipmentForLab } from '@/features/equipment/hooks/useEquipmentForLab'
import { useStudents } from '@/features/students/hooks/useStudents'
import { useSessionReport } from '../hooks/useSessionReport'
import { useSubmitSessionReport } from '../hooks/useSubmitSessionReport'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { LabBooking } from '@/types/sims/labs'
import type { SubmitDamageReportItem, SubmitSessionUsageItem } from '@/types/sims/session-equipment'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

interface Props {
  labId: string
  booking: LabBooking
  onClose: () => void
}

export default function PostSessionReportModal({ labId, booking, onClose }: Props) {
  const { showNotification } = useNotificationContext()
  const { data: equipment = [] } = useEquipmentForLab(labId)
  const { data: existing } = useSessionReport(booking.id)
  const { data: studentsPage } = useStudents({ classSectionId: booking.classSection?.id, limit: 200 })
  const students = studentsPage?.data ?? []
  const submitMutation = useSubmitSessionReport(booking.id)

  const [usage, setUsage] = useState<SubmitSessionUsageItem[]>([])
  const [damage, setDamage] = useState<SubmitDamageReportItem[]>([])

  const [usageEquipmentId, setUsageEquipmentId] = useState('')
  const [usageQty, setUsageQty] = useState(1)

  const [damageEquipmentId, setDamageEquipmentId] = useState('')
  const [damageType, setDamageType] = useState<'damaged' | 'missing'>('damaged')
  const [damageQty, setDamageQty] = useState(1)
  const [damageStudentId, setDamageStudentId] = useState('')
  const [damageNotes, setDamageNotes] = useState('')

  const equipmentName = (id: string) => equipment.find((e) => e.id === id)?.name ?? id

  const addUsage = () => {
    if (!usageEquipmentId || usageQty < 1) return
    setUsage((prev) => [...prev, { equipmentId: usageEquipmentId, quantityUsed: usageQty }])
    setUsageEquipmentId('')
    setUsageQty(1)
  }

  const addDamage = () => {
    if (!damageEquipmentId || damageQty < 1) return
    setDamage((prev) => [
      ...prev,
      {
        equipmentId: damageEquipmentId,
        reportType: damageType,
        quantity: damageQty,
        responsibleStudentId: damageStudentId || undefined,
        notes: damageNotes.trim() || undefined,
      },
    ])
    setDamageEquipmentId('')
    setDamageQty(1)
    setDamageStudentId('')
    setDamageNotes('')
  }

  const isValid = usage.length > 0 || damage.length > 0
  const isPending = submitMutation.isPending

  const handleSubmit = () => {
    if (!isValid) return
    submitMutation.mutate(
      { usage: usage.length ? usage : undefined, damage: damage.length ? damage : undefined },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Session report logged.' })
          onClose()
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Log Session — {booking.date} · Period {booking.periodNumber} · {booking.subject?.name ?? '—'} · {booking.classSection?.name ?? '—'}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {existing && (existing.usage.length > 0 || existing.damage.length > 0) && (
                <div className="alert alert-secondary small mb-3">
                  <strong>Already logged for this session:</strong>{' '}
                  {existing.usage.length > 0 && <span>{existing.usage.length} usage item(s)</span>}
                  {existing.usage.length > 0 && existing.damage.length > 0 && ', '}
                  {existing.damage.length > 0 && <span>{existing.damage.length} damage/missing report(s)</span>}
                </div>
              )}

              <h6 className="fw-semibold small text-uppercase text-muted">Equipment Used</h6>
              <div className="row g-2 mb-2 align-items-end">
                <div className="col-6">
                  <select className="form-select form-select-sm" value={usageEquipmentId} onChange={(e) => setUsageEquipmentId(e.target.value)}>
                    <option value="">Select equipment…</option>
                    {equipment.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="col-3">
                  <input type="number" className="form-control form-control-sm" min={1} value={usageQty} onChange={(e) => setUsageQty(Number(e.target.value))} />
                </div>
                <div className="col-3">
                  <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={addUsage}>+ Add</button>
                </div>
              </div>
              {usage.length > 0 && (
                <ul className="list-group list-group-flush mb-3 small">
                  {usage.map((u, i) => (
                    <li key={i} className="list-group-item d-flex justify-content-between align-items-center px-0 py-1">
                      <span>{equipmentName(u.equipmentId)} — {u.quantityUsed}</span>
                      <button type="button" className="btn btn-sm text-danger p-0" onClick={() => setUsage((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <h6 className="fw-semibold small text-uppercase text-muted mt-3">Damaged / Missing Items</h6>
              <div className="row g-2 mb-2 align-items-end">
                <div className="col-4">
                  <select className="form-select form-select-sm" value={damageEquipmentId} onChange={(e) => setDamageEquipmentId(e.target.value)}>
                    <option value="">Select equipment…</option>
                    {equipment.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="col-2">
                  <select className="form-select form-select-sm" value={damageType} onChange={(e) => setDamageType(e.target.value as 'damaged' | 'missing')}>
                    <option value="damaged">Damaged</option>
                    <option value="missing">Missing</option>
                  </select>
                </div>
                <div className="col-2">
                  <input type="number" className="form-control form-control-sm" min={1} value={damageQty} onChange={(e) => setDamageQty(Number(e.target.value))} />
                </div>
                <div className="col-4">
                  <select className="form-select form-select-sm" value={damageStudentId} onChange={(e) => setDamageStudentId(e.target.value)}>
                    <option value="">Responsible student (optional)…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>
                    ))}
                  </select>
                </div>
                <div className="col-9">
                  <input type="text" className="form-control form-control-sm" placeholder="Notes (optional)" maxLength={1000} value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} />
                </div>
                <div className="col-3">
                  <button type="button" className="btn btn-outline-danger btn-sm w-100" onClick={addDamage}>+ Add</button>
                </div>
              </div>
              {damage.length > 0 && (
                <ul className="list-group list-group-flush small">
                  {damage.map((d, i) => (
                    <li key={i} className="list-group-item d-flex justify-content-between align-items-center px-0 py-1">
                      <span>
                        {equipmentName(d.equipmentId)} — <span className="text-danger fw-semibold">{d.reportType}</span> × {d.quantity}
                        {d.notes ? ` — ${d.notes}` : ''}
                      </span>
                      <button type="button" className="btn btn-sm text-danger p-0" onClick={() => setDamage((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : 'Submit Session Report'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
