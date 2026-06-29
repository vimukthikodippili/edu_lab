'use client'
import React, { useState } from 'react'
import { Metadata } from 'next'
import { CalendarCheck, Bell, BellOff, CheckCircle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useTeacherTimetable } from '@/features/timetable/hooks/useTeacherTimetable'
import { useTimetableRecord } from '@/features/timetable/hooks/useTimetableRecord'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount'
import { useMarkRead } from '@/features/notifications/hooks/useMarkRead'
import { TimetableGrid } from '@/features/timetable/components/TimetableGrid'

const CURRENT_YEAR = String(new Date().getFullYear())

// ─── Finalization status banner ───────────────────────────────────────────────

function FinalizationBanner({ academicYear }: { academicYear: string }) {
  const { data: record, isLoading } = useTimetableRecord(academicYear)

  if (isLoading) return null

  if (record?.isLocked && record.finalizedAt) {
    const date = new Date(record.finalizedAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    return (
      <div
        className="d-flex align-items-center gap-3 rounded-3 px-4 py-3 mb-4"
        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
      >
        <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
        <div>
          <div className="fw-semibold" style={{ color: '#15803d' }}>
            Timetable Finalized
          </div>
          <div className="small" style={{ color: '#166534' }}>
            Your schedule for {academicYear} was confirmed on {date}. You can now plan your lessons.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="d-flex align-items-center gap-3 rounded-3 px-4 py-3 mb-4"
      style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
    >
      <CalendarCheck size={20} style={{ color: '#d97706', flexShrink: 0 }} />
      <div>
        <div className="fw-semibold" style={{ color: '#92400e' }}>Draft Timetable</div>
        <div className="small" style={{ color: '#78350f' }}>
          The timetable for {academicYear} has not been finalized yet. Changes may still be made.
        </div>
      </div>
    </div>
  )
}

// ─── Notification panel ───────────────────────────────────────────────────────

function NotificationsPanel({ staffId }: { staffId: string }) {
  const [open, setOpen] = useState(false)
  const { data: unreadData } = useUnreadCount(staffId)
  const { data: notifications = [] } = useNotifications(open ? staffId : null)
  const markRead = useMarkRead(staffId)
  const count = unreadData?.count ?? 0

  return (
    <div className="position-relative">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
        onClick={() => setOpen((o) => !o)}
      >
        {count > 0 ? <Bell size={15} /> : <BellOff size={15} />}
        Notifications
        {count > 0 && (
          <span className="badge rounded-pill ms-1" style={{ background: '#ef4444', fontSize: '0.65rem' }}>
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="position-absolute end-0 mt-1 card shadow-lg border-0 rounded-3"
          style={{ width: 380, zIndex: 1050, maxHeight: 400, overflowY: 'auto' }}
        >
          <div className="card-header py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
            <span className="fw-semibold small">Notifications</span>
            <button type="button" className="btn-close btn-close-sm" onClick={() => setOpen(false)} />
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted small">No notifications yet.</div>
          ) : (
            <div className="list-group list-group-flush">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="list-group-item list-group-item-action px-3 py-2"
                  style={{ background: n.isRead ? undefined : '#f0f9ff' }}
                >
                  <div className="d-flex align-items-start justify-content-between gap-2">
                    <div>
                      <div className="small fw-semibold">{n.title}</div>
                      <div className="small text-muted">{n.message}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {new Date(n.createdAt).toLocaleString('en-GB')}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-nowrap"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => markRead.mutate(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TeacherTimetablePage() {
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const { data: myStaff, isLoading: staffLoading, error: staffError } = useMyStaff()
  const { data: entries = [], isLoading: ttLoading } = useTeacherTimetable(
    myStaff?.id ?? null,
    academicYear,
  )

  if (staffLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 300 }} />
        </div>
      </div>
    )
  }

  if (staffError || !myStaff) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <CalendarCheck size={18} />
          <div>
            <strong>Staff record not found.</strong> Your user account is not linked to a staff profile.
            Please contact the administrator.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <CalendarCheck size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">My Timetable</h4>
            <p className="text-muted small mb-0">
              {myStaff.firstName} {myStaff.lastName} · {myStaff.employeeNumber}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 small fw-semibold text-nowrap">Year:</label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 80 }}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>
          <NotificationsPanel staffId={myStaff.id} />
        </div>
      </div>

      {/* Finalization status */}
      <FinalizationBanner academicYear={academicYear} />

      {/* Schedule grid */}
      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <span className="fw-bold text-white">Weekly Schedule · {academicYear}</span>
        </div>
        <div className="p-3">
          {entries.length === 0 && !ttLoading ? (
            <div className="text-center text-muted py-5">
              <CalendarCheck size={36} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">No schedule found</p>
              <p className="small">No timetable entries exist for {academicYear}. Contact admin if this is unexpected.</p>
            </div>
          ) : (
            <TimetableGrid entries={entries} isLoading={ttLoading} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherTimetable() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <TeacherTimetablePage />
    </RoleGuard>
  )
}
