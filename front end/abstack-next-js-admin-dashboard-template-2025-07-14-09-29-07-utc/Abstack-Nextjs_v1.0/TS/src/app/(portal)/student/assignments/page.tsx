'use client'
import React, { useState } from 'react'
import { ListChecks, Calendar, Paperclip, BookOpen, CheckCircle, Clock, X, PencilLine } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'
import { useMyClassAssignments } from '@/features/lms/hooks/useMyClassAssignments'
import { useSubmissionStatuses } from '@/features/lms/hooks/useSubmissionStatuses'
import { useMySubmission } from '@/features/lms/hooks/useMySubmission'
import { useSubmitAssignment } from '@/features/lms/hooks/useSubmitAssignment'
import { useUploadFile } from '@/features/staff/hooks/useUploadFile'
import { TopicScoreChips } from '@/features/grades/components/TopicScoreChips'
import type { Assignment, SubmissionStatusValue } from '@/features/lms/types'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const data = e?.response?.data
  if (data?.errors) return Object.values(data.errors).join('; ')
  return data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function daysUntil(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate)
  if (days < 0) {
    return <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#fee2e2', color: '#dc2626' }}>Overdue</span>
  }
  if (days === 0) {
    return <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#fef9c3', color: '#92400e' }}>Due today</span>
  }
  if (days <= 2) {
    return <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#fff7ed', color: '#c2410c' }}>Due in {days}d</span>
  }
  return <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#dcfce7', color: '#15803d' }}>Due in {days}d</span>
}

function SubmissionStatusBadge({ status }: { status: SubmissionStatusValueProp }) {
  if (status === 'submitted') {
    return (
      <span className="badge rounded-pill px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1" style={{ background: '#dcfce7', color: '#15803d' }}>
        <CheckCircle size={12} /> Submitted
      </span>
    )
  }
  return (
    <span className="badge rounded-pill px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1" style={{ background: '#fef3c7', color: '#92400e' }}>
      <Clock size={12} /> Not submitted
    </span>
  )
}

type SubmissionStatusValueProp = 'submitted' | 'not_submitted'

// ─── Submission panel (expandable) ─────────────────────────────────────────────

function SubmissionPanel({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const { data: mySubmission, isLoading: submissionLoading } = useMySubmission(assignmentId, true)
  const submitMutation = useSubmitAssignment(assignmentId)
  const uploadMutation = useUploadFile()

  const [textContent, setTextContent] = useState('')
  const [attachmentFileIds, setAttachmentFileIds] = useState<{ id: string; name: string }[]>([])
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  React.useEffect(() => {
    if (!initialized && mySubmission !== undefined) {
      setTextContent(mySubmission?.textContent ?? '')
      setAttachmentFileIds(
        (mySubmission?.attachments ?? []).map((f) => ({ id: f.id, name: 'Attachment' })),
      )
      setInitialized(true)
    }
  }, [mySubmission, initialized])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const { file: uploaded } = await uploadMutation.mutateAsync(file)
      setAttachmentFileIds((prev) => [...prev, { id: uploaded.id, name: file.name }])
    } catch {
      setError('File upload failed. Please try again.')
    } finally {
      e.target.value = ''
    }
  }

  function removeAttachment(id: string) {
    setAttachmentFileIds((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await submitMutation.mutateAsync({
        textContent: textContent.trim() || undefined,
        attachmentFileIds: attachmentFileIds.map((f) => f.id),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <div className="border-top p-3" style={{ background: '#f8fafc' }}>
      {submissionLoading ? (
        <div className="text-muted small">Loading your submission…</div>
      ) : (
        <>
          {(mySubmission?.grade || mySubmission?.feedback || (mySubmission?.topicMarks?.length ?? 0) > 0) && (
            <div className="rounded-3 p-3 mb-3" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="text-muted small fw-semibold">Your grade:</span>
                {mySubmission?.grade ? (
                  <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                    {mySubmission.grade}
                  </span>
                ) : (
                  <span className="text-muted small">Not graded yet</span>
                )}
                {mySubmission?.totalScore != null && (
                  <span className="small text-muted">
                    ({mySubmission.totalScore}/{mySubmission.topicMarks.reduce((sum, t) => sum + t.maxMarks, 0)})
                  </span>
                )}
              </div>
              {mySubmission?.feedback && (
                <p className="small mb-2" style={{ color: '#475569' }}>{mySubmission.feedback}</p>
              )}
              {(mySubmission?.topicMarks?.length ?? 0) > 0 && (
                <TopicScoreChips items={mySubmission!.topicMarks} />
              )}
            </div>
          )}
        <form onSubmit={handleSubmit}>
          {success && (
            <div className="alert alert-success py-2 small d-flex align-items-center gap-2">
              <CheckCircle size={15} /> Submitted successfully.
            </div>
          )}
          {error && <div className="alert alert-danger py-2 small">{error}</div>}

          <textarea
            className="form-control form-control-sm mb-2"
            rows={3}
            placeholder="Type your answer here…"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
          />

          {attachmentFileIds.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-2">
              {attachmentFileIds.map((f) => (
                <span
                  key={f.id}
                  className="badge rounded-pill d-flex align-items-center gap-1 px-2 py-2"
                  style={{ background: '#e0e7ff', color: '#4338ca' }}
                >
                  <Paperclip size={12} /> {f.name}
                  <X size={12} role="button" onClick={() => removeAttachment(f.id)} />
                </span>
              ))}
            </div>
          )}

          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <label className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 mb-0">
              {uploadMutation.isPending && <span className="spinner-border spinner-border-sm" />}
              <Paperclip size={13} />
              Attach file or image
              <input type="file" className="d-none" accept="*/*" onChange={handleFileChange} disabled={uploadMutation.isPending} />
            </label>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn btn-sm text-white fw-semibold px-3"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
                disabled={submitMutation.isPending || uploadMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting…' : mySubmission ? 'Update Submission' : 'Submit Homework'}
              </button>
            </div>
          </div>
        </form>
        </>
      )}
    </div>
  )
}

// ─── Assignment row ────────────────────────────────────────────────────────────

function AssignmentRow({ assignment, status }: { assignment: Assignment; status: SubmissionStatusValueProp }) {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="card border-0 shadow-sm rounded-4 mb-3">
      <div className="card-body p-4 d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div style={{ minWidth: 260, flex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="badge rounded-pill px-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
              {assignment.subject.name}
            </span>
            <DueBadge dueDate={assignment.dueDate} />
            <SubmissionStatusBadge status={status} />
          </div>
          <h6 className="fw-bold mb-1">{assignment.title}</h6>
          <p className="small mb-2" style={{ color: '#475569' }}>{assignment.instructions}</p>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <span className="text-muted small d-flex align-items-center gap-1">
              <Calendar size={13} /> Due {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
            <span className="text-muted small">
              {assignment.createdByTeacher.firstName} {assignment.createdByTeacher.lastName}
            </span>
          </div>
        </div>
        <div className="d-flex flex-column align-items-end gap-2" style={{ minWidth: 160 }}>
          {assignment.attachments.map((f) => (
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
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 fw-semibold"
            style={{
              background: status === 'submitted' ? 'transparent' : 'linear-gradient(135deg,#0ea5e9,#6366f1)',
              color: status === 'submitted' ? '#4338ca' : 'white',
              border: status === 'submitted' ? '1px solid #c7d2fe' : 'none',
            }}
            onClick={() => setPanelOpen((v) => !v)}
          >
            <PencilLine size={13} />
            {status === 'submitted' ? 'Edit Submission' : 'Submit Homework'}
          </button>
        </div>
      </div>
      {panelOpen && <SubmissionPanel assignmentId={assignment.id} onClose={() => setPanelOpen(false)} />}
    </div>
  )
}

function StudentAssignmentsContent() {
  const { data: myStudent, isLoading: studentLoading, error: studentError } = useMyStudent()
  const { data: assignments = [], isLoading: assignmentsLoading } = useMyClassAssignments()
  const { data: statuses = [] } = useSubmissionStatuses()

  const statusByAssignmentId = new Map(statuses.map((s) => [s.assignmentId, s.status]))

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
          <ListChecks size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">My Assignments</h4>
          <p className="mb-0 text-muted small">
            {myStudent.grade.name} — Section {myStudent.classSection.name}
          </p>
        </div>
      </div>

      {assignmentsLoading ? (
        <div className="text-muted">Loading…</div>
      ) : assignments.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <ListChecks size={40} className="mb-3 opacity-25" />
            <p className="fw-semibold mb-1">No homework assigned yet</p>
            <p className="small mb-0">Your teachers haven&apos;t posted any assignments for your class.</p>
          </div>
        </div>
      ) : (
        assignments.map((a) => (
          <AssignmentRow key={a.id} assignment={a} status={statusByAssignmentId.get(a.id) ?? 'not_submitted'} />
        ))
      )}
    </div>
  )
}

export default function StudentAssignmentsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentAssignmentsContent />
    </RoleGuard>
  )
}
