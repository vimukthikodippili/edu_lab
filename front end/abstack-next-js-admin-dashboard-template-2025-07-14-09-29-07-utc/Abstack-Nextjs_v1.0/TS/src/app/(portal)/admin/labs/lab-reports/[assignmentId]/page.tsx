'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, CheckCircle, Clock, AlertTriangle, Paperclip, PencilLine } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useLabReportRoster } from '@/features/lab-reports/hooks/useLabReportRoster'
import { useLabReportAssignment } from '@/features/lab-reports/hooks/useLabReportAssignment'
import { useGradeLabReportSubmission } from '@/features/lab-reports/hooks/useGradeLabReportSubmission'
import type { LabReportRosterRow, LabReportSubmissionStatus } from '@/types/sims/lab-reports'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors).join('; ')
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

const STATUS_CONFIG: Record<LabReportSubmissionStatus, { label: string; bg: string; color: string; icon: typeof CheckCircle }> = {
  graded: { label: 'Graded', bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  submitted: { label: 'Submitted', bg: '#e0e7ff', color: '#4338ca', icon: ClipboardList },
  late: { label: 'Late', bg: '#fee2e2', color: '#dc2626', icon: AlertTriangle },
  pending: { label: 'Not due yet', bg: '#f1f5f9', color: '#64748b', icon: Clock },
}

function StatusBadge({ status }: { status: LabReportSubmissionStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className="badge rounded-pill px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

function GradePanel({ assignmentId, row, maxMarks, onClose }: { assignmentId: string; row: LabReportRosterRow; maxMarks: number; onClose: () => void }) {
  const [grade, setGrade] = useState(row.submission?.grade ?? '')
  const [feedback, setFeedback] = useState(row.submission?.feedback ?? '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const gradeMutation = useGradeLabReportSubmission(assignmentId)

  const numericGrade = Number(grade)
  const isInvalid = grade.trim() === '' || Number.isNaN(numericGrade) || numericGrade < 0 || numericGrade > maxMarks

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!row.submission) return
    if (isInvalid) {
      setError(`Grade must be a number between 0 and ${maxMarks}.`)
      return
    }
    try {
      await gradeMutation.mutateAsync({
        submissionId: row.submission.id,
        payload: { grade: numericGrade, feedback: feedback.trim() || undefined },
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1200)
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <tr>
      <td colSpan={5} className="p-0">
        <div className="p-3" style={{ background: '#f8fafc' }}>
          {row.submission?.content && (
            <div className="mb-2">
              <span className="text-muted small fw-semibold d-block mb-1">Student&apos;s submission</span>
              <p className="small mb-0" style={{ color: '#334155' }}>{row.submission.content}</p>
            </div>
          )}
          {(row.submission?.attachments?.length ?? 0) > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-2">
              {row.submission!.attachments.map((f) => (
                <a key={f.id} href={`${API_URL}${f.path}`} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-1 small text-decoration-none" style={{ color: '#4338ca' }}>
                  <Paperclip size={13} /> {f.path.split('/').pop()}
                </a>
              ))}
            </div>
          )}

          <form onSubmit={handleSave}>
            {success && <div className="alert alert-success py-2 small d-flex align-items-center gap-2"><CheckCircle size={14} /> Saved.</div>}
            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label fw-semibold small mb-1">Grade (/ {maxMarks})</label>
                <input type="number" min={0} max={maxMarks} step="0.5" className="form-control form-control-sm" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </div>
              <div className="col-md-7">
                <label className="form-label fw-semibold small mb-1">Feedback</label>
                <input type="text" className="form-control form-control-sm" placeholder="Written feedback for the student" maxLength={3000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-sm text-white fw-semibold px-3" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }} disabled={gradeMutation.isPending}>
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

function RosterTableRow({ assignmentId, row, maxMarks }: { assignmentId: string; row: LabReportRosterRow; maxMarks: number }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const canGrade = !!row.submission

  return (
    <>
      <tr>
        <td className="small fw-semibold">{row.student.firstName} {row.student.lastName}</td>
        <td className="small text-muted">{row.student.admissionNumber}</td>
        <td><StatusBadge status={row.status} /></td>
        <td className="small">
          {row.submission?.grade != null ? (
            <span className="badge rounded-pill px-2 py-1" style={{ background: '#ede9fe', color: '#6d28d9' }}>{row.submission.grade} / {maxMarks}</span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
        <td className="text-end">
          {canGrade ? (
            <button type="button" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" onClick={() => setPanelOpen((v) => !v)}>
              <PencilLine size={13} /> {row.status === 'graded' ? 'Edit Grade' : 'Grade'}
            </button>
          ) : (
            <span className="text-muted small">No submission</span>
          )}
        </td>
      </tr>
      {panelOpen && <GradePanel assignmentId={assignmentId} row={row} maxMarks={maxMarks} onClose={() => setPanelOpen(false)} />}
    </>
  )
}

function LabReportRosterContent({ assignmentId }: { assignmentId: string }) {
  const { data: roster, isLoading } = useLabReportRoster(assignmentId)
  const { data: assignment } = useLabReportAssignment(assignmentId)

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

  if (!roster) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning">Assignment not found.</div>
      </div>
    )
  }

  const maxMarks = assignment?.maxMarks ?? 100
  const counts = roster.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { pending: 0, late: 0, submitted: 0, graded: 0 } as Record<LabReportSubmissionStatus, number>,
  )

  return (
    <div className="container-fluid px-4 py-4">
      <Link href="/admin/labs/directory" className="d-inline-flex align-items-center gap-1 text-decoration-none small mb-3" style={{ color: '#0891b2' }}>
        <ArrowLeft size={14} /> Back to Lab Directory
      </Link>

      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
          <ClipboardList size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">{assignment?.title ?? 'Lab Report — Submission Roster'}</h4>
          <p className="mb-0 text-muted small">
            {assignment ? (
              <>
                {assignment.subject.name} — Section {assignment.classSection.name} · Due{' '}
                {new Date(assignment.dueDate).toLocaleDateString()}
              </>
            ) : (
              "Grade each student's submission and leave feedback."
            )}
          </p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {(Object.keys(STATUS_CONFIG) as LabReportSubmissionStatus[]).map((s) => (
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
                <th className="small text-muted text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => (
                <RosterTableRow key={row.student.id} assignmentId={assignmentId} row={row} maxMarks={maxMarks} />
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

interface Props {
  params: Promise<{ assignmentId: string }>
}

export default function LabReportRosterPage({ params }: Props) {
  const { assignmentId } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER]}>
      <LabReportRosterContent assignmentId={assignmentId} />
    </RoleGuard>
  )
}
