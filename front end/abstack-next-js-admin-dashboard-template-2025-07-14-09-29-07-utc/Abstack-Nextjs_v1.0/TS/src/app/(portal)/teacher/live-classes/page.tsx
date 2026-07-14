'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { Video, Plus, CheckCircle, AlertCircle, AlertTriangle, Calendar, Link2, Radio, Clock, CheckCheck, PlayCircle, Circle, Loader2, Image as ImageIcon, FileText } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyTeachingAssignments } from '@/features/teacher-subject-requirements/hooks/useMyTeachingAssignments'
import { useCreateLiveSession } from '@/features/lms/hooks/useCreateLiveSession'
import { useMyLiveSessions } from '@/features/lms/hooks/useMyLiveSessions'
import type { LiveSession, RecordingStatusValue, SessionStatusValue } from '@/features/lms/types'

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

const RECORDING_CONFIG: Partial<
  Record<RecordingStatusValue, { label: string; bg: string; color: string; icon: typeof Circle }>
> = {
  recording: { label: 'Recording…', bg: '#fee2e2', color: '#b91c1c', icon: Circle },
  processing: { label: 'Processing…', bg: '#fef3c7', color: '#b45309', icon: Loader2 },
  available: { label: 'Recording ready', bg: '#ede9fe', color: '#6d28d9', icon: PlayCircle },
  failed: { label: 'Recording failed', bg: '#f1f5f9', color: '#64748b', icon: AlertCircle },
}

function RecordingBadge({ status }: { status: RecordingStatusValue }) {
  const cfg = RECORDING_CONFIG[status]
  if (!cfg) return null
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

// ─── Schedule Form ──────────────────────────────────────────────────────────────

function ScheduleLiveSessionForm() {
  const { data: myTeachingAssignments = [], isLoading: teachingAssignmentsLoading } = useMyTeachingAssignments()

  const classSections = Array.from(
    new Map(myTeachingAssignments.map((r) => [r.classSectionId, r.classSection])).values(),
  )

  const [classSectionId, setClassSectionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(40)
  const [joinUrl, setJoinUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const subjectsForSelectedClass = Array.from(
    new Map(
      myTeachingAssignments
        .filter((r) => String(r.classSectionId) === classSectionId)
        .map((r) => [r.subjectId, r.subject]),
    ).values(),
  )

  function handleClassSectionChange(value: string) {
    setClassSectionId(value)
    setSubjectId('')
  }

  const createMutation = useCreateLiveSession()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createMutation.mutateAsync({
        classSectionId: Number(classSectionId),
        subjectId,
        title: title.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        joinUrl: joinUrl.trim() || undefined,
      })
      setSuccess(true)
      setClassSectionId('')
      setSubjectId('')
      setTitle('')
      setScheduledAt('')
      setDurationMinutes(40)
      setJoinUrl('')
      setTimeout(() => setSuccess(false), 2500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Something went wrong. Please try again.')
    }
  }

  if (teachingAssignmentsLoading) {
    return (
      <div className="card border-0 shadow-sm rounded-4 mb-4 placeholder-glow">
        <div className="card-body p-4">
          <span className="placeholder col-6 rounded mb-2 d-block" style={{ height: 20 }} />
          <span className="placeholder col-12 rounded" style={{ height: 80 }} />
        </div>
      </div>
    )
  }

  if (classSections.length === 0) {
    return (
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4 text-center text-muted">
          <AlertTriangle size={28} className="mb-2 opacity-50" />
          <p className="fw-semibold mb-1">You have no class/subject assignments yet</p>
          <p className="small mb-0">Contact your school administrator to be assigned to a class and subject before scheduling a live class.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card border-0 shadow-sm rounded-4 mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-4"
        style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
      >
        <span className="fw-bold text-white d-flex align-items-center gap-2">
          <Plus size={18} /> Schedule a Live Class
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card-body p-4">
          {success && (
            <div className="alert alert-success d-flex align-items-center gap-2 py-2">
              <CheckCircle size={16} /> Live class scheduled — your students can see it now.
            </div>
          )}
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold small">Class Section</label>
              <select
                className="form-select"
                value={classSectionId}
                onChange={(e) => handleClassSectionChange(e.target.value)}
                required
              >
                <option value="">— Select a class —</option>
                {classSections.map((cs) => (
                  <option key={cs.id} value={cs.id}>{cs.grade.name} - {cs.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label fw-semibold small">Subject</label>
              <select
                className="form-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                disabled={!classSectionId}
              >
                <option value="">{classSectionId ? '— Select a subject —' : 'Select a class first'}</option>
                {subjectsForSelectedClass.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold small">Topic (optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Revision session — Algebra"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label className="form-label fw-semibold small">Date &amp; Time</label>
              <input
                type="datetime-local"
                className="form-control"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold small">Duration (minutes)</label>
              <input
                type="number"
                className="form-control"
                min={5}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold small">Backup Join Link (optional)</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
            />
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>
              Your class is hosted in-app — students click &quot;Join Now&quot; right here. Add an external Zoom / Meet / Teams link only if you want a backup option.
            </span>
          </div>
        </div>
        <div className="card-footer border-0 px-4 pb-4 pt-0 bg-transparent">
          <button
            type="submit"
            className="btn text-white fw-semibold px-4"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Scheduling…' : 'Schedule Class'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── My Live Classes List ───────────────────────────────────────────────────────

function LiveSessionCard({ session }: { session: LiveSession }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex align-items-start justify-content-between mb-2 flex-wrap gap-1">
          <span className="badge rounded-pill px-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
            {session.subject.name}
          </span>
          <div className="d-flex align-items-center gap-1">
            <RecordingBadge status={session.recordingStatus} />
            <StatusBadge status={session.status} />
          </div>
        </div>
        <h6 className="fw-bold mb-1">{session.title || `${session.subject.name} — Live Class`}</h6>
        <p className="text-muted small mb-3">Section {session.classSection.name} · {session.durationMinutes} min</p>
        <span className="text-muted small d-flex align-items-center gap-1 mb-3">
          <Calendar size={13} /> {new Date(session.scheduledAt).toLocaleString()}
        </span>

        {session.status !== 'ended' && (
          <Link
            href={`/teacher/live-classes/${session.id}/host`}
            className="btn btn-sm text-white fw-semibold w-100 d-flex align-items-center justify-content-center gap-2"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
          >
            <PlayCircle size={14} /> Start Session
          </Link>
        )}

        {session.recordingAvailable && session.recordingUrl && (
          <a
            href={session.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm fw-semibold w-100 d-flex align-items-center justify-content-center gap-2 mt-2"
            style={{ background: '#ede9fe', color: '#6d28d9' }}
          >
            <PlayCircle size={14} /> Watch Recording
          </a>
        )}

        {(session.whiteboardSnapshotUrl || session.whiteboardSnapshotPdfUrl) && (
          <div className="d-flex align-items-center justify-content-center gap-3 mt-2">
            {session.whiteboardSnapshotUrl && (
              <a
                href={session.whiteboardSnapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center gap-1 small text-decoration-none"
                style={{ color: '#4338ca' }}
              >
                <ImageIcon size={13} /> Whiteboard
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
                <FileText size={13} /> PDF
              </a>
            )}
          </div>
        )}

        {session.joinUrl && (
          <a
            href={session.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="d-flex align-items-center justify-content-center gap-1 small text-decoration-none mt-2"
            style={{ color: '#4338ca' }}
          >
            <Link2 size={13} /> or use this external link instead
          </a>
        )}
      </div>
    </div>
  )
}

function TeacherLiveClassesContent() {
  const { data: sessions = [], isLoading } = useMyLiveSessions()

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
          <p className="mb-0 text-muted small">Schedule live sessions and share the join link with your students</p>
        </div>
      </div>

      <ScheduleLiveSessionForm />

      <h6 className="fw-bold mb-3">My Scheduled Classes</h6>
      {isLoading ? (
        <div className="row g-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 placeholder-glow" style={{ height: 160 }}>
                <div className="card-body p-4">
                  <span className="placeholder col-6 rounded mb-2 d-block" style={{ height: 18 }} />
                  <span className="placeholder col-12 rounded" style={{ height: 40 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <Video size={40} className="mb-3 opacity-25" />
          <p className="mb-0">You haven&apos;t scheduled any live classes yet.</p>
        </div>
      ) : (
        <div className="row g-3">
          {sessions.map((s) => (
            <div key={s.id} className="col-md-4">
              <LiveSessionCard session={s} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherLiveClassesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <TeacherLiveClassesContent />
    </RoleGuard>
  )
}
