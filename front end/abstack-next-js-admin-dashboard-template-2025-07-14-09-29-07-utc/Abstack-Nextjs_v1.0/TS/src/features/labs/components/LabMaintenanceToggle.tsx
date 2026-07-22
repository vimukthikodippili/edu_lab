'use client'
import { Wrench, CheckCircle2 } from 'lucide-react'
import { ROLES } from '@/lib/auth/roles'
import { useAuthStore } from '@/stores/authStore'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useToggleLabMaintenance } from '../hooks/useToggleLabMaintenance'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { Lab } from '@/types/sims/labs'

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

/** Visible to Admin/Principal (any lab) and to whoever is signed in as the lab's own assigned
 * Lab In-Charge — the backend re-checks ownership regardless of what this shows, this is just
 * "don't show a control that will 403." */
export default function LabMaintenanceToggle({ lab }: { lab: Lab }) {
  const { showNotification } = useNotificationContext()
  const currentRole = useAuthStore((s) => s.user?.role)
  const { data: myStaff } = useMyStaff()
  const toggleMutation = useToggleLabMaintenance()

  const isPrivileged = currentRole === ROLES.SYSTEM_ADMIN || currentRole === ROLES.PRINCIPAL
  const isLabInCharge = !!myStaff && myStaff.id === lab.labInChargeId
  if (!isPrivileged && !isLabInCharge) return null

  const handleToggle = () => {
    toggleMutation.mutate(
      { id: lab.id, payload: { isUnderMaintenance: !lab.isUnderMaintenance } },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: lab.isUnderMaintenance ? 'Lab marked available again.' : 'Lab marked under maintenance.',
          })
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  return (
    <button
      type="button"
      className={`btn btn-sm ${lab.isUnderMaintenance ? 'btn-outline-success' : 'btn-outline-warning'}`}
      disabled={toggleMutation.isPending}
      onClick={handleToggle}
    >
      {toggleMutation.isPending ? (
        <span className="spinner-border spinner-border-sm" />
      ) : lab.isUnderMaintenance ? (
        <><CheckCircle2 size={14} className="me-1" /> Mark Available</>
      ) : (
        <><Wrench size={14} className="me-1" /> Mark Under Maintenance</>
      )}
    </button>
  )
}
