'use client'
import React, { useState } from 'react'
import { BookCheck, Plus, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useMySubjectPlans } from '@/features/grades/hooks/useMySubjectPlans'
import { useCreateAssessment } from '@/features/grades/hooks/useCreateAssessment'
import type { SubjectPlanSummary, AssessmentType } from '@/types/sims/grades'
import { ASSESSMENT_TYPE_LABELS } from '@/types/sims/grades'

// ─── Remaining badge ──────────────────────────────────────────────────────────

function RemainingBadge({ remaining }: { remaining: number }) {
  if (remaining <= 0) {
    return (
      <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>
        0 remaining
      </span>
    )
  }
  if (remaining === 1) {
    return (
      <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ background: '#fef9c3', color: '#92400e' }}>
        {remaining} remaining
      </span>
    )
  }
  return (
    <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ background: '#dcfce7', color: '#15803d' }}>
      {remaining} remaining
    </span>
  )
}

// ─── Add Assessment Modal ─────────────────────────────────────────────────────

function AddAssessmentModal({
  summary,
  termId,
  onClose,
}: {
  summary: SubjectPlanSummary
  termId: number
  onClose: () => void
}) {
  const [classSectionId, setClassSectionId] = useState('')
  const [title, setTitle] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('monthly_test')
  const [scheduledDate, setScheduledDate] = useState('')
  const [totalMarks, setTotalMarks] = useState(100)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const createMutation = useCreateAssessment()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createMutation.mutateAsync({
        subjectId: summary.subjectId,
        termId,
        classSectionId: Number(classSectionId),
        title,
        assessmentType,
        scheduledDate,
        totalMarks,
        sectionHeadOverride: false,
      })
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="modal d-flex align-items-center justify-content-center"
      style={{ display: 'flex !important', background: 'rgba(0,0,0,0.45)', position: 'fixed', inset: 0, zIndex: 1055 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-dialog-centered w-100" style={{ maxWidth: 500 }}>
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header border-0 pb-0 pt-4 px-4">
            <div>
              <h5 className="modal-title fw-bold mb-0">Add Assessment</h5>
              <p className="text-muted small mb-0">
                {summary.subjectName} ({summary.subjectCode})
              </p>
            </div>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body px-4 py-3">
              {success && (
                <div className="alert alert-success d-flex align-items-center gap-2 py-2">
                  <CheckCircle size={16} /> Assessment created successfully!
                </div>
              )}
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-semibold small">Class Section ID</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 1"
                  value={classSectionId}
                  onChange={(e) => setClassSectionId(e.target.value)}
                  required
                  min={1}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">Assessment Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Monthly Test 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={120}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">Type</label>
                <select
                  className="form-select"
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
                >
                  {(Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((k) => (
                    <option key={k} value={k}>{ASSESSMENT_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>

              <div className="row g-3">
                <div className="col-md-7">
                  <label className="form-label fw-semibold small">Scheduled Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label fw-semibold small">Total Marks</label>
                  <input
                    type="number"
                    className="form-control"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    min={1}
                    max={1000}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer border-0 px-4 pb-4">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn text-white fw-semibold px-4"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                disabled={createMutation.isPending || success}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Assessment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Subject Card ─────────────────────────────────────────────────────────────

function SubjectCard({
  summary,
  termId,
}: {
  summary: SubjectPlanSummary
  termId: number
}) {
  const [showModal, setShowModal] = useState(false)

  const required = summary.plan?.requiredAssessmentCount ?? null
  const created = summary.existingCount
  const remaining = required !== null ? required - created : null
  const atLimit = remaining !== null && remaining <= 0

  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div>
            <span
              className="badge rounded-pill px-2 mb-1"
              style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.7rem' }}
            >
              {summary.subjectCode}
            </span>
            <h6 className="fw-bold mb-0">{summary.subjectName}</h6>
          </div>
          {required !== null && (
            <RemainingBadge remaining={remaining!} />
          )}
        </div>

        {required === null ? (
          <div
            className="rounded-3 p-3 mb-3 d-flex align-items-center gap-2"
            style={{ background: '#fef9c3', color: '#92400e' }}
          >
            <AlertTriangle size={15} />
            <span className="small">No plan configured for this term.</span>
          </div>
        ) : (
          <div className="row g-2 mb-3">
            <div className="col-4 text-center">
              <div className="rounded-3 p-2" style={{ background: '#f8fafc' }}>
                <div className="fw-bold fs-5" style={{ color: '#667eea' }}>{required}</div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>Required</div>
              </div>
            </div>
            <div className="col-4 text-center">
              <div className="rounded-3 p-2" style={{ background: '#f8fafc' }}>
                <div className="fw-bold fs-5 text-dark">{created}</div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>Created</div>
              </div>
            </div>
            <div className="col-4 text-center">
              <div className="rounded-3 p-2" style={{ background: '#f8fafc' }}>
                <div
                  className="fw-bold fs-5"
                  style={{ color: atLimit ? '#dc2626' : remaining === 1 ? '#92400e' : '#15803d' }}
                >
                  {remaining}
                </div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>Remaining</div>
              </div>
            </div>
          </div>
        )}

        {atLimit && (
          <div
            className="rounded-3 p-2 mb-3 d-flex align-items-center gap-2"
            style={{ background: '#fff7ed', color: '#c2410c', fontSize: '0.78rem' }}
          >
            <AlertTriangle size={14} />
            Limit reached — contact your Section Head for an override.
          </div>
        )}

        <button
          className="btn w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
          style={{
            background: atLimit || required === null
              ? '#f1f5f9'
              : 'linear-gradient(135deg,#667eea,#764ba2)',
            color: atLimit || required === null ? '#94a3b8' : 'white',
            border: 'none',
          }}
          disabled={atLimit || required === null}
          title={atLimit ? 'Assessment limit reached' : undefined}
          onClick={() => setShowModal(true)}
        >
          <Plus size={15} />
          Add Assessment
        </button>
      </div>

      {showModal && (
        <AddAssessmentModal
          summary={summary}
          termId={termId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function TeacherAssessmentPlansContent() {
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: summaries = [], isLoading: summariesLoading } = useMySubjectPlans(selectedTermId)

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
        >
          <BookCheck size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Assessment Plans</h4>
          <p className="mb-0 text-muted small">View your subject assessment quotas and create new assessments</p>
        </div>
      </div>

      {/* Term filter */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body py-3 px-4">
          <div className="row align-items-center g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Academic Term</label>
              {termsLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-12 rounded" style={{ height: 38 }} /></div>
              ) : terms.length === 0 ? (
                <div
                  className="rounded-3 p-3 d-flex align-items-center gap-2"
                  style={{ background: '#fff7ed', color: '#c2410c', fontSize: '0.85rem' }}
                >
                  <AlertCircle size={16} />
                  No academic terms configured yet. Ask your Section Head to create a term.
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedTermId ?? ''}
                  onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Select a term —</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subject cards */}
      {!selectedTermId ? (
        <div className="text-center py-5 text-muted">
          <BookCheck size={40} className="mb-3 opacity-25" />
          <p className="mb-0">Select a term to view your subject assessment quotas.</p>
        </div>
      ) : summariesLoading ? (
        <div className="row g-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 placeholder-glow" style={{ height: 220 }}>
                <div className="card-body p-4">
                  <span className="placeholder col-8 rounded mb-2 d-block" style={{ height: 20 }} />
                  <span className="placeholder col-12 rounded mb-2 d-block" style={{ height: 60 }} />
                  <span className="placeholder col-12 rounded" style={{ height: 36 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <BookCheck size={40} className="mb-3 opacity-25" />
          <p className="mb-1 fw-semibold">No subjects assigned</p>
          <p className="mb-0 small">You have no subject assignments configured for this school year.</p>
        </div>
      ) : (
        <div className="row g-3">
          {summaries.map((s) => (
            <div key={s.subjectId} className="col-md-4 col-lg-3">
              <SubjectCard summary={s} termId={selectedTermId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherAssessmentPlansPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <TeacherAssessmentPlansContent />
    </RoleGuard>
  )
}
