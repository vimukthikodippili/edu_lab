'use client'
import React, { useState } from 'react'
import { CalendarClock, CheckCircle, AlertTriangle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useMonthlyPlan } from '@/features/lesson-plan/hooks/useMonthlyPlan'
import { useMarkLessonComplete } from '@/features/lesson-plan/hooks/useMarkLessonComplete'
import type { MonthlyPlanEntry } from '@/features/lesson-plan/types'

const CURRENT_YEAR = String(new Date().getFullYear())
const CURRENT_MONTH = new Date().getMonth() + 1
const GRADE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 1)
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const data = e?.response?.data
  if (data?.errors) return Object.values(data.errors).join('; ')
  return data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function MonthlyPlanPage() {
  const { showNotification } = useNotificationContext()

  // Filter state
  const [subjectId, setSubjectId] = useState('')
  const [gradeId, setGradeId] = useState<number | ''>('')
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [filter, setFilter] = useState<{
    subjectId: string
    gradeId: number
    academicYear: string
    month: number
  } | null>(null)

  // Mark-complete in-flight state per unit: { [syllabusUnitId]: boolean }
  const [completing, setCompleting] = useState<Record<string, boolean>>({})

  const { data: subjectsData } = useSubjects({ limit: 100 })
  const subjects = subjectsData?.data ?? []

  const {
    data,
    isLoading,
    isFetching,
  } = useMonthlyPlan(filter ?? {})

  const markCompleteMutation = useMarkLessonComplete()

  React.useEffect(() => {
    setCompleting({})
  }, [filter])

  const handleLoad = () => {
    if (!subjectId || !gradeId || !academicYear.match(/^\d{4}$/)) {
      showNotification({ variant: 'warning', message: 'Please select a subject, grade, and valid year.' })
      return
    }
    setFilter({ subjectId, gradeId: Number(gradeId), academicYear, month })
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

  const nativeEntries = (data?.entries ?? []).filter((e) => !e.carriedForward)
  const carriedEntries = (data?.entries ?? []).filter((e) => e.carriedForward)
  const totalPlanned = nativeEntries.length
  const completed = nativeEntries.filter((e) => e.isComplete).length
  const progressPct = Math.round(data?.monthCompletionPercent ?? 0)

  const selectedSubjectName = subjects.find((s) => s.id === (filter?.subjectId ?? subjectId))?.name ?? ''

  const renderRow = (entry: MonthlyPlanEntry) => {
    const isCompleting = !!completing[entry.syllabusUnitId]

    return (
      <tr key={entry.id}>
        <td>
          <span className="fw-medium small">{entry.syllabusUnit.title}</span>
          {entry.carriedForward && (
            <p className="text-muted small mb-0" style={{ fontSize: '0.75rem' }}>
              Originally planned for{' '}
              {new Date(`${entry.plannedCompletionDate}T00:00:00Z`).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long',
              })}
            </p>
          )}
        </td>
        <td>
          <span className="small">
            {new Date(`${entry.plannedCompletionDate}T00:00:00Z`).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short',
            })}
          </span>
        </td>
        <td className="text-center">
          <div className="d-flex flex-column align-items-center gap-1">
            {entry.carriedForward && (
              <span className="badge d-inline-flex align-items-center gap-1 bg-warning bg-opacity-15 text-warning-emphasis">
                <AlertTriangle size={13} />
                Carried forward
              </span>
            )}
            {entry.isComplete ? (
              <span className="badge d-inline-flex align-items-center gap-1 bg-success bg-opacity-15 text-success">
                <CheckCircle size={13} />
                Completed
              </span>
            ) : entry.behindSchedule ? (
              <span className="badge d-inline-flex align-items-center gap-1 bg-warning bg-opacity-15 text-warning-emphasis">
                <AlertTriangle size={13} />
                Behind schedule
              </span>
            ) : (
              <span className="badge d-inline-flex align-items-center gap-1 bg-secondary bg-opacity-15 text-secondary">
                Scheduled
              </span>
            )}

            {!entry.isComplete && (
              <button
                type="button"
                className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 py-0 px-2"
                style={{ fontSize: '0.72rem' }}
                disabled={isCompleting}
                onClick={() => handleMarkComplete(entry.syllabusUnitId)}
              >
                {isCompleting && <span className="spinner-border spinner-border-sm" />}
                {isCompleting ? 'Saving…' : 'Mark Complete'}
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="container-fluid py-4">

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <CalendarClock size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Monthly Lesson Plan</h4>
          <p className="text-muted small mb-0">This month&rsquo;s lessons, auto-pulled from your annual plan</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-3">
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

            <div className="col-6 col-sm-2">
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

            <div className="col-6 col-sm-3">
              <label className="form-label fw-semibold small mb-1">Month</label>
              <select
                className="form-select form-select-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-2">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                disabled={!subjectId || !gradeId || academicYear.length !== 4}
                onClick={handleLoad}
              >
                {isFetching && filter && <span className="spinner-border spinner-border-sm" />}
                Load
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content area — only after Load */}
      {filter && (
        <>
          {/* Progress card */}
          {!isLoading && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body py-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-semibold small">{MONTH_NAMES[filter.month - 1]} Progress</span>
                  <span className="small text-muted">
                    <strong className="text-body">{completed}</strong> / {totalPlanned} lessons completed
                  </span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className={`progress-bar ${progressPct === 100 ? 'bg-success' : 'bg-primary'}`}
                    style={{ width: `${progressPct}%`, transition: 'width 0.3s ease' }}
                  />
                </div>
                {carriedEntries.length > 0 && (
                  <span
                    className="badge d-inline-flex align-items-center gap-1 mt-3 px-3 py-2 bg-warning bg-opacity-15 text-warning-emphasis"
                    style={{ fontSize: '0.8rem', borderRadius: '20px' }}
                  >
                    <AlertTriangle size={13} />
                    {carriedEntries.length} lesson{carriedEntries.length !== 1 ? 's' : ''} carried forward from earlier months
                  </span>
                )}
              </div>
            </div>
          )}

          {/* This month's lessons */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3">
              <span className="fw-semibold">
                {isLoading ? 'Loading…' : `${MONTH_NAMES[filter.month - 1]} ${filter.academicYear}`}
                {selectedSubjectName && (
                  <span className="text-muted ms-2 fw-normal small">
                    · {selectedSubjectName} / Grade {filter.gradeId}
                  </span>
                )}
              </span>
            </div>

            {isLoading && (
              <div className="p-3 placeholder-glow">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 44 }} />
                ))}
              </div>
            )}

            {!isLoading && nativeEntries.length === 0 && (
              <div className="py-5 text-center text-muted">
                <CalendarClock size={40} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">No lessons planned this month</p>
                <p className="small mb-0">
                  Nothing in your annual plan falls within {MONTH_NAMES[filter.month - 1]} {filter.academicYear}.
                </p>
              </div>
            )}

            {!isLoading && nativeEntries.length > 0 && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Lesson Title</th>
                      <th style={{ width: 130 }}>Planned Date</th>
                      <th style={{ width: 150 }} className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nativeEntries.map(renderRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Carried forward from earlier months */}
          {!isLoading && carriedEntries.length > 0 && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <span className="fw-semibold">Carried Forward from Earlier Months</span>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Lesson Title</th>
                      <th style={{ width: 130 }}>Planned Date</th>
                      <th style={{ width: 150 }} className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carriedEntries.map(renderRow)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Export with RoleGuard ────────────────────────────────────────────────────

export default function TeacherMonthlyPlan() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SYSTEM_ADMIN, ROLES.SECTION_HEAD]}>
      <MonthlyPlanPage />
    </RoleGuard>
  )
}
