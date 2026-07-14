'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Palette } from 'lucide-react'
import { useMaterialsCheckStatus } from '../hooks/useMaterialsCheckStatus'
import { useBulkMaterialsCheck } from '../hooks/useBulkMaterialsCheck'
import { useNotificationContext } from '@/context/useNotificationContext'

interface Props {
  assessmentId: string
}

export function MaterialsCheckPanel({ assessmentId }: Props) {
  const { showNotification } = useNotificationContext()
  const { data: status, isLoading } = useMaterialsCheckStatus(assessmentId)
  const bulkCheck = useBulkMaterialsCheck()
  const [expanded, setExpanded] = useState(false)
  const [local, setLocal] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!status) return
    const map: Record<string, boolean> = {}
    status.roster.forEach((r) => { map[r.studentId] = r.hasFullMaterials ?? true })
    setLocal(map)
  }, [status])

  if (isLoading || !status) {
    return <div className="text-muted small mb-3">Loading materials check…</div>
  }

  const handleSetAll = (value: boolean) => {
    const map: Record<string, boolean> = {}
    status.roster.forEach((r) => { map[r.studentId] = value })
    setLocal(map)
  }

  const handleConfirm = () => {
    bulkCheck.mutate(
      {
        assessmentId,
        defaultHasFullMaterials: true,
        entries: status.roster.map((r) => ({ studentId: r.studentId, hasFullMaterials: local[r.studentId] ?? true })),
      },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Materials check saved.' }),
        onError: () => showNotification({ variant: 'danger', message: 'Could not save the materials check.' }),
      },
    )
  }

  if (status.allConfirmed && !expanded) {
    return (
      <div
        className="d-flex align-items-center justify-content-between gap-3 rounded-3 px-4 py-3 mb-4"
        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
      >
        <div className="d-flex align-items-center gap-2">
          <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span className="small fw-semibold" style={{ color: '#15803d' }}>
            Materials check complete — all {status.totalStudents} students confirmed ready.
          </span>
        </div>
        <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={() => setExpanded(true)}>
          Review <ChevronDown size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
        style={{ background: status.allConfirmed ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}
      >
        <span className="fw-bold text-white d-flex align-items-center gap-2">
          <Palette size={16} />
          Materials Check — {status.confirmedCount} / {status.totalStudents} ready
        </span>
        <button type="button" className="btn btn-sm btn-link text-white text-decoration-none" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!status.allConfirmed && (
        <div className="px-4 pt-3">
          <div className="alert alert-warning py-2 small mb-0">
            Marks cannot be submitted for this assessment until every student is confirmed materials-ready.
          </div>
        </div>
      )}

      {expanded && (
        <div className="card-body">
          <div className="d-flex gap-2 mb-3">
            <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleSetAll(true)}>
              Mark all ready
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleSetAll(false)}>
              Mark all not ready
            </button>
          </div>
          <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th className="small text-muted">Student</th>
                  <th className="small text-muted text-center" style={{ width: 120 }}>Full color set?</th>
                </tr>
              </thead>
              <tbody>
                {status.roster.map((r) => (
                  <tr key={r.studentId}>
                    <td className="small">{r.lastName}, {r.firstName} <span className="text-muted">({r.admissionNumber})</span></td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={local[r.studentId] ?? true}
                        onChange={(e) => setLocal((prev) => ({ ...prev, [r.studentId]: e.target.checked }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold mt-3"
            style={{ background: '#0f766e', border: 'none' }}
            disabled={bulkCheck.isPending}
            onClick={handleConfirm}
          >
            {bulkCheck.isPending ? 'Saving…' : 'Save Materials Check'}
          </button>
        </div>
      )}
    </div>
  )
}
