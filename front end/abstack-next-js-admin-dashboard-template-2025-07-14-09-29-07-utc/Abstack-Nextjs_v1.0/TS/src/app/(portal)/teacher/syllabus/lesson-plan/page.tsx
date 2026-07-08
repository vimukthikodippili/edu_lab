'use client'
import React, { useState } from 'react'
import { CalendarDays, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useTimetableRecord } from '@/features/timetable/hooks/useTimetableRecord'
import { useSyllabusUnits } from '@/features/syllabus/hooks/useSyllabusUnits'
import { useLessonPlanEntries } from '@/features/lesson-plan/hooks/useLessonPlanEntries'
import { useLessonPlanStatus } from '@/features/lesson-plan/hooks/useLessonPlanStatus'
import { useUpsertLessonPlanEntry } from '@/features/lesson-plan/hooks/useUpsertLessonPlanEntry'
import { useMarkLessonComplete } from '@/features/lesson-plan/hooks/useMarkLessonComplete'
import { useSubmitLessonPlan } from '@/features/lesson-plan/hooks/useSubmitLessonPlan'
import type { LessonPlanEntry } from '@/features/lesson-plan/types'

const CURRENT_YEAR = String(new Date().getFullYear())
const GRADE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 1)

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const data = e?.response?.data
  if (data?.errors) return Object.values(data.errors).join('; ')
  return data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function LessonPlanPage() {
  const { showNotification } = useNotificationContext()

  // Filter state
  const [subjectId, setSubjectId] = useState('')
  const [gradeId, setGradeId] = useState<number | ''>('')
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [filter, setFilter] = useState<{
    subjectId: string
    gradeId: number
    academicYear: string
  } | null>(null)

  // Local date values: { [syllabusUnitId]: 'YYYY-MM-DD' }
  const [localDates, setLocalDates] = useState<Record<string, string>>({})
  // Saving state per unit: { [syllabusUnitId]: boolean }
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  // Saved flash per unit: { [syllabusUnitId]: boolean }
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({})
  // Mark-complete in-flight state per unit: { [syllabusUnitId]: boolean }
  const [completing, setCompleting] = useState<Record<string, boolean>>({})

  // Subjects dropdown
  const { data: subjectsData } = useSubjects({ limit: 100 })
  const subjects = subjectsData?.data ?? []

  // Data queries (only fire when filter is set)
  const {
    data: timetableRecord,
    isLoading: timetableLoading,
  } = useTimetableRecord(filter?.academicYear ?? null)

  const {
    data: syllabusUnits,
    isLoading: unitsLoading,
    isFetching: unitsFetching,
  } = useSyllabusUnits({
    subjectId: filter?.subjectId,
    gradeId: filter?.gradeId,
    academicYear: filter?.academicYear,
  })

  const {
    data: entries,
    isLoading: entriesLoading,
  } = useLessonPlanEntries({
    subjectId: filter?.subjectId,
    gradeId: filter?.gradeId,
    academicYear: filter?.academicYear,
  })

  const {
    data: status,
  } = useLessonPlanStatus({
    subjectId: filter?.subjectId,
    gradeId: filter?.gradeId,
    academicYear: filter?.academicYear,
  })

  // Build entry map: { [syllabusUnitId]: LessonPlanEntry }
  const entryMap = React.useMemo(() => {
    const map: Record<string, LessonPlanEntry> = {}
    entries?.forEach((e) => { map[e.syllabusUnitId] = e })
    return map
  }, [entries])

  // Planned dates only, keyed by unit — used to seed the date inputs
  const plannedDateMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    entries?.forEach((e) => { map[e.syllabusUnitId] = e.plannedCompletionDate })
    return map
  }, [entries])

  // Sync plannedDateMap → localDates when server data arrives
  React.useEffect(() => {
    setLocalDates((prev) => ({ ...plannedDateMap, ...prev }))
  }, [plannedDateMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset localDates when filter changes
  React.useEffect(() => {
    setLocalDates({})
    setSaving({})
    setSavedFlash({})
    setCompleting({})
  }, [filter])

  // Mutations
  const upsertMutation = useUpsertLessonPlanEntry()
  const markCompleteMutation = useMarkLessonComplete()
  const submitMutation = useSubmitLessonPlan()

  const handleLoad = () => {
    if (!subjectId || !gradeId || !academicYear.match(/^\d{4}$/)) {
      showNotification({ variant: 'warning', message: 'Please select a subject, grade, and valid year.' })
      return
    }
    setFilter({ subjectId, gradeId: Number(gradeId), academicYear })
  }

  const handleDateBlur = (syllabusUnitId: string, date: string) => {
    if (!filter || !date) return
    setSaving((prev) => ({ ...prev, [syllabusUnitId]: true }))
    upsertMutation.mutate(
      { syllabusUnitId, plannedCompletionDate: date, academicYear: filter.academicYear },
      {
        onSuccess: () => {
          setSaving((prev) => ({ ...prev, [syllabusUnitId]: false }))
          setSavedFlash((prev) => ({ ...prev, [syllabusUnitId]: true }))
          setTimeout(() => setSavedFlash((prev) => ({ ...prev, [syllabusUnitId]: false })), 2000)
        },
        onError: (err) => {
          setSaving((prev) => ({ ...prev, [syllabusUnitId]: false }))
          showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        },
      },
    )
  }

  const handleMarkComplete = (syllabusUnitId: string) => {
    if (!filter) return
    setCompleting((prev) => ({ ...prev, [syllabusUnitId]: true }))
    markCompleteMutation.mutate(
      { syllabusUnitId, academicYear: filter.academicYear },
      {
        onSuccess: () => {
          setCompleting((prev) => ({ ...prev, [syllabusUnitId]: false }))
          showNotification({ variant: 'success', message: 'Lesson marked as complete.' })
        },
        onError: (err) => {
          setCompleting((prev) => ({ ...prev, [syllabusUnitId]: false }))
          showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        },
      },
    )
  }

  const handleSubmit = () => {
    if (!filter) return
    const subjectName = subjects.find((s) => s.id === filter.subjectId)?.name ?? 'this subject'
    const confirmed = window.confirm(
      `Submit your annual lesson plan for ${subjectName} / Grade ${filter.gradeId} / ${filter.academicYear}?\n\nThis cannot be changed after submission.`,
    )
    if (!confirmed) return

    submitMutation.mutate(filter, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Annual lesson plan submitted successfully.' })
      },
      onError: (err) => {
        showNotification({ variant: 'danger', message: extractErrorMessage(err) })
      },
    })
  }

  const isLoading = unitsLoading || entriesLoading || timetableLoading
  const units = syllabusUnits ?? []
  const isFinalized = !!timetableRecord?.finalizedAt
  const isSubmitted = status?.isSubmitted ?? false
  const totalUnits = status?.totalUnits ?? units.length
  const completedEntries = status?.completedEntries ?? 0
  const canSubmit = isFinalized && completedEntries >= totalUnits && totalUnits > 0
  const progressPct = totalUnits > 0 ? Math.round((completedEntries / totalUnits) * 100) : 0
  const behindScheduleCount = entries?.filter((e) => e.behindSchedule).length ?? 0

  const selectedSubjectName = subjects.find((s) => s.id === (filter?.subjectId ?? subjectId))?.name ?? ''

  return (
    <div className="container-fluid py-4">

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <CalendarDays size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Annual Lesson Plan</h4>
          <p className="text-muted small mb-0">Vishaya Nirdeshaya — schedule your teaching year</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-4">
              <label className="form-label fw-semibold small mb-1">Subject</label>
              <select
                className="form-select form-select-sm"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-sm-3">
              <label className="form-label fw-semibold small mb-1">Grade</label>
              <select
                className="form-select form-select-sm"
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Select grade…</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-sm-2">
              <label className="form-label fw-semibold small mb-1">Year</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={academicYear}
                maxLength={4}
                pattern="\d{4}"
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026"
              />
            </div>

            <div className="col-12 col-sm-3">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                disabled={!subjectId || !gradeId || academicYear.length !== 4}
                onClick={handleLoad}
              >
                {unitsFetching && filter && <span className="spinner-border spinner-border-sm" />}
                Load Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content area — only after Load */}
      {filter && (
        <>
          {/* Submitted banner */}
          {isSubmitted && status?.submittedAt && (
            <div className="alert alert-success d-flex align-items-center gap-2 mb-3 py-2">
              <CheckCircle size={16} className="flex-shrink-0" />
              <span className="small fw-semibold">
                Plan submitted on {new Date(status.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                The plan is now locked and cannot be changed.
              </span>
            </div>
          )}

          {/* Timetable finalization banner */}
          {!isLoading && !timetableLoading && (
            <div
              className={`alert d-flex align-items-start gap-2 mb-3 py-2 ${isFinalized ? 'alert-success' : 'alert-warning'}`}
            >
              {isFinalized
                ? <CheckCircle size={16} className="flex-shrink-0 mt-1" />
                : <AlertTriangle size={16} className="flex-shrink-0 mt-1" />}
              <div className="small">
                {isFinalized ? (
                  <>
                    <strong>Timetable finalized</strong> on{' '}
                    {new Date(timetableRecord!.finalizedAt!).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}.{' '}
                    You can submit your plan once all dates are filled.
                  </>
                ) : (
                  <>
                    <strong>Timetable for {filter.academicYear} is not yet finalized.</strong>{' '}
                    You can plan lesson dates now, but submission is blocked until the timetable is confirmed.
                  </>
                )}
              </div>
            </div>
          )}

          {/* Deadline chip */}
          {status?.deadlineDate && status.daysUntilDeadline !== null && (
            <div className="mb-3">
              <span
                className={`badge d-inline-flex align-items-center gap-1 px-3 py-2 ${
                  status.daysUntilDeadline <= 7
                    ? 'bg-danger bg-opacity-15 text-danger'
                    : 'bg-info bg-opacity-15 text-info'
                }`}
                style={{ fontSize: '0.8rem', borderRadius: '20px' }}
              >
                <Clock size={13} />
                Planning deadline:{' '}
                {new Date(status.deadlineDate).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
                {status.daysUntilDeadline > 0
                  ? ` — ${status.daysUntilDeadline} day${status.daysUntilDeadline !== 1 ? 's' : ''} remaining`
                  : ' — Deadline passed'}
              </span>
            </div>
          )}

          {/* Progress card */}
          {!isLoading && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body py-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-semibold small">Scheduling Progress</span>
                  <span className="small text-muted">
                    <strong className="text-body">{completedEntries}</strong> / {totalUnits} lessons scheduled
                  </span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className={`progress-bar ${progressPct === 100 ? 'bg-success' : 'bg-primary'}`}
                    style={{ width: `${progressPct}%`, transition: 'width 0.3s ease' }}
                  />
                </div>
                {completedEntries < totalUnits && totalUnits > 0 && (
                  <p className="text-muted small mt-2 mb-0">
                    {totalUnits - completedEntries} lesson{totalUnits - completedEntries !== 1 ? 's' : ''} still need a date
                  </p>
                )}
                {completedEntries === totalUnits && totalUnits > 0 && (
                  <p className="text-success small mt-2 mb-0 fw-semibold">
                    All lessons scheduled! {isFinalized ? 'You can now submit.' : 'Waiting for timetable finalization.'}
                  </p>
                )}
                {behindScheduleCount > 0 && (
                  <span
                    className="badge d-inline-flex align-items-center gap-1 mt-3 px-3 py-2 bg-warning bg-opacity-15 text-warning-emphasis"
                    style={{ fontSize: '0.8rem', borderRadius: '20px' }}
                  >
                    <AlertTriangle size={13} />
                    {behindScheduleCount} lesson{behindScheduleCount !== 1 ? 's' : ''} behind schedule
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Plan table card */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3 flex-wrap gap-2">
              <span className="fw-semibold">
                {isLoading ? 'Loading…' : `Lesson Plan`}
                {selectedSubjectName && (
                  <span className="text-muted ms-2 fw-normal small">
                    · {selectedSubjectName} / Grade {filter.gradeId} / {filter.academicYear}
                  </span>
                )}
              </span>

              {/* Submit button */}
              {!isSubmitted && (
                <div className="d-flex align-items-center gap-2">
                  {!isFinalized && (
                    <span className="text-muted small d-none d-sm-inline">
                      <AlertTriangle size={13} className="me-1 text-warning" />
                      Timetable not finalized
                    </span>
                  )}
                  {isFinalized && completedEntries < totalUnits && totalUnits > 0 && (
                    <span className="text-muted small d-none d-sm-inline">
                      Fill all lesson dates first
                    </span>
                  )}
                  <button
                    type="button"
                    className={`btn btn-sm d-flex align-items-center gap-2 ${canSubmit ? 'btn-success' : 'btn-outline-secondary'}`}
                    disabled={!canSubmit || submitMutation.isPending || isLoading}
                    onClick={handleSubmit}
                    title={
                      !isFinalized
                        ? 'Timetable not yet finalized'
                        : completedEntries < totalUnits
                        ? 'Fill all lesson dates first'
                        : 'Submit your lesson plan'
                    }
                  >
                    {submitMutation.isPending && <span className="spinner-border spinner-border-sm" />}
                    {submitMutation.isPending ? 'Submitting…' : 'Submit Plan'}
                  </button>
                </div>
              )}
            </div>

            {/* Loading skeletons */}
            {isLoading && (
              <div className="p-3 placeholder-glow">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 44 }} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && units.length === 0 && (
              <div className="py-5 text-center text-muted">
                <CalendarDays size={40} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">No syllabus units defined</p>
                <p className="small mb-0">
                  Add lessons in the Syllabus Units page first, then return here to schedule them.
                </p>
              </div>
            )}

            {/* Plan table */}
            {!isLoading && units.length > 0 && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 50 }}>#</th>
                      <th>Lesson Title</th>
                      <th style={{ width: 180 }}>Planned Date</th>
                      <th style={{ width: 160 }}>Actual Date</th>
                      <th style={{ width: 150 }} className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => {
                      const unitDate = localDates[unit.id] ?? ''
                      const isSaving = !!saving[unit.id]
                      const isFlashed = !!savedFlash[unit.id]
                      const isCompleting = !!completing[unit.id]
                      const entry = entryMap[unit.id]
                      const hasDate = !!entry || !!unitDate
                      const isComplete = !!entry?.isComplete
                      const isBehindSchedule = !!entry?.behindSchedule

                      return (
                        <tr key={unit.id}>
                          <td>
                            <span
                              className="badge bg-secondary bg-opacity-15 text-secondary fw-semibold"
                              style={{ minWidth: 28, fontSize: '0.72rem' }}
                            >
                              {unit.order}
                            </span>
                          </td>
                          <td>
                            <span className="fw-medium small">{unit.title}</span>
                            {unit.description && (
                              <p className="text-muted small mb-0" style={{ fontSize: '0.75rem' }}>
                                {unit.description}
                              </p>
                            )}
                          </td>
                          <td>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={unitDate}
                              disabled={isSubmitted}
                              onChange={(e) => {
                                setLocalDates((prev) => ({ ...prev, [unit.id]: e.target.value }))
                              }}
                              onBlur={(e) => {
                                if (e.target.value) handleDateBlur(unit.id, e.target.value)
                              }}
                            />
                          </td>
                          <td>
                            {isComplete ? (
                              <span className="small text-body">
                                {entry?.actualCompletionDate
                                  ? new Date(entry.actualCompletionDate).toLocaleDateString('en-GB', {
                                      day: 'numeric', month: 'short', year: 'numeric',
                                    })
                                  : '—'}
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '1.1rem' }}>—</span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="d-flex flex-column align-items-center gap-1">
                              {isSaving ? (
                                <span
                                  className="spinner-border spinner-border-sm text-primary"
                                  style={{ width: 14, height: 14 }}
                                />
                              ) : isComplete ? (
                                <span className="badge d-inline-flex align-items-center gap-1 bg-success bg-opacity-15 text-success">
                                  <CheckCircle size={13} />
                                  Completed
                                </span>
                              ) : isBehindSchedule ? (
                                <span className="badge d-inline-flex align-items-center gap-1 bg-warning bg-opacity-15 text-warning-emphasis">
                                  <AlertTriangle size={13} />
                                  Behind schedule
                                </span>
                              ) : hasDate ? (
                                <span className="badge d-inline-flex align-items-center gap-1 bg-secondary bg-opacity-15 text-secondary">
                                  {isFlashed && <CheckCircle size={13} />}
                                  Scheduled
                                </span>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '1.1rem' }}>—</span>
                              )}

                              {!isComplete && hasDate && (
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 py-0 px-2"
                                  style={{ fontSize: '0.72rem' }}
                                  disabled={isCompleting}
                                  onClick={() => handleMarkComplete(unit.id)}
                                >
                                  {isCompleting && <span className="spinner-border spinner-border-sm" />}
                                  {isCompleting ? 'Saving…' : 'Mark Complete'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer hint */}
            {!isLoading && units.length > 0 && (
              <div className="card-footer bg-white border-top text-muted small py-2 px-3">
                Dates are auto-saved when you leave each field.{' '}
                {!isSubmitted && 'Fill all lessons, then submit. '}
                Once a lesson is taught, click &ldquo;Mark Complete&rdquo; to record it.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Export with RoleGuard ────────────────────────────────────────────────────

export default function TeacherLessonPlan() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SYSTEM_ADMIN, ROLES.SECTION_HEAD]}>
      <LessonPlanPage />
    </RoleGuard>
  )
}
