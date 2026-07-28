'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings, Save, Table2, ChevronRight } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings'
import { useUpdateSchoolSettings } from '@/features/school-settings/hooks/useUpdateSchoolSettings'

function SchoolSettingsContent() {
  const { user } = useAuthStore()
  const { showNotification } = useNotificationContext()
  const { data, isLoading } = useSchoolSettings()
  const updateSettings = useUpdateSchoolSettings()

  const [lateThresholdMinutes, setLateThresholdMinutes] = useState(10)
  const [isPublicSportsBoardEnabled, setIsPublicSportsBoardEnabled] = useState(false)

  useEffect(() => {
    if (data) {
      setLateThresholdMinutes(data.lateThresholdMinutes)
      setIsPublicSportsBoardEnabled(data.isPublicSportsBoardEnabled)
    }
  }, [data])

  const isUnchanged =
    data?.lateThresholdMinutes === lateThresholdMinutes &&
    data?.isPublicSportsBoardEnabled === isPublicSportsBoardEnabled

  const handleSave = () => {
    updateSettings.mutate(
      { lateThresholdMinutes, isPublicSportsBoardEnabled },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: `Late threshold updated to ${lateThresholdMinutes} minutes — takes effect on the next dashboard refresh and alert check, no restart needed.`,
          })
        },
        onError: (e: Error & { response?: { data?: { message?: string } } }) => {
          showNotification({
            variant: 'danger',
            message: e?.response?.data?.message ?? 'Failed to update school settings.',
          })
        },
      },
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
        >
          <Settings size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">School Settings</h4>
          <p className="mb-0 text-muted small">School-wide configuration for automated monitoring and alerts</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4" style={{ maxWidth: 480 }}>
        <div className="card-body p-4">
          <label className="form-label small fw-semibold">Late Threshold (minutes)</label>
          <p className="text-muted small mb-2">
            Minutes after a period starts before a teacher with no check-in is flagged as overdue on
            the Live Class Monitor and triggers a late-teacher alert.
          </p>
          {isLoading ? (
            <div className="placeholder-glow">
              <span className="placeholder col-3 rounded" style={{ height: 38, display: 'block' }} />
            </div>
          ) : (
            <input
              type="number"
              min={1}
              max={120}
              className="form-control"
              style={{ width: 140 }}
              value={lateThresholdMinutes}
              onChange={(e) =>
                setLateThresholdMinutes(Math.max(1, Math.min(120, Number(e.target.value) || 1)))
              }
            />
          )}

          <hr className="my-4" />

          <div className="form-check form-switch">
            <input
              type="checkbox"
              role="switch"
              id="isPublicSportsBoardEnabled"
              className="form-check-input"
              checked={isPublicSportsBoardEnabled}
              disabled={isLoading}
              onChange={(e) => setIsPublicSportsBoardEnabled(e.target.checked)}
            />
            <label className="form-check-label small fw-semibold" htmlFor="isPublicSportsBoardEnabled">
              Public Sports Board
            </label>
          </div>
          <p className="text-muted small mb-0">
            When enabled, any logged-in user (regardless of role) can view a school-wide board of team
            match results and top-3 performer names per sport — no individual per-match metrics.
          </p>

          <button
            type="button"
            className="btn btn-primary fw-semibold d-flex align-items-center gap-2 mt-3"
            disabled={isLoading || isUnchanged || updateSettings.isPending}
            onClick={handleSave}
          >
            {updateSettings.isPending ? (
              <span className="spinner-border spinner-border-sm" role="status" />
            ) : (
              <Save size={15} />
            )}
            {updateSettings.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {user?.role === ROLES.SYSTEM_ADMIN && (
        <Link
          href="/admin/mha/assessment-matrix"
          className="card border-0 shadow-sm rounded-4 text-decoration-none text-body mt-3"
          style={{ maxWidth: 480 }}
        >
          <div className="card-body p-4 d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 40, height: 40, background: '#667eea1a' }}
            >
              <Table2 size={18} style={{ color: '#667eea' }} />
            </div>
            <div className="flex-grow-1">
              <div className="fw-semibold small">Recommended Assessment Matrix</div>
              <div className="text-muted small">View, print, or export the MHA age-band guidance matrix</div>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </div>
        </Link>
      )}
    </div>
  )
}

export default function SchoolSettingsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <SchoolSettingsContent />
    </RoleGuard>
  )
}
