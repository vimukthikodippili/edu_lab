'use client'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { Dropdown, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount'
import { useMarkRead } from '@/features/notifications/hooks/useMarkRead'
import { useStudentNotifications } from '@/features/notifications/hooks/useStudentNotifications'
import { useStudentUnreadCount } from '@/features/notifications/hooks/useStudentUnreadCount'
import { useMarkStudentRead } from '@/features/notifications/hooks/useMarkStudentRead'
import { useGuardianNotifications } from '@/features/notifications/hooks/useGuardianNotifications'
import { useGuardianUnreadCount } from '@/features/notifications/hooks/useGuardianUnreadCount'
import { useMarkGuardianNotificationRead } from '@/features/notifications/hooks/useMarkGuardianNotificationRead'
import { iconForNotificationType, notificationTimeAgo } from '@/features/notifications/utils/notificationTypeIcon'

const Notifications = () => {
  const { data: myStaff, isError: staffError } = useMyStaff()
  const staffId = myStaff?.id ?? null

  // A student account has no staff record — useMyStaff errors out (retry:false), so only
  // then do we try the student identity, and only after that fails do we try guardian.
  const { data: myStudent, isError: studentError } = useMyStudent()
  const isStudent = staffError && !!myStudent

  const { data: myGuardian } = useMyGuardianProfile()
  const isGuardian = staffError && studentError && !!myGuardian

  const { data: staffUnread } = useUnreadCount(staffId)
  const { data: staffNotifications = [] } = useNotifications(staffId)
  const markStaffRead = useMarkRead(staffId)

  const { data: studentUnread } = useStudentUnreadCount(isStudent)
  const { data: studentNotifications = [] } = useStudentNotifications(isStudent)
  const markStudentRead = useMarkStudentRead()

  const { data: guardianUnread } = useGuardianUnreadCount()
  const { data: guardianNotifications = [] } = useGuardianNotifications()
  const markGuardianRead = useMarkGuardianNotificationRead()

  const allNotifications = isStudent ? studentNotifications : isGuardian ? guardianNotifications : staffNotifications
  // Once read, a notification drops out of this list entirely rather than lingering dimmed —
  // the bell is a "what's new" queue, not a permanent log.
  const notifications = allNotifications.filter((n) => !n.isRead)
  const count = (isStudent ? studentUnread?.count : isGuardian ? guardianUnread?.count : staffUnread?.count) ?? 0
  const markRead = isStudent ? markStudentRead : isGuardian ? markGuardianRead : markStaffRead

  if (!staffId && !isStudent && !isGuardian) return null

  return (
    <div className="topbar-item">
      <Dropdown align="end">
        <DropdownToggle
          as="button"
          className="topbar-link drop-arrow-none position-relative"
          data-bs-toggle="dropdown"
          data-bs-offset="0,25"
          data-bs-auto-close="outside"
          aria-haspopup="false"
          aria-expanded="false"
        >
          <Bell className={count > 0 ? 'animate-ring fs-22' : 'fs-22'} />
          {count > 0 && (
            <span
              className="position-absolute d-flex align-items-center justify-content-center rounded-pill fw-bold"
              style={{
                top: 2,
                right: 2,
                minWidth: 16,
                height: 16,
                padding: '0 3px',
                fontSize: '0.62rem',
                background: '#ef4444',
                color: '#fff',
                lineHeight: 1,
              }}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </DropdownToggle>
        <DropdownMenu className="p-0 dropdown-menu-end rounded-4 border-0 shadow-lg overflow-hidden" style={{ width: 380 }}>
          <div
            className="d-flex align-items-center justify-content-between px-3 py-3"
            style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
          >
            <span className="fw-bold text-white">Notifications</span>
            {count > 0 && (
              <span className="badge rounded-pill bg-white text-dark small fw-semibold">{count} unread</span>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="text-center text-muted py-5">
                <Inbox size={32} className="mb-2 opacity-25" />
                <p className="mb-0 small">You&apos;re all caught up.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const { icon: Icon, color } = iconForNotificationType(n.type)
                return (
                  <div
                    key={n.id}
                    className="d-flex align-items-start gap-3 px-3 py-3 border-bottom notification-row"
                  >
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 34, height: 34, background: `${color}1a` }}
                    >
                      <Icon size={16} color={color} />
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="small fw-semibold">{n.title}</div>
                      <div className="text-muted small" style={{ wordBreak: 'break-word' }}>{n.message}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{notificationTimeAgo(n.createdAt)}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 flex-shrink-0"
                      title="Mark as read"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      <CheckCheck size={15} style={{ color: 'var(--edulab-accent)' }} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </DropdownMenu>
      </Dropdown>

      <style jsx>{`
        .notification-row {
          transition: background-color 0.12s;
        }
        .notification-row:hover {
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  )
}

export default Notifications
