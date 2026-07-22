'use client'
import React, { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, CheckCircle, Clock, AlertTriangle, HelpCircle, Paperclip, PencilLine } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAssignmentRoster } from '@/features/lms/hooks/useAssignmentRoster'
import { useGradeSubmission } from '@/features/lms/hooks/useGradeSubmission'
import type { RosterRow, RosterStatusValue } from '@/features/lms/types'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const data = e?.response?.data
  if (data?.errors) return Object.values(data.errors).join('; ')
  return data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

const STATUS_CONFIG: Record<RosterStatusValue, { label: string; bg: string; color: string; icon: typeof CheckCircle }> = {
  submitted: { label: 'Submitted', bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  late: { label: 'Late', bg: '#fff7ed', color: '#c2410c', icon: AlertTriangle },
  missing: { label: 'Missing', bg: '#fee2e2', color: '#dc2626', icon: HelpCircle },
  pending: { label: 'Not due yet', bg: '#f1f5f9', color: '#64748b', icon: Clock },
}

function StatusBadge({ status }: { status: RosterStatusValue }) {
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

// ─── Grade & Feedback Panel ─────────────────────────────────────────────────────

function GradePanel({
  assignmentId,
  row,
  onClose,
}: {
  assignmentId: string
  row: RosterRow
  onClose: () => void
}) {
  const [grade, setGrade] = useState(row.grade ?? '')
  const [feedback, setFeedback] = useState(row.feedback ?? '')
  const [topicValues, setTopicValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    row.topicMarks.forEach((t) => {
      map[t.subjectTopicId] = t.score !== null ? String(t.score) : ''
    })
    return map
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const gradeMutation = useGradeSubmission(assignmentId)
  const isTopicTracked = row.topicMarks.length > 0

  let topicTotal = 0
  let hasAnyTopicValue = false
  const topicCellInvalid: Record<string, boolean> = {}
  row.topicMarks.forEach((topic) => {
    const raw = topicValues[topic.subjectTopicId] ?? ''
    if (raw.trim() === '') return
    const n = Number(raw)
    if (Number.isNaN(n)) return
    hasAnyTopicValue = true
    topicTotal += n
    topicCellInvalid[topic.subjectTopicId] = n > topic.maxMarks
  })
  const hasInvalidTopicCell = Object.values(topicCellInvalid).some(Boolean)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!row.submissionId) return
    if (hasInvalidTopicCell) {
      setError('Fix the highlighted topic marks before saving.')
      return
    }

    const topicScores = isTopicTracked
      ? Object.entries(topicValues)
          .filter(([, v]) => v.trim() !== '')
          .map(([subjectTopicId, v]) => ({ subjectTopicId, score: Number(v) }))
      : []

    try {
      await gradeMutation.mutateAsync({
        submissionId: row.submissionId,
        payload: {
          grade: grade.trim() || undefined,
          feedback: feedback.trim() || undefined,
          topicScores: topicScores.length > 0 ? topicScores : undefined,
        },
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1200)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="p-3" style={{ background: '#f8fafc' }}>
          {row.textContent && (
            <div className="mb-2">
              <span className="text-muted small fw-semibold d-block mb-1">Student's answer</span>
              <p className="small mb-0" style={{ color: '#334155' }}>{row.textContent}</p>
            </div>
          )}
          {row.attachments.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-2">
              {row.attachments.map((f) => (
                <a
                  key={f.id}
                  href={f.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-flex align-items-center gap-1 small text-decoration-none"
                  style={{ color: '#4338ca' }}
                >
                  <Paperclip size={13} /> Attachment
                </a>
              ))}
            </div>
          )}

          <form onSubmit={handleSave}>
            {success && (
              <div className="alert alert-success py-2 small d-flex align-items-center gap-2">
                <CheckCircle size={14} /> Saved.
              </div>
            )}
            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            {isTopicTracked && (
              <div className="mb-3">
                <span className="text-muted small fw-semibold d-block mb-2">Topic marks</span>
                <div className="d-flex flex-wrap gap-3 align-items-end">
                  {row.topicMarks.map((topic) => {
                    const value = topicValues[topic.subjectTopicId] ?? ''
                    const isInvalid = topicCellInvalid[topic.subjectTopicId] === true
                    return (
                      <div key={topic.subjectTopicId}>
                        <label className="form-label small mb-1">{topic.title}</label>
                        <div className="d-flex align-items-center gap-1">
                          <input
                            type="number"
                            className={`form-control form-control-sm ${isInvalid ? 'is-invalid' : ''}`}
                            style={{ width: 76 }}
                            min={0}
                            max={topic.maxMarks}
                            step="0.5"
                            value={value}
                            onChange={(e) =>
                              setTopicValues((prev) => ({ ...prev, [topic.subjectTopicId]: e.target.value }))
                            }
                          />
                          <span className="text-muted small">/ {topic.maxMarks}</span>
                        </div>
                      </div>
                    )
                  })}
                  <div>
                    <span className="text-muted small d-block mb-1">Total</span>
                    <span className="fw-bold" style={{ color: hasAnyTopicValue ? '#3730a3' : '#94a3b8' }}>
                      {hasAnyTopicValue ? topicTotal : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label fw-semibold small mb-1">Grade</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. A"
                  maxLength={20}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </div>
              <div className="col-md-7">
                <label className="form-label fw-semibold small mb-1">Feedback</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Written feedback for the student"
                  maxLength={3000}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-sm text-white fw-semibold px-3"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
                  disabled={gradeMutation.isPending}
                >
                  {gradeMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </td>
    </tr>
  )
}

// ─── Roster Row ──────────────────────────────────────────────────────────────

function RosterTableRow({ assignmentId, row }: { assignmentId: string; row: RosterRow }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const canGrade = !!row.submissionId

  return (
    <>
      <tr>
        <td className="small fw-semibold">{row.firstName} {row.lastName}</td>
        <td className="small text-muted">{row.admissionNumber}</td>
        <td><StatusBadge status={row.status} /></td>
        <td className="small">
          {row.grade ? (
            <span className="badge rounded-pill px-2 py-1" style={{ background: '#ede9fe', color: '#6d28d9' }}>{row.grade}</span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
        <td className="small">
          {row.topicMarks.length > 0 ? (
            row.totalScore !== null ? (
              <span className="fw-semibold" style={{ color: '#3730a3' }}>{row.totalScore}</span>
            ) : (
              <span className="text-muted">—</span>
            )
          ) : (
            <span className="text-muted">n/a</span>
          )}
        </td>
        <td className="text-end">
          {canGrade ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
              onClick={() => setPanelOpen((v) => !v)}
            >
              <PencilLine size={13} /> {row.grade || row.feedback ? 'Edit Grade' : 'Grade'}
            </button>
          ) : (
            <span className="text-muted small">No submission</span>
          )}
        </td>
      </tr>
      {panelOpen && <GradePanel assignmentId={assignmentId} row={row} onClose={() => setPanelOpen(false)} />}
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>
}

function TeacherRosterContent({ assignmentId }: { assignmentId: string }) {
  const { data, isLoading } = useAssignmentRoster(assignmentId)

  if (isLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 32 }} />
          <span className="placeholder col-12 rounded" style={{ height: 300 }} />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning">Assignment not found.</div>
      </div>
    )
  }

  const { assignment, roster } = data
  const counts = roster.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { submitted: 0, late: 0, missing: 0, pending: 0 } as Record<RosterStatusValue, number>,
  )

  return (
    <div className="container-fluid px-4 py-4">
      <Link href="/teacher/assignments" className="d-inline-flex align-items-center gap-1 text-decoration-none small mb-3" style={{ color: '#6366f1' }}>
        <ArrowLeft size={14} /> Back to Assignments
      </Link>

      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
        >
          <ClipboardList size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">{assignment.title}</h4>
          <p className="mb-0 text-muted small">
            {assignment.subject.name} — Section {assignment.classSection.name} · Due {new Date(assignment.dueDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {(Object.keys(STATUS_CONFIG) as RosterStatusValue[]).map((s) => (
          <div key={s} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-4 text-center py-3">
              <div className="fw-bold fs-4" style={{ color: STATUS_CONFIG[s].color }}>{counts[s]}</div>
              <div className="text-muted small">{STATUS_CONFIG[s].label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr className="table-light">
                <th className="small text-muted">Student</th>
                <th className="small text-muted">Admission No.</th>
                <th className="small text-muted">Status</th>
                <th className="small text-muted">Grade</th>
                <th className="small text-muted">Total</th>
                <th className="small text-muted text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => (
                <RosterTableRow key={row.studentId} assignmentId={assignmentId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
        {roster.length === 0 && (
          <div className="text-center text-muted py-5">
            <ClipboardList size={36} className="mb-2 opacity-25" />
            <p className="mb-0">No active students in this class section.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeacherAssignmentRosterPage({ params }: Props) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <TeacherRosterContent assignmentId={id} />
    </RoleGuard>
  )
}
