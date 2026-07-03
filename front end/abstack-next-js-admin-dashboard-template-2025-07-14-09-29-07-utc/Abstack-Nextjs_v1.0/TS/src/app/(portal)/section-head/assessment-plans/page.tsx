'use client'
import React, { useState } from 'react'
import { ClipboardCheck, Plus, Pencil, Trash2, AlertCircle, CalendarDays } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useAssessmentPlans } from '@/features/grades/hooks/useAssessmentPlans'
import { useCreateAssessmentPlan } from '@/features/grades/hooks/useCreateAssessmentPlan'
import { useUpdateAssessmentPlan } from '@/features/grades/hooks/useUpdateAssessmentPlan'
import { useDeleteAssessmentPlan } from '@/features/grades/hooks/useDeleteAssessmentPlan'
import { useCreateAcademicTerm } from '@/features/grades/hooks/useCreateAcademicTerm'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import type { TermAssessmentPlan } from '@/types/sims/grades'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanModalState {
  open: boolean
  editing: TermAssessmentPlan | null
}

// ─── Create Term Modal ────────────────────────────────────────────────────────

function CreateTermModal({ onClose }: { onClose: () => void }) {
  const currentYear = new Date().getFullYear().toString()
  const [name, setName] = useState('')
  const [termNumber, setTermNumber] = useState(1)
  const [academicYear, setAcademicYear] = useState(currentYear)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  const createMutation = useCreateAcademicTerm()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name || !startDate || !endDate) { setError('All fields are required.'); return }
    if (endDate <= startDate) { setError('End date must be after start date.'); return }
    try {
      await createMutation.mutateAsync({ name, termNumber, academicYear, startDate, endDate })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to create term. Please try again.')
    }
  }

  return (
    <div
      className="modal d-flex align-items-center justify-content-center"
      style={{ display: 'flex !important', background: 'rgba(0,0,0,0.45)', position: 'fixed', inset: 0, zIndex: 1055 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-dialog-centered w-100" style={{ maxWidth: 460 }}>
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header border-0 pb-0 pt-4 px-4">
            <h5 className="modal-title fw-bold">Create Academic Term</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body px-4 py-3">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-semibold small">Term Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Term 1 – 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Term Number</label>
                  <select
                    className="form-select"
                    value={termNumber}
                    onChange={(e) => setTermNumber(Number(e.target.value))}
                  >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Academic Year</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="2026"
                    maxLength={4}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Term'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Assessment Plan Modal ────────────────────────────────────────────────────

function AssessmentPlanModal({
  terms,
  editing,
  onClose,
}: {
  terms: { id: number; name: string }[]
  editing: TermAssessmentPlan | null
  onClose: () => void
}) {
  const [subjectId, setSubjectId] = useState(editing?.subjectId ?? '')
  const [termId, setTermId] = useState<number>(editing?.termId ?? (terms[0]?.id ?? 0))
  const [count, setCount] = useState<number>(editing?.requiredAssessmentCount ?? 1)
  const [error, setError] = useState('')

  const {
    data: subjectsData,
    isLoading: subjectsLoading,
    isError: subjectsError,
    error: subjectsErrorObj,
  } = useSubjects({ limit: 100 })
  const subjects = subjectsData?.data ?? []

  const createMutation = useCreateAssessmentPlan()
  const updateMutation = useUpdateAssessmentPlan(editing?.id ?? 0)

  const isLoading = createMutation.isPending || updateMutation.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await updateMutation.mutateAsync({ requiredAssessmentCount: count })
      } else {
        if (!subjectId.trim()) { setError('Subject ID is required.'); return }
        await createMutation.mutateAsync({ subjectId: subjectId.trim(), termId, requiredAssessmentCount: count })
      }
      onClose()
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
      <div className="modal-dialog modal-dialog-centered w-100" style={{ maxWidth: 480 }}>
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header border-0 pb-0 pt-4 px-4">
            <h5 className="modal-title fw-bold">
              {editing ? 'Edit Assessment Plan' : 'Set Assessment Plan'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body px-4 py-3">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {!editing && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Subject</label>
                  {subjectsLoading ? (
                    <div className="placeholder-glow">
                      <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                    </div>
                  ) : subjectsError ? (
                    <div className="form-text text-danger">
                      Failed to load subjects:{' '}
                      {(subjectsErrorObj as Error & { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ?? subjectsErrorObj?.message ?? 'Unknown error.'}
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="form-text text-danger">
                      No subjects found. Create one on the Subjects page first.
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      required
                    >
                      <option value="">— Select a subject —</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {editing && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    value={`${editing.subject.name} (${editing.subject.code})`}
                    disabled
                  />
                </div>
              )}

              {!editing && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Term</label>
                  <select
                    className="form-select"
                    value={termId}
                    onChange={(e) => setTermId(Number(e.target.value))}
                    required
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editing && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Term</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editing.term.name}
                    disabled
                  />
                </div>
              )}

              <div className="mb-1">
                <label className="form-label fw-semibold small">
                  Required Assessments <span className="text-muted">(1–10)</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="modal-footer border-0 px-4 pb-4">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn text-white fw-semibold px-4"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                disabled={isLoading}
              >
                {isLoading ? 'Saving…' : editing ? 'Update Plan' : 'Set Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AssessmentPlansContent() {
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [modal, setModal] = useState<PlanModalState>({ open: false, editing: null })
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showCreateTerm, setShowCreateTerm] = useState(false)

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: plans = [], isLoading: plansLoading } = useAssessmentPlans(selectedTermId)
  const deleteMutation = useDeleteAssessmentPlan()

  async function handleDelete(id: number) {
    if (!confirm('Delete this assessment plan? This cannot be undone if assessments already exist.')) return
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
          >
            <ClipboardCheck size={22} color="white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Assessment Plans</h4>
            <p className="mb-0 text-muted small">Define required assessment counts per subject per term</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => setShowCreateTerm(true)}
          >
            <CalendarDays size={16} /> New Term
          </button>
          <button
            className="btn text-white fw-semibold d-flex align-items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
            onClick={() => setModal({ open: true, editing: null })}
            disabled={terms.length === 0}
          >
            <Plus size={16} /> Set Plan
          </button>
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
            {terms.length === 0 && !termsLoading && (
              <div className="col">
                <div className="d-flex align-items-center gap-2">
                  <AlertCircle size={15} className="text-warning" />
                  <span className="text-muted small">No academic terms yet.</span>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setShowCreateTerm(true)}
                  >
                    + Create first term
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plans table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          {!selectedTermId ? (
            <div className="text-center py-5 text-muted">
              <ClipboardCheck size={40} className="mb-3 opacity-25" />
              <p className="mb-0">Select a term above to view or manage assessment plans.</p>
            </div>
          ) : plansLoading ? (
            <div className="p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="placeholder-glow mb-3">
                  <span className="placeholder col-12 rounded" style={{ height: 32 }} />
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <ClipboardCheck size={40} className="mb-3 opacity-25" />
              <p className="mb-1 fw-semibold">No plans configured for this term</p>
              <p className="mb-0 small">Click "Set Plan" to configure assessment counts per subject.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">#</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Subject</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Required</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Set By</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Last Updated</th>
                    <th className="py-3 text-muted small fw-semibold border-0 text-end px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, idx) => (
                    <tr key={plan.id}>
                      <td className="px-4 text-muted small">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge rounded-pill px-2" style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.7rem' }}>
                            {plan.subject.code}
                          </span>
                          <span className="fw-semibold">{plan.subject.name}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge rounded-pill fw-bold px-3 py-2"
                          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', fontSize: '0.85rem' }}
                        >
                          {plan.requiredAssessmentCount}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {plan.setSectionHead?.firstName} {plan.setSectionHead?.lastName}
                      </td>
                      <td className="text-muted small">
                        {new Date(plan.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="text-end px-4">
                        <button
                          className="btn btn-sm btn-outline-secondary me-1"
                          title="Edit"
                          onClick={() => setModal({ open: true, editing: plan })}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          title="Delete"
                          disabled={deletingId === plan.id}
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateTerm && (
        <CreateTermModal onClose={() => setShowCreateTerm(false)} />
      )}

      {modal.open && (
        <AssessmentPlanModal
          terms={terms}
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
        />
      )}
    </div>
  )
}

export default function AssessmentPlansPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECTION_HEAD]}>
      <AssessmentPlansContent />
    </RoleGuard>
  )
}
