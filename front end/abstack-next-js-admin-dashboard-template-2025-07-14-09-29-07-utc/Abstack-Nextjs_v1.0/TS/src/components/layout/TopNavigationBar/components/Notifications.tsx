'use client'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { Dropdown, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount'
import { useMarkRead } from '@/features/notifications/hooks/useMarkRead'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const Notifications = () => {
  const { data: myStaff } = useMyStaff()
  const staffId = myStaff?.id ?? null

  const { data: unreadData } = useUnreadCount(staffId)
  const { data: notifications = [] } = useNotifications(staffId)
  const markRead = useMarkRead(staffId)
  const count = unreadData?.count ?? 0

  if (!staffId) return null

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
        <DropdownMenu className="p-0 dropdown-menu-end rounded-4 border-0 shadow-lg overflow-hidden" style={{ width: 360 }}>
          <div
            className="d-flex align-items-center justify-content-between px-3 py-3"
            style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
          >
            <span className="fw-bold text-white">Notifications</span>
            {count > 0 && (
              <span className="badge rounded-pill bg-white text-dark small fw-semibold">{count} unread</span>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="text-center text-muted py-5">
                <Inbox size={32} className="mb-2 opacity-25" />
                <p className="mb-0 small">You&apos;re all caught up.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="d-flex align-items-start gap-2 px-3 py-2 border-bottom"
                  style={{ background: n.isRead ? 'transparent' : '#f5f3ff' }}
                >
                  <span
                    className="rounded-circle flex-shrink-0 mt-2"
                    style={{ width: 8, height: 8, background: n.isRead ? 'transparent' : 'var(--edulab-accent)' }}
                  />
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="small fw-semibold">{n.title}</div>
                    <div className="text-muted small" style={{ wordBreak: 'break-word' }}>{n.message}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 flex-shrink-0"
                      title="Mark as read"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      <CheckCheck size={15} style={{ color: 'var(--edulab-accent)' }} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default Notifications
