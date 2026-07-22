'use client'
import { useState } from 'react'
import { History } from 'lucide-react'
import { ROLES } from '@/lib/auth/roles'
import { useAuthStore } from '@/stores/authStore'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useUpdateEquipmentCondition } from '../hooks/useUpdateEquipmentCondition'
import { useEquipmentConditionHistory } from '../hooks/useEquipmentConditionHistory'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { Equipment, EquipmentCondition } from '@/types/sims/equipment'

const CONDITION_STYLE: Record<EquipmentCondition, { bg: string; text: string; label: string }> = {
  good: { bg: '#dcfce7', text: '#15803d', label: 'Good' },
  fair: { bg: '#fef9c3', text: '#92400e', label: 'Fair' },
  poor: { bg: '#fee2e2', text: '#dc2626', label: 'Poor' },
}

type ApiError = { response?: { data?: { message?: string } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

/** Visible to Admin/Principal (any lab) and to whoever is signed in as the lab's own assigned
 * Lab In-Charge — mirrors LabMaintenanceToggle.tsx's exact gating pattern. The backend
 * re-checks ownership regardless. */
interface EquipmentConditionControlProps {
  labId: string
  labInChargeId: string
  item: Equipment
}

export default function EquipmentConditionControl({ labId, labInChargeId, item }: EquipmentConditionControlProps) {
  const { showNotification } = useNotificationContext()
  const currentRole = useAuthStore((s) => s.user?.role)
  const { data: myStaff } = useMyStaff()
  const updateMutation = useUpdateEquipmentCondition(labId)
  const [showHistory, setShowHistory] = useState(false)
  const { data: history = [] } = useEquipmentConditionHistory(showHistory ? item.id : '')

  const isPrivileged = currentRole === ROLES.SYSTEM_ADMIN || currentRole === ROLES.PRINCIPAL
  const canManage = isPrivileged || (!!myStaff && myStaff.id === labInChargeId)

  const style = CONDITION_STYLE[item.condition]

  const handleChange = (condition: EquipmentCondition) => {
    if (condition === item.condition) return
    updateMutation.mutate(
      { id: item.id, payload: { condition } },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Condition updated.' }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  return (
    <div className="d-flex align-items-center gap-2">
      {canManage ? (
        <select
          className="form-select form-select-sm"
          style={{ width: 100, background: style.bg, color: style.text, fontWeight: 600, border: 'none' }}
          value={item.condition}
          disabled={updateMutation.isPending}
          onChange={(e) => handleChange(e.target.value as EquipmentCondition)}
        >
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      ) : (
        <span className="badge rounded-pill fw-semibold" style={{ background: style.bg, color: style.text }}>
          {style.label}
        </span>
      )}
      <button
        type="button"
        className="btn btn-sm btn-link p-0 text-muted"
        title="Condition history"
        onClick={() => setShowHistory((s) => !s)}
      >
        <History size={14} />
      </button>

      {showHistory && (
        <div className="position-absolute bg-white shadow-sm rounded-3 p-2" style={{ zIndex: 10, minWidth: 220, marginTop: 90 }}>
          {history.length === 0 ? (
            <div className="small text-muted px-1">No condition changes yet.</div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="small px-1 py-1 border-bottom">
                <span className="fw-semibold">{h.previousCondition} → {h.newCondition}</span>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {h.changedBy.firstName} {h.changedBy.lastName} · {new Date(h.changedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
