'use client'
import React, { useState } from 'react'
import { FlaskConical, Calendar, Paperclip, BookOpen, CheckCircle, Clock, AlertTriangle, X, PencilLine } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'
import { useMyClassLabReports } from '@/features/lab-reports/hooks/useMyClassLabReports'
import { useMyLabReportSubmission } from '@/features/lab-reports/hooks/useMyLabReportSubmission'
import { useSubmitLabReport } from '@/features/lab-reports/hooks/useSubmitLabReport'
import { useUploadFile } from '@/features/staff/hooks/useUploadFile'
import type { LabReportSubmissionStatus, LabReportWithStudentStatus } from '@/types/sims/lab-reports'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors).join('; ')
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

const STATUS_CONFIG: Record<LabReportSubmissionStatus, { label: string; bg: string; color: string; icon: typeof CheckCircle }> = {
  graded: { label: 'Graded', bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  submitted: { label: 'Submitted', bg: '#e0e7ff', color: '#4338ca', icon: CheckCircle },
  late: { label: 'Late', bg: '#fee2e2', color: '#dc2626', icon: AlertTriangle },
  pending: { label: 'Not submitted', bg: '#fef3c7', color: '#92400e', icon: Clock },
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

function SubmissionPanel({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const { data: mySubmission, isLoading } = useMyLabReportSubmission(assignmentId)
  const submitMutation = useSubmitLabReport(assignmentId)
  const uploadMutation = useUploadFile()

  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<{ id: string; name: string }[]>([])
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  React.useEffect(() => {
    if (!initialized && mySubmission !== undefined) {
      setContent(mySubmission?.content ?? '')
      setAttachments((mySubmission?.attachments ?? []).map((f) => ({ id: f.id, name: f.path.split('/').pop() ?? 'Attachment' })))
      setInitialized(true)
    }
  }, [mySubmission, initialized])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const { file: uploaded } = await uploadMutation.mutateAsync(file)
      setAttachments((prev) => [...prev, { id: uploaded.id, name: file.name }])
    } catch {
      setError('File upload failed. Please try again.')
    } finally {
      e.target.value = ''
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await submitMutation.mutateAsync({ content: content.trim() || undefined, attachmentFileIds: attachments.map((f) => f.id) })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  const alreadyGraded = mySubmission?.grade != null

  return (
    <div className="border-top p-3" style={{ background: '#f8fafc' }}>
      {isLoading ? (
        <div className="text-muted small">Loading your submission…</div>
      ) : (
        <>
          {(mySubmission?.grade != null || mySubmission?.feedback) && (
            <div className="rounded-3 p-3 mb-3" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="text-muted small fw-semibold">Your grade:</span>
                {mySubmission?.grade != null ? (
                  <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: '#ede9fe', color: '#6d28d9' }}>{mySubmission.grade}</span>
                ) : (
                  <span className="text-muted small">Not graded yet</span>
                )}
              </div>
              {mySubmission?.feedback && <p className="small mb-0" style={{ color: '#475569' }}>{mySubmission.feedback}</p>}
            </div>
          )}

          {alreadyGraded ? (
            <div className="alert alert-secondary small mb-0">This lab report has already been graded and can no longer be edited.</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {success && <div className="alert alert-success py-2 small d-flex align-items-center gap-2"><CheckCircle size={15} /> Submitted successfully.</div>}
              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <textarea className="form-control form-control-sm mb-2" rows={4} placeholder="Write your lab report here…" value={content} onChange={(e) => setContent(e.target.value)} />

              {attachments.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {attachments.map((f) => (
                    <span key={f.id} className="badge rounded-pill d-flex align-items-center gap-1 px-2 py-2" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      <Paperclip size={12} /> {f.name}
                      <X size={12} role="button" onClick={() => removeAttachment(f.id)} />
                    </span>
                  ))}
                </div>
              )}

              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <label className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 mb-0">
                  {uploadMutation.isPending && <span className="spinner-border spinner-border-sm" />}
                  <Paperclip size={13} /> Attach file
                  <input type="file" className="d-none" accept="*/*" onChange={handleFileChange} disabled={uploadMutation.isPending} />
                </label>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-sm text-white fw-semibold px-3" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }} disabled={submitMutation.isPending || uploadMutation.isPending}>
                    {submitMutation.isPending ? 'Submitting…' : mySubmission ? 'Update Submission' : 'Submit Lab Report'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}

function LabReportRow({ row }: { row: LabReportWithStudentStatus }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const { assignment, status } = row

  return (
    <div className="card border-0 shadow-sm rounded-4 mb-3">
      <div className="card-body p-4 d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div style={{ minWidth: 260, flex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="badge rounded-pill px-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>{assignment.subject.name}</span>
            <StatusBadge status={status} />
          </div>
          <h6 className="fw-bold mb-1">{assignment.title}</h6>
          <p className="small mb-2" style={{ color: '#475569' }}>{assignment.instructions}</p>
          <span className="text-muted small d-flex align-items-center gap-1">
            <Calendar size={13} /> Due {new Date(assignment.dueDate).toLocaleDateString()}
          </span>
        </div>
        <div className="d-flex flex-column align-items-end gap-2" style={{ minWidth: 160 }}>
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 fw-semibold"
            style={{
              background: status === 'pending' || status === 'late' ? 'linear-gradient(135deg,#06b6d4,#0891b2)' : 'transparent',
              color: status === 'pending' || status === 'late' ? 'white' : '#0891b2',
              border: status === 'pending' || status === 'late' ? 'none' : '1px solid #a5f3fc',
            }}
            onClick={() => setPanelOpen((v) => !v)}
          >
            <PencilLine size={13} /> {status === 'pending' || status === 'late' ? 'Submit Lab Report' : status === 'graded' ? 'View Grade' : 'Edit Submission'}
          </button>
        </div>
      </div>
      {panelOpen && <SubmissionPanel assignmentId={assignment.id} onClose={() => setPanelOpen(false)} />}
    </div>
  )
}

function StudentLabReportsContent() {
  const { data: myStudent, isLoading: studentLoading, error: studentError } = useMyStudent()
  const { data: rows = [], isLoading: rowsLoading } = useMyClassLabReports()

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
            <strong>Student record not found.</strong> Your account is not yet linked to a student profile. Please contact your school administrator.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
          <FlaskConical size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">My Lab Reports</h4>
          <p className="mb-0 text-muted small">{myStudent.grade.name} — Section {myStudent.classSection.name}</p>
        </div>
      </div>

      {rowsLoading ? (
        <div className="text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <FlaskConical size={40} className="mb-3 opacity-25" />
            <p className="fw-semibold mb-1">No lab reports assigned yet</p>
            <p className="small mb-0">Your teachers haven&apos;t assigned any lab reports for your class.</p>
          </div>
        </div>
      ) : (
        rows.map((row) => <LabReportRow key={row.assignment.id} row={row} />)
      )}
    </div>
  )
}

export default function StudentLabReportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentLabReportsContent />
    </RoleGuard>
  )
}
