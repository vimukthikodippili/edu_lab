'use client'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { GuardianNotification } from '../hooks/useGuardianNotifications'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

interface Props {
  notification: GuardianNotification
  onMarkRead: (id: number) => void
  isPending?: boolean
}

export function AbsenceAlertCard({ notification, onMarkRead, isPending }: Props) {
  const { id, title, message, metadata, isRead, createdAt } = notification

  const formattedDate = metadata?.date
    ? new Date(metadata.date + 'T00:00:00Z').toLocaleDateString('en-LK', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div
      className={`rounded-3 p-3 mb-3 border ${
        isRead
          ? 'bg-white border-light'
          : 'border-danger border-start border-3 bg-danger bg-opacity-5'
      }`}
      style={{ transition: 'background 0.2s' }}
    >
      <div className="d-flex align-items-start gap-3">
        {/* Icon */}
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
            isRead ? 'bg-secondary bg-opacity-10' : 'bg-danger bg-opacity-15'
          }`}
          style={{ width: 40, height: 40 }}
        >
          <AlertTriangle
            size={18}
            className={isRead ? 'text-secondary' : 'text-danger'}
          />
        </div>

        {/* Content */}
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className={`fw-semibold small ${isRead ? 'text-muted' : 'text-danger'}`}>
              {title}
            </span>
            {!isRead && (
              <span className="badge bg-danger bg-opacity-15 text-danger rounded-pill px-2 py-0" style={{ fontSize: '0.65rem' }}>
                UNREAD
              </span>
            )}
          </div>

          <p className={`small mb-2 ${isRead ? 'text-muted' : 'text-body'}`} style={{ lineHeight: 1.5 }}>
            {message}
          </p>

          {metadata?.sectionLabel && (
            <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill small me-2">
              {metadata.sectionLabel}
            </span>
          )}

          {formattedDate && (
            <span className="badge bg-light text-secondary border rounded-pill small">
              {formattedDate}
            </span>
          )}

          {/* Footer row */}
          <div className="d-flex align-items-center justify-content-between mt-2 flex-wrap gap-2">
            <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
              <Clock size={11} />
              {relativeTime(createdAt)}
            </span>

            {!isRead && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm py-0 d-flex align-items-center gap-1"
                style={{ fontSize: '0.72rem', height: 24 }}
                onClick={() => onMarkRead(id)}
                disabled={isPending}
              >
                {isPending ? (
                  <span className="spinner-border spinner-border-sm" role="status" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                ) : (
                  <CheckCircle size={11} />
                )}
                Mark as Read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
