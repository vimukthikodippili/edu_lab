'use client'
import Link from 'next/link'
import { Video, Calendar, Clock, Radio, CheckCheck, BookOpen, Link2, PlayCircle, Image as ImageIcon, FileText } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'
import { useMyClassLiveSessions } from '@/features/lms/hooks/useMyClassLiveSessions'
import type { LiveSession, SessionStatusValue } from '@/features/lms/types'

const STATUS_CONFIG: Record<SessionStatusValue, { label: string; bg: string; color: string; icon: typeof Radio }> = {
  scheduled: { label: 'Scheduled', bg: '#f1f5f9', color: '#64748b', icon: Clock },
  live: { label: 'Live now', bg: '#dcfce7', color: '#15803d', icon: Radio },
  ended: { label: 'Ended', bg: '#e2e8f0', color: '#475569', icon: CheckCheck },
}

function StatusBadge({ status }: { status: SessionStatusValue }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

function LiveSessionRow({ session }: { session: LiveSession }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 mb-3">
      <div className="card-body p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div style={{ minWidth: 240, flex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="badge rounded-pill px-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
              {session.subject.name}
            </span>
            <StatusBadge status={session.status} />
          </div>
          <h6 className="fw-bold mb-1">{session.title || `${session.subject.name} — Live Class`}</h6>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <span className="text-muted small d-flex align-items-center gap-1">
              <Calendar size={13} /> {new Date(session.scheduledAt).toLocaleString()}
            </span>
            <span className="text-muted small">
              {session.createdByTeacher.firstName} {session.createdByTeacher.lastName} · {session.durationMinutes} min
            </span>
          </div>
        </div>

        <div className="d-flex flex-column align-items-end gap-2">
          {session.canJoin ? (
            <Link
              href={`/student/live-classes/${session.id}/join`}
              className="btn btn-sm text-white fw-semibold px-3 d-flex align-items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
            >
              <Radio size={14} /> Join Now
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-light fw-semibold px-3 d-flex align-items-center gap-2"
              disabled
              title={session.status === 'ended' ? 'This class has ended' : 'The join link opens closer to the start time'}
            >
              <Clock size={14} /> {session.status === 'ended' ? 'Ended' : 'Not yet open'}
            </button>
          )}
          {session.joinUrl && (
            <a
              href={session.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d-flex align-items-center gap-1 small text-decoration-none"
              style={{ color: '#4338ca' }}
            >
              <Link2 size={12} /> external link
            </a>
          )}
          {session.status === 'ended' &&
            (session.recordingAvailable && session.recordingUrl ? (
              <a
                href={session.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm fw-semibold px-3 d-flex align-items-center gap-2"
                style={{ background: '#ede9fe', color: '#6d28d9' }}
              >
                <PlayCircle size={14} /> Watch Recording
              </a>
            ) : (
              <span className="text-muted small text-end" style={{ maxWidth: 180 }}>
                Recording will be available after the session
              </span>
            ))}
          {session.status === 'ended' && (session.whiteboardSnapshotUrl || session.whiteboardSnapshotPdfUrl) && (
            <div className="d-flex align-items-center gap-2">
              {session.whiteboardSnapshotUrl && (
                <a
                  href={session.whiteboardSnapshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-flex align-items-center gap-1 small text-decoration-none"
                  style={{ color: '#4338ca' }}
                >
                  <ImageIcon size={12} /> Whiteboard
                </a>
              )}
              {session.whiteboardSnapshotPdfUrl && (
                <a
                  href={session.whiteboardSnapshotPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-flex align-items-center gap-1 small text-decoration-none"
                  style={{ color: '#4338ca' }}
                >
                  <FileText size={12} /> PDF
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StudentLiveClassesContent() {
  const { data: myStudent, isLoading: studentLoading, error: studentError } = useMyStudent()
  const { data: sessions = [], isLoading: sessionsLoading } = useMyClassLiveSessions()

  if (studentLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (studentError || !myStudent) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <BookOpen size={18} />
          <div>
            <strong>Student record not found.</strong> Your account is not yet linked to a student profile.
            Please contact your school administrator.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
        >
          <Video size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Live Online Classes</h4>
          <p className="mb-0 text-muted small">
            {myStudent.grade.name} — Section {myStudent.classSection.name}
          </p>
        </div>
      </div>

      {sessionsLoading ? (
        <div className="text-muted">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <Video size={40} className="mb-3 opacity-25" />
            <p className="fw-semibold mb-1">No live classes scheduled</p>
            <p className="small mb-0">Your teachers haven&apos;t scheduled any live sessions for your class yet.</p>
          </div>
        </div>
      ) : (
        sessions.map((s) => <LiveSessionRow key={s.id} session={s} />)
      )}
    </div>
  )
}

export default function StudentLiveClassesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentLiveClassesContent />
    </RoleGuard>
  )
}
