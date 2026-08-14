'use client'
import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, MessageSquareWarning, Save, Send } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useMyAssessments } from '@/features/grades/hooks/useMyAssessments'
import { useMarksForAssessment } from '@/features/grades/hooks/useMarksForAssessment'
import { useBulkUpsertMarks } from '@/features/grades/hooks/useBulkUpsertMarks'
import { useMaterialsCheckStatus } from '@/features/grades/hooks/useMaterialsCheckStatus'
import { useRequestAssessmentChange } from '@/features/grades/hooks/useRequestAssessmentChange'
import { MaterialsCheckPanel } from '@/features/grades/components/MaterialsCheckPanel'
import { RequestCorrectionModal } from '@/features/grades/components/RequestCorrectionModal'
import { useMyMarkCorrections } from '@/features/grades/hooks/useMyMarkCorrections'
import { useNotificationContext } from '@/context/useNotificationContext'
import { usePermission } from '@/hooks/usePermission'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { ASSESSMENT_TYPE_LABELS } from '@/types/sims/grades'
import type { MarkRosterRow } from '@/types/sims/grades'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

// ─── Request a change panel — shown when someone else (a Section Head) scheduled this
// assessment on the teacher's behalf ────────────────────────────────────────────────

function RequestChangePanel({ assessmentId, title }: { assessmentId: string; title: string }) {
  const { showNotification } = useNotificationContext()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const requestChange = useRequestAssessmentChange(assessmentId)

  const handleSend = () => {
    if (!message.trim()) return
    requestChange.mutate(message.trim(), {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Your Section Head has been notified.' })
        setMessage('')
        setOpen(false)
      },
      onError: () => showNotification({ variant: 'danger', message: 'Could not send the request. Please try again.' }),
    })
  }

  return (
    <div className="rounded-3 p-3 mb-4" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <span className="small d-flex align-items-center gap-2" style={{ color: '#9a3412' }}>
          <MessageSquareWarning size={16} className="flex-shrink-0" />
          <strong>{title}</strong> was scheduled by your Section Head.
        </span>
        {!open && (
          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => setOpen(true)}>
            Request a change
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 d-flex gap-2 align-items-start flex-wrap">
          <textarea
            className="form-control form-control-sm"
            style={{ minWidth: 260, flex: 1 }}
            rows={2}
            placeholder="e.g. Can we lower the weight on Algebra and add a Statistics topic?"
            value={message}
            maxLength={500}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="d-flex flex-column gap-1">
            <button
              type="button"
              className="btn btn-sm btn-warning"
              disabled={!message.trim() || requestChange.isPending}
              onClick={handleSend}
            >
              {requestChange.isPending ? 'Sending…' : 'Send'}
            </button>
            <button type="button" className="btn btn-sm btn-light" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

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

// ─── Correction action cell — shown only for locked (submitted) rows ──────────

function CorrectionActionCell({
  row,
  canRequestCorrection,
  hasPendingCorrection,
  onRequestCorrection,
}: {
  row: MarkRosterRow
  canRequestCorrection: boolean
  hasPendingCorrection: boolean
  onRequestCorrection: (row: MarkRosterRow) => void
}) {
  if (row.status !== 'submitted' || !row.markId || !canRequestCorrection) {
    return <td />
  }
  if (hasPendingCorrection) {
    return (
      <td>
        <span
          className="badge rounded-pill px-2 py-1 fw-bold"
          style={{ background: '#fef9c3', color: '#92400e', fontSize: '0.68rem' }}
        >
          Correction pending
        </span>
      </td>
    )
  }
  return (
    <td>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        style={{ fontSize: '0.72rem' }}
        onClick={() => onRequestCorrection(row)}
      >
        Request Correction
      </button>
    </td>
  )
}

// ─── Roster row — legacy (no topic allocations on this assessment) ────────────

function MarkRosterRowItem({
  index,
  row,
  value,
  onChange,
  canRequestCorrection,
  hasPendingCorrection,
  onRequestCorrection,
}: {
  index: number
  row: MarkRosterRow
  value: string
  onChange: (studentId: string, v: string) => void
  canRequestCorrection: boolean
  hasPendingCorrection: boolean
  onRequestCorrection: (row: MarkRosterRow) => void
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
      <CorrectionActionCell
        row={row}
        canRequestCorrection={canRequestCorrection}
        hasPendingCorrection={hasPendingCorrection}
        onRequestCorrection={onRequestCorrection}
      />
    </tr>
  )
}

// ─── Roster row — topic-tracked (one input column per topic + a computed total) ──

function TopicMarkRosterRowItem({
  index,
  row,
  values,
  onChange,
  canRequestCorrection,
  hasPendingCorrection,
  onRequestCorrection,
}: {
  index: number
  row: MarkRosterRow
  values: Record<string, string>
  onChange: (studentId: string, subjectTopicId: string, v: string) => void
  canRequestCorrection: boolean
  hasPendingCorrection: boolean
  onRequestCorrection: (row: MarkRosterRow) => void
}) {
  const locked = row.status === 'submitted'

  let total = 0
  let hasAny = false
  const cellInvalid: Record<string, boolean> = {}
  row.topicScores.forEach((topic) => {
    const raw = values[topic.subjectTopicId] ?? ''
    if (raw.trim() === '') return
    const n = Number(raw)
    if (Number.isNaN(n)) return
    hasAny = true
    total += n
    cellInvalid[topic.subjectTopicId] = n > topic.maxMarks
  })

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
      {row.topicScores.map((topic) => {
        const value = values[topic.subjectTopicId] ?? ''
        const isInvalid = cellInvalid[topic.subjectTopicId] === true
        return (
          <td key={topic.subjectTopicId}>
            <div className="d-flex align-items-center gap-1">
              <input
                type="number"
                className={`form-control form-control-sm ${isInvalid ? 'is-invalid' : ''}`}
                style={{ maxWidth: 76 }}
                min={0}
                max={topic.maxMarks}
                step="0.5"
                value={value}
                disabled={locked}
                onChange={(e) => onChange(row.studentId, topic.subjectTopicId, e.target.value)}
              />
              <span className="text-muted small">/ {topic.maxMarks}</span>
            </div>
          </td>
        )
      })}
      <td>
        <span className="fw-bold" style={{ color: hasAny ? '#3730a3' : '#94a3b8' }}>
          {hasAny ? total : '—'}
        </span>
      </td>
      <td>
        <StatusBadge status={row.status} />
      </td>
      <CorrectionActionCell
        row={row}
        canRequestCorrection={canRequestCorrection}
        hasPendingCorrection={hasPendingCorrection}
        onRequestCorrection={onRequestCorrection}
      />
    </tr>
  )
}

// ─── Main page inner component ────────────────────────────────────────────────

function MarksEntryContent() {
  const { showNotification } = useNotificationContext()

  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [localScores, setLocalScores] = useState<Record<string, string>>({})
  // studentId -> subjectTopicId -> raw input value — only used for a topic-tracked assessment.
  const [topicLocalScores, setTopicLocalScores] = useState<Record<string, Record<string, string>>>({})
  const [correctionRow, setCorrectionRow] = useState<MarkRosterRow | null>(null)

  const canRequestCorrection = usePermission('grades:correction-workflow')
  const { data: myStaff } = useMyStaff()
  const { data: myCorrections = [] } = useMyMarkCorrections()
  const pendingCorrectionMarkIds = new Set(
    myCorrections.filter((c) => c.status === 'pending').map((c) => c.markId),
  )

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
  const isTopicTracked = (assessment?.topicAllocations?.length ?? 0) > 0
  const { data: materialsStatus } = useMaterialsCheckStatus(
    assessment?.requiresMaterialsCheck ? selectedAssessmentId : null,
  )
  const materialsBlocked = !!assessment?.requiresMaterialsCheck && !materialsStatus?.allConfirmed

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
    const topicMap: Record<string, Record<string, string>> = {}
    roster.forEach((r) => {
      map[r.studentId] = r.score !== null ? String(r.score) : ''
      const rowTopicMap: Record<string, string> = {}
      r.topicScores.forEach((t) => {
        rowTopicMap[t.subjectTopicId] = t.score !== null ? String(t.score) : ''
      })
      topicMap[r.studentId] = rowTopicMap
    })
    setLocalScores(map)
    setTopicLocalScores(topicMap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt])

  const handleScoreChange = (studentId: string, value: string) => {
    setLocalScores((prev) => ({ ...prev, [studentId]: value }))
  }

  const handleTopicScoreChange = (studentId: string, subjectTopicId: string, value: string) => {
    setTopicLocalScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectTopicId]: value },
    }))
  }

  const enteredCount = isTopicTracked
    ? roster.filter((r) =>
        Object.values(topicLocalScores[r.studentId] ?? {}).some((v) => v.trim() !== ''),
      ).length
    : Object.values(localScores).filter((v) => v.trim() !== '').length
  const totalCount = roster.length
  const allSubmitted = roster.length > 0 && roster.every((r) => r.status === 'submitted')

  const buildEntries = () => {
    if (isTopicTracked) {
      return roster
        .filter((r) => r.status !== 'submitted')
        .map((r) => {
          const topicScores = Object.entries(topicLocalScores[r.studentId] ?? {})
            .filter(([, v]) => v.trim() !== '')
            .map(([subjectTopicId, v]) => ({ subjectTopicId, score: Number(v) }))
          return { studentId: r.studentId, topicScores }
        })
        .filter((e) => e.topicScores.length > 0)
    }
    return roster
      .filter((r) => r.status !== 'submitted' && localScores[r.studentId]?.trim() !== '')
      .map((r) => ({
        studentId: r.studentId,
        score: Number(localScores[r.studentId]),
      }))
  }

  const hasInvalidScore = () => {
    if (isTopicTracked) {
      return roster.some((r) => {
        if (r.status === 'submitted') return false
        return r.topicScores.some((topic) => {
          const v = topicLocalScores[r.studentId]?.[topic.subjectTopicId]
          if (!v || v.trim() === '') return false
          const n = Number(v)
          return !Number.isNaN(n) && n > topic.maxMarks
        })
      })
    }
    return roster.some((r) => {
      if (r.status === 'submitted') return false
      const v = localScores[r.studentId]
      if (!v || v.trim() === '') return false
      const n = Number(v)
      return !Number.isNaN(n) && n > r.maxScore
    })
  }

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

    if (status === 'submitted' && materialsBlocked) {
      showNotification({
        variant: 'warning',
        message: 'Complete the materials check for every student before submitting marks.',
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
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={FileText}
        title="Marks Entry"
        subtitle={
          assessment
            ? `${assessment.subject.name} · ${ASSESSMENT_TYPE_LABELS[assessment.assessmentType]} · ${assessment.totalMarks} marks`
            : 'Select a term and assessment'
        }
      />

      {/* Controls */}
      <div className="mb-4 d-flex align-items-center gap-2 flex-wrap">
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

      {/* ── Scheduled-by-Section-Head notice ─────────────────────────── */}
      {assessment && selectedAssessmentId && myStaff && assessment.createdByTeacherId !== myStaff.id && (
        <RequestChangePanel assessmentId={selectedAssessmentId} title={assessment.title} />
      )}

      {/* ── Instructions ───────────────────────────────────────────── */}
      {assessment?.instructions && (
        <div
          className="rounded-3 p-3 mb-4 d-flex align-items-start gap-2"
          style={{ background: '#eef2ff', color: '#3730a3', fontSize: '0.85rem' }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-1" />
          <span>{assessment.instructions}</span>
        </div>
      )}

      {/* ── Materials-readiness gate ──────────────────────────────── */}
      {assessment?.requiresMaterialsCheck && selectedAssessmentId && (
        <MaterialsCheckPanel assessmentId={selectedAssessmentId} />
      )}

      {/* ── Locked banner ──────────────────────────────────────────── */}
      {allSubmitted && (
        <div
          className="d-flex align-items-center gap-3 rounded-3 px-4 py-3 mb-4"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span className="small fw-semibold" style={{ color: '#15803d' }}>
            {canRequestCorrection
              ? 'Marks for this assessment have been submitted. Use "Request Correction" on a row to ask a Principal to change a score.'
              : 'Marks for this assessment have been submitted. Contact a Section Head to make corrections.'}
          </span>
        </div>
      )}

      {/* ── Roster card ────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
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
                    {isTopicTracked ? (
                      <>
                        {(roster[0]?.topicScores ?? []).map((topic) => (
                          <th key={topic.subjectTopicId} className="fw-semibold text-muted small">
                            {topic.title}
                          </th>
                        ))}
                        <th className="fw-semibold text-muted small">Total</th>
                      </>
                    ) : (
                      <th className="fw-semibold text-muted small">Score</th>
                    )}
                    <th className="fw-semibold text-muted small">Status</th>
                    <th className="fw-semibold text-muted small">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isTopicTracked
                    ? roster.map((row, idx) => (
                        <TopicMarkRosterRowItem
                          key={row.studentId}
                          index={idx}
                          row={row}
                          values={topicLocalScores[row.studentId] ?? {}}
                          onChange={handleTopicScoreChange}
                          canRequestCorrection={canRequestCorrection}
                          hasPendingCorrection={!!row.markId && pendingCorrectionMarkIds.has(row.markId)}
                          onRequestCorrection={setCorrectionRow}
                        />
                      ))
                    : roster.map((row, idx) => (
                        <MarkRosterRowItem
                          key={row.studentId}
                          index={idx}
                          row={row}
                          value={localScores[row.studentId] ?? ''}
                          onChange={handleScoreChange}
                          canRequestCorrection={canRequestCorrection}
                          hasPendingCorrection={!!row.markId && pendingCorrectionMarkIds.has(row.markId)}
                          onRequestCorrection={setCorrectionRow}
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
                    background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)',
                    border: 'none',
                  }}
                  onClick={() => handleSave('submitted')}
                  disabled={bulkUpsert.isPending || materialsBlocked}
                  title={materialsBlocked ? 'Complete the materials check for every student first' : undefined}
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

      {correctionRow && (
        <RequestCorrectionModal row={correctionRow} onClose={() => setCorrectionRow(null)} />
      )}
    </div>
  )
}

// ─── Export with role guard ────────────────────────────────────────────────────

export default function TeacherMarks() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <MarksEntryContent />
    </RoleGuard>
  )
}
