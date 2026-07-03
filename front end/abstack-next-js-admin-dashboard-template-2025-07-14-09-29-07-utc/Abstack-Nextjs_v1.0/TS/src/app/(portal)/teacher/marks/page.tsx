'use client'
import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, Save, Send } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useMyAssessments } from '@/features/grades/hooks/useMyAssessments'
import { useMarksForAssessment } from '@/features/grades/hooks/useMarksForAssessment'
import { useBulkUpsertMarks } from '@/features/grades/hooks/useBulkUpsertMarks'
import { useNotificationContext } from '@/context/useNotificationContext'
import { ASSESSMENT_TYPE_LABELS } from '@/types/sims/grades'
import type { MarkRosterRow } from '@/types/sims/grades'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'draft' | 'submitted' | null }) {
  if (status === 'submitted') {
    return (
      <span
        className="badge rounded-pill px-2 py-1 fw-bold"
        style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem' }}
      >
        Submitted
      </span>
    )
  }
  if (status === 'draft') {
    return (
      <span
        className="badge rounded-pill px-2 py-1 fw-bold"
        style={{ background: '#fef9c3', color: '#92400e', fontSize: '0.7rem' }}
      >
        Draft
      </span>
    )
  }
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold"
      style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.7rem' }}
    >
      Not entered
    </span>
  )
}

// ─── Roster row ───────────────────────────────────────────────────────────────

function MarkRosterRowItem({
  index,
  row,
  value,
  onChange,
}: {
  index: number
  row: MarkRosterRow
  value: string
  onChange: (studentId: string, v: string) => void
}) {
  const locked = row.status === 'submitted'
  const numeric = value.trim() === '' ? null : Number(value)
  const isInvalid = numeric !== null && !Number.isNaN(numeric) && numeric > row.maxScore

  return (
    <tr style={{ verticalAlign: 'middle' }}>
      <td className="text-muted small ps-3">{index + 1}</td>
      <td>
        <div className="fw-semibold small">
          {row.lastName}, {row.firstName}
        </div>
        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
          {row.admissionNumber}
        </div>
      </td>
      <td>
        <div className="d-flex align-items-center gap-2">
          <input
            type="number"
            className={`form-control form-control-sm ${isInvalid ? 'is-invalid' : ''}`}
            style={{ maxWidth: 90 }}
            min={0}
            max={row.maxScore}
            step="0.5"
            value={value}
            disabled={locked}
            onChange={(e) => onChange(row.studentId, e.target.value)}
          />
          <span className="text-muted small">/ {row.maxScore}</span>
          {isInvalid && (
            <div className="invalid-feedback d-block m-0 small">
              Exceeds max of {row.maxScore}
            </div>
          )}
        </div>
      </td>
      <td>
        <StatusBadge status={row.status} />
      </td>
    </tr>
  )
}

// ─── Main page inner component ────────────────────────────────────────────────

function MarksEntryContent() {
  const { showNotification } = useNotificationContext()

  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [localScores, setLocalScores] = useState<Record<string, string>>({})

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: assessments = [], isLoading: assessmentsLoading } = useMyAssessments(selectedTermId)
  const {
    data: marksData,
    isLoading: rosterLoading,
    dataUpdatedAt,
  } = useMarksForAssessment(selectedAssessmentId)
  const bulkUpsert = useBulkUpsertMarks()

  const roster = marksData?.roster ?? []
  const assessment = marksData?.assessment

  // Auto-select first term
  useEffect(() => {
    if (terms.length > 0 && selectedTermId === null) {
      setSelectedTermId(terms[0].id)
    }
  }, [terms, selectedTermId])

  // Auto-select first assessment when term changes
  useEffect(() => {
    if (assessments.length > 0) {
      setSelectedAssessmentId(assessments[0].id)
    } else {
      setSelectedAssessmentId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTermId, assessments.length])

  // Sync local state when roster data actually changes
  useEffect(() => {
    const map: Record<string, string> = {}
    roster.forEach((r) => {
      map[r.studentId] = r.score !== null ? String(r.score) : ''
    })
    setLocalScores(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt])

  const handleScoreChange = (studentId: string, value: string) => {
    setLocalScores((prev) => ({ ...prev, [studentId]: value }))
  }

  const enteredCount = Object.values(localScores).filter((v) => v.trim() !== '').length
  const totalCount = roster.length
  const allSubmitted = roster.length > 0 && roster.every((r) => r.status === 'submitted')

  const buildEntries = () =>
    roster
      .filter((r) => r.status !== 'submitted' && localScores[r.studentId]?.trim() !== '')
      .map((r) => ({
        studentId: r.studentId,
        score: Number(localScores[r.studentId]),
      }))

  const hasInvalidScore = () =>
    roster.some((r) => {
      if (r.status === 'submitted') return false
      const v = localScores[r.studentId]
      if (!v || v.trim() === '') return false
      const n = Number(v)
      return !Number.isNaN(n) && n > r.maxScore
    })

  const handleSave = (status: 'draft' | 'submitted') => {
    if (hasInvalidScore()) {
      showNotification({
        variant: 'warning',
        message: 'Fix the highlighted scores before saving.',
      })
      return
    }

    const entries = buildEntries()
    if (entries.length === 0) {
      showNotification({
        variant: 'warning',
        message: 'Enter at least one score before saving.',
      })
      return
    }

    if (status === 'submitted' && !window.confirm('Submitting locks these marks. Continue?')) {
      return
    }

    bulkUpsert.mutate(
      { assessmentId: selectedAssessmentId!, status, entries },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message:
              status === 'submitted'
                ? `${entries.length} mark(s) submitted successfully.`
                : `${entries.length} mark(s) saved as draft.`,
          })
        },
        onError: (
          err: Error & { response?: { data?: { message?: string | { message?: string } } } },
        ) => {
          const data = err?.response?.data?.message
          const msg = typeof data === 'string' ? data : data?.message ?? err.message ?? 'Failed to save marks.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="d-flex align-items-start justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              flexShrink: 0,
            }}
          >
            <FileText size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Marks Entry</h4>
            <p className="text-muted small mb-0">
              {assessment
                ? `${assessment.subject.name} · ${ASSESSMENT_TYPE_LABELS[assessment.assessmentType]} · ${assessment.totalMarks} marks`
                : 'Select a term and assessment'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {termsLoading ? (
            <span className="placeholder col-4 rounded" style={{ height: 32, width: 160 }} />
          ) : (
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 180 }}
              value={selectedTermId ?? ''}
              onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : null)}
            >
              {terms.length === 0 && (
                <option disabled value="">
                  No terms configured
                </option>
              )}
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {assessmentsLoading ? (
            <span className="placeholder col-4 rounded" style={{ height: 32, width: 220 }} />
          ) : (
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 260 }}
              value={selectedAssessmentId ?? ''}
              onChange={(e) => setSelectedAssessmentId(e.target.value || null)}
            >
              {assessments.length === 0 && (
                <option disabled value="">
                  No assessments for this term
                </option>
              )}
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} · {ASSESSMENT_TYPE_LABELS[a.assessmentType]} · {a.scheduledDate} ({a.totalMarks} marks)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Locked banner ──────────────────────────────────────────── */}
      {allSubmitted && (
        <div
          className="d-flex align-items-center gap-3 rounded-3 px-4 py-3 mb-4"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span className="small fw-semibold" style={{ color: '#15803d' }}>
            Marks for this assessment have been submitted. Contact a Section Head to make corrections.
          </span>
        </div>
      )}

      {/* ── Roster card ────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <FileText size={16} />
            Marks Roster
          </span>
          <span
            className="badge rounded-pill text-white"
            style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}
          >
            {enteredCount} / {totalCount} entered
          </span>
        </div>

        <div className="card-body p-0">
          {!selectedAssessmentId ? (
            <div className="text-center text-muted py-5">
              <FileText size={36} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">Select a term and assessment to begin</p>
            </div>
          ) : rosterLoading ? (
            <div className="p-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="placeholder-glow mb-2">
                  <span className="placeholder col-12 rounded" style={{ height: 44 }} />
                </div>
              ))}
            </div>
          ) : roster.length === 0 ? (
            <div className="text-center text-muted py-5">
              <FileText size={36} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">No students found</p>
              <p className="small">No active students are enrolled in this assessment&apos;s class section.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 align-middle">
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th className="ps-3 fw-semibold text-muted small" style={{ width: 40 }}>
                      #
                    </th>
                    <th className="fw-semibold text-muted small">Student</th>
                    <th className="fw-semibold text-muted small">Score</th>
                    <th className="fw-semibold text-muted small">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row, idx) => (
                    <MarkRosterRowItem
                      key={row.studentId}
                      index={idx}
                      row={row}
                      value={localScores[row.studentId] ?? ''}
                      onChange={handleScoreChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer / Save */}
          {roster.length > 0 && !allSubmitted && (
            <div
              className="px-4 py-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{ background: '#f8fafc' }}
            >
              <span className="small text-muted">
                {enteredCount} of {totalCount} students entered
              </span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 fw-semibold px-3"
                  onClick={() => handleSave('draft')}
                  disabled={bulkUpsert.isPending}
                >
                  <Save size={14} />
                  {bulkUpsert.isPending ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm d-flex align-items-center gap-2 text-white fw-semibold px-4"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                  }}
                  onClick={() => handleSave('submitted')}
                  disabled={bulkUpsert.isPending}
                >
                  <Send size={14} />
                  {bulkUpsert.isPending ? 'Submitting…' : 'Submit Final'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!termsLoading && terms.length === 0 && (
        <div
          className="rounded-3 p-3 mt-4 d-flex align-items-center gap-2"
          style={{ background: '#fff7ed', color: '#c2410c', fontSize: '0.85rem' }}
        >
          <AlertCircle size={16} />
          No academic terms configured yet. Ask your Section Head to create a term.
        </div>
      )}
    </div>
  )
}

// ─── Export with role guard ────────────────────────────────────────────────────

export default function TeacherMarks() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <MarksEntryContent />
    </RoleGuard>
  )
}
