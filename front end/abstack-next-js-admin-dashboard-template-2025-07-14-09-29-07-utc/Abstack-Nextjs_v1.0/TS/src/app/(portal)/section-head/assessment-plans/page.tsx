'use client'
import React, { useEffect, useState } from 'react'
import { ClipboardCheck, Plus, Pencil, Trash2, AlertCircle, CalendarDays, Lock, CheckCircle2 } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useAssessmentPlans } from '@/features/grades/hooks/useAssessmentPlans'
import { useCreateAssessmentPlan } from '@/features/grades/hooks/useCreateAssessmentPlan'
import { useUpdateAssessmentPlan } from '@/features/grades/hooks/useUpdateAssessmentPlan'
import { useDeleteAssessmentPlan } from '@/features/grades/hooks/useDeleteAssessmentPlan'
import { useCreateAcademicTerm } from '@/features/grades/hooks/useCreateAcademicTerm'
import { useAcademicYears } from '@/features/grades/hooks/useAcademicYears'
import { useStartAcademicYear } from '@/features/grades/hooks/useStartAcademicYear'
import { useEndAcademicYear } from '@/features/grades/hooks/useEndAcademicYear'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import type { TermAssessmentPlan } from '@/types/sims/grades'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanModalState {
  open: boolean
  editing: TermAssessmentPlan | null
}

// ─── Create Term Modal ────────────────────────────────────────────────────────

function CreateTermModal({ onClose }: { onClose: () => void }) {
  const { data: years = [] } = useAcademicYears()
  const activeYears = years.filter((y) => y.status === 'active')
  const [name, setName] = useState('')
  const [termNumber, setTermNumber] = useState(1)
  const [academicYear, setAcademicYear] = useState(activeYears[0]?.year ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  const createMutation = useCreateAcademicTerm()

  // Sync once active years finish loading (empty on first render).
  useEffect(() => {
    if (!academicYear && activeYears.length > 0) {
      setAcademicYear(activeYears[0].year)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYears])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name || !academicYear || !startDate || !endDate) { setError('All fields are required.'); return }
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
                  <select
                    className="form-select"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    required
                  >
                    {activeYears.length === 0 && <option value="">— No active years —</option>}
                    {activeYears.map((y) => (
                      <option key={y.id} value={y.year}>{y.year}</option>
                    ))}
                  </select>
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
                style={{ background: 'var(--edulab-accent)' }}
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

// ─── Start New Year Modal ─────────────────────────────────────────────────────

function StartYearModal({ onClose }: { onClose: () => void }) {
  const nextYear = (new Date().getFullYear() + 1).toString()
  const [year, setYear] = useState(nextYear)
  const [termName, setTermName] = useState('Term 1')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  const startMutation = useStartAcademicYear()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const minYear = new Date().getFullYear() - 1
    const maxYear = new Date().getFullYear() + 5
    if (!/^\d{4}$/.test(year) || Number(year) < minYear || Number(year) > maxYear) {
      setError(`Year must be a 4-digit number between ${minYear} and ${maxYear}.`)
      return
    }
    if (!termName || !startDate || !endDate) { setError('All fields are required.'); return }
    if (endDate <= startDate) { setError('End date must be after start date.'); return }
    try {
      await startMutation.mutateAsync({ year, termName, startDate, endDate })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to start the new year. Please try again.')
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
            <h5 className="modal-title fw-bold">Start New Academic Year</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body px-4 py-3">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <p className="text-muted small mb-3">
                This clones every class section from the most recent year (same grade &amp; section names) into the new year, and creates its first term.
              </p>

              <div className="mb-3">
                <label className="form-label fw-semibold small">Academic Year</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="2027"
                  maxLength={4}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">First Term Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Term 1"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  required
                />
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Term Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Term End Date</label>
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
                style={{ background: 'var(--edulab-accent)' }}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? 'Starting…' : 'Start Year'}
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
                style={{ background: 'var(--edulab-accent)' }}
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
  const [showStartYear, setShowStartYear] = useState(false)
  const [endingYearId, setEndingYearId] = useState<number | null>(null)

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: years = [], isLoading: yearsLoading } = useAcademicYears()
  const { data: plans = [], isLoading: plansLoading } = useAssessmentPlans(selectedTermId)
  const deleteMutation = useDeleteAssessmentPlan()
  const endYearMutation = useEndAcademicYear()

  async function handleDelete(id: number) {
    if (!confirm('Delete this assessment plan? This cannot be undone if assessments already exist.')) return
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleEndYear(id: number, year: string) {
    if (!confirm(`End academic year ${year}? This just marks it ended — it won't be offered for new terms or class sections going forward, but nothing existing is affected.`)) return
    setEndingYearId(id)
    try {
      await endYearMutation.mutateAsync(id)
    } finally {
      setEndingYearId(null)
    }
  }

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={ClipboardCheck}
        title="Assessment Plans & Terms"
        subtitle="Create academic terms, then define required assessment counts per subject"
      />

      {/* Actions */}
      <div className="d-flex justify-content-end gap-2 mb-4">
        <button
          className="btn btn-outline-secondary d-flex align-items-center gap-2"
          onClick={() => setShowCreateTerm(true)}
        >
          <CalendarDays size={16} /> New Term
        </button>
        <button
          className="btn text-white fw-semibold d-flex align-items-center gap-2"
          style={{ background: 'var(--edulab-accent)' }}
          onClick={() => setModal({ open: true, editing: null })}
          disabled={terms.length === 0}
        >
          <Plus size={16} /> Set Plan
        </button>
      </div>

      {/* Academic Years */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body py-3 px-4">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <span className="fw-semibold small">Academic Years</span>
            <button
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
              onClick={() => setShowStartYear(true)}
            >
              <CalendarDays size={14} /> Start New Year
            </button>
          </div>

          {yearsLoading ? (
            <div className="placeholder-glow"><span className="placeholder col-12 rounded" style={{ height: 32 }} /></div>
          ) : years.length === 0 ? (
            <p className="text-muted small mb-0">No academic years yet — click "Start New Year" to create the first one.</p>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {years.map((y) => (
                <div
                  key={y.id}
                  className="d-flex align-items-center gap-2 border rounded-pill px-3 py-1"
                >
                  <span className="fw-semibold small">{y.year}</span>
                  {y.status === 'active' ? (
                    <span className="badge d-inline-flex align-items-center gap-1 bg-success bg-opacity-15 text-success">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span className="badge d-inline-flex align-items-center gap-1 bg-secondary bg-opacity-15 text-secondary">
                      <Lock size={12} /> Ended
                    </span>
                  )}
                  {y.status === 'active' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0 px-2"
                      style={{ fontSize: '0.72rem' }}
                      disabled={endingYearId === y.id}
                      onClick={() => handleEndYear(y.id, y.year)}
                    >
                      {endingYearId === y.id ? 'Ending…' : 'End Year'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
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
                          style={{ background: 'var(--edulab-accent)', color: 'white', fontSize: '0.85rem' }}
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

      {showStartYear && (
        <StartYearModal onClose={() => setShowStartYear(false)} />
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
