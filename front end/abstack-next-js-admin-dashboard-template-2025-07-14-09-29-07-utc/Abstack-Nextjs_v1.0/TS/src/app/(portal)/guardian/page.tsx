'use client'
import { useSearchParams } from 'next/navigation'
import { Bell, CheckCheck, ShieldAlert } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useGuardianNotifications } from '@/features/notifications/hooks/useGuardianNotifications'
import { useGuardianUnreadCount } from '@/features/notifications/hooks/useGuardianUnreadCount'
import { useMarkGuardianNotificationRead } from '@/features/notifications/hooks/useMarkGuardianNotificationRead'
import { AbsenceAlertCard } from '@/features/notifications/components/AbsenceAlertCard'

function GuardianContent() {
  const searchParams = useSearchParams()
  const guardianId = searchParams.get('guardianId')

  const { data: notifications, isLoading, isError } = useGuardianNotifications(guardianId)
  const { data: unreadData } = useGuardianUnreadCount(guardianId)
  const markRead = useMarkGuardianNotificationRead(guardianId)

  const unreadCount = unreadData?.count ?? 0

  if (!guardianId) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <ShieldAlert size={48} className="text-warning mb-3" />
            <h5 className="fw-bold">Guardian ID Required</h5>
            <p className="text-muted small">
              Open this page via the link in your absence SMS notification, or contact the school
              admin to get your guardian portal link.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Bell size={20} className="text-primary" />
            Guardian Portal
          </h4>
          <p className="text-muted small mb-0 mt-1">
            Absence alerts for your child — updated automatically.
          </p>
        </div>

        {unreadCount > 0 && (
          <span className="badge bg-danger rounded-pill px-3 py-2" style={{ fontSize: '0.85rem' }}>
            {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Absence alerts card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between py-3">
          <div className="d-flex align-items-center gap-2">
            <ShieldAlert size={16} className="text-danger" />
            <h6 className="fw-bold mb-0">Absence Alerts</h6>
          </div>
          {notifications && notifications.length > 0 && unreadCount === 0 && (
            <span className="badge bg-success bg-opacity-15 text-success d-flex align-items-center gap-1">
              <CheckCheck size={12} /> All read
            </span>
          )}
        </div>

        <div className="card-body">
          {isLoading && (
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3 p-3 mb-3 border placeholder-glow">
                  <div className="d-flex gap-3">
                    <span className="placeholder rounded-circle flex-shrink-0" style={{ width: 40, height: 40 }} />
                    <div className="flex-grow-1">
                      <span className="placeholder col-4 d-block mb-2" style={{ height: 14 }} />
                      <span className="placeholder col-8 d-block mb-2" style={{ height: 12 }} />
                      <span className="placeholder col-3 d-block" style={{ height: 12 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="alert alert-danger py-2 small mb-0">
              Failed to load notifications. Please try refreshing.
            </div>
          )}

          {!isLoading && !isError && notifications && notifications.length === 0 && (
            <div className="text-center py-5">
              <div
                className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 64, height: 64 }}
              >
                <CheckCheck size={28} className="text-success" />
              </div>
              <h6 className="fw-semibold text-success mb-1">No absence alerts</h6>
              <p className="text-muted small mb-0">
                Your child has a perfect attendance record. Keep it up!
              </p>
            </div>
          )}

          {!isLoading && !isError && notifications && notifications.length > 0 && (
            <div>
              {notifications.map((notification) => (
                <AbsenceAlertCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                  isPending={markRead.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-muted mt-4" style={{ fontSize: '0.7rem' }}>
        Notifications refresh every 60 seconds. Contact the school if you believe there is an error.
      </p>
    </div>
  )
}

export default function GuardianDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianContent />
    </RoleGuard>
  )
}
