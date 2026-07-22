'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { ListChecks, Plus, Paperclip, X, CheckCircle, AlertCircle, Calendar, AlertTriangle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyTeachingAssignments } from '@/features/teacher-subject-requirements/hooks/useMyTeachingAssignments'
import { useCreateAssignment } from '@/features/lms/hooks/useCreateAssignment'
import { useMyAssignments } from '@/features/lms/hooks/useMyAssignments'
import { useUploadFile } from '@/features/staff/hooks/useUploadFile'
import TopicAllocationEditor, {
  type TopicAllocation,
} from '@/features/subject-topics/components/TopicAllocationEditor'
import type { Assignment } from '@/features/lms/types'

// ─── Create Assignment Form ───────────────────────────────────────────────────

function CreateAssignmentForm() {
  const { data: myTeachingAssignments = [], isLoading: teachingAssignmentsLoading } = useMyTeachingAssignments()

  const classSections = Array.from(
    new Map(myTeachingAssignments.map((r) => [r.classSectionId, r.classSection])).values(),
  )

  const [classSectionId, setClassSectionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [attachmentFileIds, setAttachmentFileIds] = useState<{ id: string; name: string }[]>([])
  const [topicAllocations, setTopicAllocations] = useState<TopicAllocation[]>([])
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

  const createMutation = useCreateAssignment()
  const uploadMutation = useUploadFile()

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
    if (topicAllocations.length === 0) {
      setError('Allocate at least one topic a mark before creating the assignment.')
      return
    }
    try {
      await createMutation.mutateAsync({
        classSectionId: Number(classSectionId),
        subjectId,
        title,
        instructions,
        dueDate,
        attachmentFileIds: attachmentFileIds.map((f) => f.id),
        topicAllocations,
      })
      setSuccess(true)
      setClassSectionId('')
      setSubjectId('')
      setTitle('')
      setInstructions('')
      setDueDate('')
      setAttachmentFileIds([])
      setTopicAllocations([])
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
          <p className="small mb-0">Contact your school administrator to be assigned to a class and subject before creating homework.</p>
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
          <Plus size={18} /> New Homework Assignment
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card-body p-4">
          {success && (
            <div className="alert alert-success d-flex align-items-center gap-2 py-2">
              <CheckCircle size={16} /> Assignment created — your students can see it now.
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
            <label className="form-label fw-semibold small">Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Chapter 4 — Fractions Worksheet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={150}
            />
          </div>

          <div className="mt-3">
            <label className="form-label fw-semibold small">Instructions</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Complete questions 1-10 on page 42. Show your working."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
              maxLength={5000}
            />
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label className="form-label fw-semibold small">Due Date</label>
              <input
                type="date"
                className="form-control"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold small">Attachments (optional)</label>
              <input
                type="file"
                className="form-control"
                onChange={handleFileChange}
                disabled={uploadMutation.isPending}
              />
            </div>
          </div>

          {attachmentFileIds.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {attachmentFileIds.map((f) => (
                <span
                  key={f.id}
                  className="badge rounded-pill d-flex align-items-center gap-1 px-2 py-2"
                  style={{ background: '#eef2ff', color: '#4338ca' }}
                >
                  <Paperclip size={12} /> {f.name}
                  <button
                    type="button"
                    className="btn-close btn-close-sm ms-1"
                    style={{ fontSize: '0.55rem' }}
                    onClick={() => removeAttachment(f.id)}
                    aria-label="Remove attachment"
                  />
                </span>
              ))}
            </div>
          )}

          {subjectId && (
            <div className="mt-3">
              <TopicAllocationEditor subjectId={subjectId} onAllocationsChange={setTopicAllocations} />
            </div>
          )}
        </div>
        <div className="card-footer border-0 px-4 pb-4 pt-0 bg-transparent">
          <button
            type="submit"
            className="btn text-white fw-semibold px-4"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
            disabled={createMutation.isPending || uploadMutation.isPending || topicAllocations.length === 0}
          >
            {createMutation.isPending ? 'Creating…' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── My Assignments List ──────────────────────────────────────────────────────

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
  return <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#dcfce7', color: '#15803d' }}>Due in {days}d</span>
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <span className="badge rounded-pill px-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
            {assignment.subject.name}
          </span>
          <DueBadge dueDate={assignment.dueDate} />
        </div>
        <h6 className="fw-bold mb-1">{assignment.title}</h6>
        <p className="text-muted small mb-2">Section {assignment.classSection.name}</p>
        <p className="small mb-3" style={{ color: '#475569' }}>{assignment.instructions}</p>
        <div className="d-flex align-items-center justify-content-between">
          <span className="text-muted small d-flex align-items-center gap-1">
            <Calendar size={13} /> {new Date(assignment.dueDate).toLocaleDateString()}
          </span>
          {assignment.attachments.length > 0 && (
            <span className="text-muted small d-flex align-items-center gap-1">
              <Paperclip size={13} /> {assignment.attachments.length}
            </span>
          )}
        </div>
        <Link
          href={`/teacher/assignments/${assignment.id}/roster`}
          className="btn btn-sm btn-outline-primary w-100 mt-3"
        >
          View Roster
        </Link>
      </div>
    </div>
  )
}

function TeacherAssignmentsContent() {
  const { data: assignments = [], isLoading } = useMyAssignments()

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
          <h4 className="mb-0 fw-bold">Homework & Assignments</h4>
          <p className="mb-0 text-muted small">Create assignments and track what you&apos;ve set for your classes</p>
        </div>
      </div>

      <CreateAssignmentForm />

      <h6 className="fw-bold mb-3">My Assignments</h6>
      {isLoading ? (
        <div className="row g-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 placeholder-glow" style={{ height: 180 }}>
                <div className="card-body p-4">
                  <span className="placeholder col-6 rounded mb-2 d-block" style={{ height: 18 }} />
                  <span className="placeholder col-12 rounded" style={{ height: 60 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <ListChecks size={40} className="mb-3 opacity-25" />
          <p className="mb-0">You haven&apos;t created any assignments yet.</p>
        </div>
      ) : (
        <div className="row g-3">
          {assignments.map((a) => (
            <div key={a.id} className="col-md-4">
              <AssignmentCard assignment={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherAssignmentsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <TeacherAssignmentsContent />
    </RoleGuard>
  )
}
