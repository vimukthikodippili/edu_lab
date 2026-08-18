'use client'
import { useState } from 'react'
import { GraduationCap, ArrowRight, AlertTriangle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useGrades } from '@/features/students/hooks/useGrades'
import { useClassSections } from '@/features/students/hooks/useClassSections'
import { usePromotionPreview } from '@/features/students/hooks/usePromotionPreview'
import { useCommitPromotion } from '@/features/students/hooks/useCommitPromotion'
import type { CommitOutcome, PromotionPreviewRow, PromotionRecommendationOutcome } from '@/features/students/types-promotion'

const CURRENT_YEAR = String(new Date().getFullYear())

const RECOMMENDATION_BADGE: Record<PromotionRecommendationOutcome, string> = {
  promote: 'bg-success-subtle text-success border-success-subtle',
  repeat: 'bg-warning-subtle text-warning border-warning-subtle',
  graduate: 'bg-primary-subtle text-primary border-primary-subtle',
}
const RECOMMENDATION_LABEL: Record<PromotionRecommendationOutcome, string> = {
  promote: 'Promote',
  repeat: 'Repeat',
  graduate: 'Graduate',
}

type ApiError = { response?: { data?: { message?: string } } }
function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiError)?.response?.data?.message ?? fallback
}

interface EditableRow extends PromotionPreviewRow {
  commitOutcome: CommitOutcome
  selectedGradeId: number | null
  selectedClassSectionId: number | null
  // True when the backend's preview couldn't auto-pick a target section (e.g. the target
  // grade has more than one section) — kept even after the row is otherwise mapped to a real
  // commit outcome, so the UI can flag "this one needs your input" instead of silently sitting
  // in the commit-blocked state with no explanation.
  neededManualSection: boolean
}

function toEditableRow(row: PromotionPreviewRow): EditableRow {
  if (row.outcome === 'graduated') {
    return { ...row, commitOutcome: 'graduated', selectedGradeId: null, selectedClassSectionId: null, neededManualSection: false }
  }
  return {
    ...row,
    commitOutcome: 'promoted',
    selectedGradeId: row.targetGradeId,
    selectedClassSectionId: row.targetClassSectionId,
    neededManualSection: row.outcome === 'needs_manual_section',
  }
}

function RowSectionPicker({
  row,
  targetYear,
  needsAttention,
  onChange,
}: {
  row: EditableRow
  targetYear: string
  needsAttention?: boolean
  onChange: (gradeId: number | null, classSectionId: number | null) => void
}) {
  const { data: grades = [] } = useGrades()
  const { data: sections = [] } = useClassSections(row.selectedGradeId, targetYear)
  const fieldClass = `form-select form-select-sm${needsAttention ? ' border-warning' : ''}`

  return (
    <div className="d-flex gap-1">
      <select
        className={fieldClass}
        style={{ width: 110 }}
        value={row.selectedGradeId ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null, null)}
      >
        <option value="">Grade…</option>
        {grades.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <select
        className={fieldClass}
        style={{ width: 90 }}
        value={row.selectedClassSectionId ?? ''}
        onChange={(e) => onChange(row.selectedGradeId, e.target.value ? Number(e.target.value) : null)}
        disabled={!row.selectedGradeId}
      >
        <option value="">Section…</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}

function PromotionContent() {
  const { showNotification } = useNotificationContext()
  const [sourceYear, setSourceYear] = useState(CURRENT_YEAR)
  const [targetYear, setTargetYear] = useState(String(Number(CURRENT_YEAR) + 1))
  const [rows, setRows] = useState<EditableRow[] | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const preview = usePromotionPreview()
  const commit = useCommitPromotion()

  const handlePreview = () => {
    preview.mutate(
      { sourceAcademicYear: sourceYear, targetAcademicYear: targetYear },
      {
        onSuccess: (data) => setRows(data.map(toEditableRow)),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not load preview.') }),
      },
    )
  }

  const updateRow = (studentId: string, patch: Partial<EditableRow>) => {
    setRows((prev) => prev?.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)) ?? null)
  }

  const pendingSectionRows = rows?.filter(
    (r) => (r.commitOutcome === 'promoted' || r.commitOutcome === 'repeated') && !r.selectedClassSectionId,
  ) ?? []
  const readyToCommit = rows !== null && pendingSectionRows.length === 0

  const handleCommit = () => {
    if (!rows) return
    const entries = rows.map((r) => ({
      studentId: r.studentId,
      targetAcademicYear: targetYear,
      outcome: r.commitOutcome,
      ...(r.commitOutcome === 'promoted' || r.commitOutcome === 'repeated'
        ? { targetGradeId: r.selectedGradeId ?? undefined, targetClassSectionId: r.selectedClassSectionId ?? undefined }
        : {}),
    }))

    commit.mutate(entries, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: `${entries.length} student(s) processed.` })
        setRows(null)
        setShowConfirm(false)
      },
      onError: (err) => {
        showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Promotion failed. No changes were saved.') })
        setShowConfirm(false)
      },
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <GraduationCap size={24} className="text-primary" />
        <div>
          <h4 className="mb-0">Annual Promotion</h4>
          <p className="text-muted small mb-0">
            Promote every active student to the next grade at year end. Review and adjust before committing.
          </p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body d-flex align-items-end gap-3 flex-wrap">
          <div>
            <label className="form-label small fw-semibold mb-1">From Academic Year</label>
            <input type="text" className="form-control form-control-sm" style={{ width: 100 }} value={sourceYear} onChange={(e) => setSourceYear(e.target.value)} />
          </div>
          <ArrowRight size={16} className="text-muted mb-2" />
          <div>
            <label className="form-label small fw-semibold mb-1">To Academic Year</label>
            <input type="text" className="form-control form-control-sm" style={{ width: 100 }} value={targetYear} onChange={(e) => setTargetYear(e.target.value)} />
          </div>
          <button type="button" className="btn btn-sm btn-primary d-flex align-items-center gap-2" onClick={handlePreview} disabled={preview.isPending}>
            {preview.isPending && <span className="spinner-border spinner-border-sm" />}
            Preview
          </button>
        </div>
      </div>

      {rows && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span className="fw-semibold">{rows.length} student(s)</span>
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={!readyToCommit || commit.isPending}
              onClick={() => setShowConfirm(true)}
            >
              Commit Promotion
            </button>
          </div>
          {pendingSectionRows.length > 0 && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-0 rounded-0 border-0 border-top py-2 px-3 small">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>
                <strong>{pendingSectionRows.length} student{pendingSectionRows.length !== 1 ? 's' : ''}</strong> still need a target class section picked
                (highlighted below) before you can commit — their target grade has more than one section, so it can&apos;t be chosen automatically.
              </span>
            </div>
          )}
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr className="table-light">
                  <th className="small text-muted">Student</th>
                  <th className="small text-muted">Current</th>
                  <th className="small text-muted">Teacher recommended</th>
                  <th className="small text-muted">Outcome</th>
                  <th className="small text-muted">Target</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const needsSection =
                    (row.commitOutcome === 'promoted' || row.commitOutcome === 'repeated') && !row.selectedClassSectionId
                  return (
                    <tr key={row.studentId} style={needsSection ? { background: '#fff7ed' } : undefined}>
                      <td>
                        <div className="fw-semibold small">{row.firstName} {row.lastName}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{row.admissionNumber}</div>
                      </td>
                      <td className="small">{row.currentGradeName} · {row.currentClassSectionName}</td>
                      <td>
                        {row.teacherRecommendation ? (
                          <div>
                            <span
                              className={`badge border ${RECOMMENDATION_BADGE[row.teacherRecommendation.outcome]}`}
                              style={{ fontSize: 11 }}
                              title={row.teacherRecommendation.comment ?? undefined}
                            >
                              {RECOMMENDATION_LABEL[row.teacherRecommendation.outcome]}
                            </span>
                            <div className="text-muted" style={{ fontSize: 10.5 }}>
                              by {row.teacherRecommendation.recommendedByName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 130 }}
                          value={row.commitOutcome}
                          onChange={(e) => updateRow(row.studentId, { commitOutcome: e.target.value as CommitOutcome })}
                        >
                          <option value="promoted">Promoted</option>
                          <option value="repeated">Repeated (same grade)</option>
                          <option value="transferred">Transferred out</option>
                          <option value="graduated">Graduated</option>
                        </select>
                        {row.neededManualSection && needsSection && (
                          <div className="text-warning d-flex align-items-center gap-1 mt-1" style={{ fontSize: 10.5 }}>
                            <AlertTriangle size={10} /> Multiple sections in target grade
                          </div>
                        )}
                      </td>
                      <td>
                        {(row.commitOutcome === 'promoted' || row.commitOutcome === 'repeated') ? (
                          <RowSectionPicker
                            row={row}
                            targetYear={targetYear}
                            needsAttention={needsSection}
                            onChange={(gradeId, classSectionId) => updateRow(row.studentId, { selectedGradeId: gradeId, selectedClassSectionId: classSectionId })}
                          />
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showConfirm && (
        <div
          className="modal d-flex align-items-center justify-content-center"
          style={{ display: 'flex', background: 'rgba(0,0,0,0.45)', position: 'fixed', inset: 0, zIndex: 1055 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false) }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-body p-4">
                <h6 className="fw-bold mb-2">Confirm Promotion</h6>
                <p className="text-muted small mb-4">
                  This will update {rows?.length ?? 0} student record(s) and cannot be undone from this screen. Continue?
                </p>
                <div className="d-flex gap-2 justify-content-end">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                  <button type="button" className="btn btn-sm btn-success d-flex align-items-center gap-2" onClick={handleCommit} disabled={commit.isPending}>
                    {commit.isPending && <span className="spinner-border spinner-border-sm" />}
                    Confirm & Commit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PromoteStudentsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <PromotionContent />
    </RoleGuard>
  )
}
