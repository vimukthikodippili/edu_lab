'use client'
import React, { useState } from 'react'
import { CalendarCheck, AlertTriangle, CheckCircle2, Users, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMonthEndSummary } from '@/features/lesson-plan/hooks/useMonthEndSummary'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

const CURRENT_YEAR = String(new Date().getFullYear())
const LAST_MONTH = (() => {
  const now = new Date()
  return now.getMonth() === 0 ? 12 : now.getMonth()
})()

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STAGE_OPTIONS: { value: string; label: string; gradeFrom?: number; gradeTo?: number }[] = [
  { value: 'all', label: 'All Grades' },
  { value: 'primary', label: 'Primary (1-5)', gradeFrom: 1, gradeTo: 5 },
  { value: 'junior_secondary', label: 'Junior Secondary (6-9)', gradeFrom: 6, gradeTo: 9 },
  { value: 'senior_secondary', label: 'Senior Secondary (10-11)', gradeFrom: 10, gradeTo: 11 },
  { value: 'collegiate', label: 'Collegiate (12-13)', gradeFrom: 12, gradeTo: 13 },
]

function progressBarColor(completionPercentage: number, hasIncomplete: boolean): string {
  if (hasIncomplete) return 'bg-warning'
  if (completionPercentage >= 100) return 'bg-success'
  return 'bg-primary'
}

function SkeletonRows() {
  return (
    <div className="p-3 placeholder-glow">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 44 }} />
      ))}
    </div>
  )
}

function MonthEndSummaryPage() {
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(LAST_MONTH)
  const [stage, setStage] = useState('all')
  const [filter, setFilter] = useState<{ academicYear: string; month: number; gradeFrom?: number; gradeTo?: number } | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const { data: teachers, isLoading, isFetching } = useMonthEndSummary({
    academicYear: filter?.academicYear,
    month: filter?.month,
    gradeFrom: filter?.gradeFrom,
    gradeTo: filter?.gradeTo,
  })

  const handleLoad = () => {
    if (!academicYear.match(/^\d{4}$/)) return
    const selectedStage = STAGE_OPTIONS.find((s) => s.value === stage)
    setFilter({
      academicYear,
      month,
      gradeFrom: selectedStage?.gradeFrom,
      gradeTo: selectedStage?.gradeTo,
    })
    setExpandedKey(null)
  }

  const totalTeachers = teachers?.length ?? 0
  const totalSubjectGroups = teachers?.reduce((sum, t) => sum + t.subjects.length, 0) ?? 0
  const incompleteGroupsCount = teachers?.reduce(
    (sum, t) => sum + t.subjects.filter((s) => s.incompleteItems.length > 0).length,
    0,
  ) ?? 0

  return (
    <div className="container-fluid py-4 edulab-page">

      <PrincipalPageHeader
        icon={CalendarCheck}
        title="Month-End Summary"
        subtitle="Lesson coverage snapshot per teacher, generated automatically at month end"
      />

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
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

            <div className="col-12 col-sm-4">
              <label className="form-label fw-semibold small mb-1">Grade Stage</label>
              <select
                className="form-select form-select-sm"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-3">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                disabled={academicYear.length !== 4}
                onClick={handleLoad}
              >
                {isFetching && filter && <span className="spinner-border spinner-border-sm" />}
                Load
              </button>
            </div>
          </div>
        </div>
      </div>

      {filter && (
        <>
          {/* Summary chips */}
          {!isLoading && (
            <div className="d-flex flex-wrap gap-2 mb-4">
              <span
                className="badge d-inline-flex align-items-center gap-1 px-3 py-2 bg-secondary bg-opacity-15 text-secondary"
                style={{ fontSize: '0.8rem', borderRadius: '20px' }}
              >
                <Users size={13} />
                {totalTeachers} teacher{totalTeachers !== 1 ? 's' : ''}
              </span>
              <span
                className="badge d-inline-flex align-items-center gap-1 px-3 py-2 bg-info bg-opacity-15 text-info"
                style={{ fontSize: '0.8rem', borderRadius: '20px' }}
              >
                <BookOpen size={13} />
                {totalSubjectGroups} subject{totalSubjectGroups !== 1 ? 's' : ''} tracked
              </span>
              {incompleteGroupsCount > 0 && (
                <span
                  className="badge d-inline-flex align-items-center gap-1 px-3 py-2 bg-warning bg-opacity-15 text-warning-emphasis"
                  style={{ fontSize: '0.8rem', borderRadius: '20px' }}
                >
                  <AlertTriangle size={13} />
                  {incompleteGroupsCount} with pending lessons
                </span>
              )}
            </div>
          )}

          {/* Table card */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <span className="fw-semibold">{MONTH_NAMES[filter.month - 1]} {filter.academicYear} Coverage by Teacher &amp; Subject</span>
            </div>

            {isLoading && <SkeletonRows />}

            {!isLoading && totalTeachers === 0 && (
              <div className="py-5 text-center text-muted">
                <CalendarCheck size={40} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">No month-end summary found</p>
                <p className="small mb-0">
                  The summary for this month/grade range hasn&rsquo;t been generated yet, or no lessons were planned.
                </p>
              </div>
            )}

            {!isLoading && totalTeachers > 0 && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Subject</th>
                      <th style={{ width: 200 }}>Progress</th>
                      <th style={{ width: 110 }} className="text-center">Completed</th>
                      <th style={{ width: 170 }} className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers?.map((teacher) => (
                      <React.Fragment key={teacher.staffId}>
                        <tr className="table-light">
                          <td colSpan={4} className="fw-bold small py-2">
                            {teacher.teacherName}
                            <span className="text-muted fw-normal ms-2">
                              · {teacher.subjects.length} subject{teacher.subjects.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                        {teacher.subjects.map((subj) => {
                          const rowKey = `${teacher.staffId}-${subj.subjectId}`
                          const isExpanded = expandedKey === rowKey
                          const hasIncomplete = subj.incompleteItems.length > 0
                          return (
                            <React.Fragment key={rowKey}>
                              <tr>
                                <td className="ps-4 small">{subj.subjectName}</td>
                                <td>
                                  <div className="progress" style={{ height: 8 }}>
                                    <div
                                      className={`progress-bar ${progressBarColor(subj.completionPercentage, hasIncomplete)}`}
                                      style={{ width: `${subj.completionPercentage}%`, transition: 'width 0.3s ease' }}
                                    />
                                  </div>
                                </td>
                                <td className="text-center small">
                                  {subj.completedCount} / {subj.plannedCount} ({subj.completionPercentage}%)
                                </td>
                                <td className="text-center">
                                  {hasIncomplete ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-warning d-inline-flex align-items-center gap-1 py-0 px-2"
                                      style={{ fontSize: '0.72rem' }}
                                      onClick={() => setExpandedKey(isExpanded ? null : rowKey)}
                                    >
                                      <AlertTriangle size={12} />
                                      {subj.incompleteItems.length} incomplete
                                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                  ) : (
                                    <span className="badge d-inline-flex align-items-center gap-1 bg-success bg-opacity-15 text-success">
                                      <CheckCircle2 size={13} />
                                      All complete
                                    </span>
                                  )}
                                </td>
                              </tr>
                              {isExpanded && hasIncomplete && (
                                <tr>
                                  <td colSpan={4} className="bg-light ps-5 py-2">
                                    <p className="fw-semibold small mb-1 text-warning-emphasis">Incomplete lessons</p>
                                    <ul className="small mb-0 ps-3">
                                      {subj.incompleteItems.map((item, i) => (
                                        <li key={i}>
                                          {item.title}
                                          <span className="text-muted ms-2">
                                            (planned for {new Date(`${item.plannedCompletionDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })})
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function SectionHeadMonthEndSummary() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECTION_HEAD, ROLES.PRINCIPAL, ROLES.SYSTEM_ADMIN]}>
      <MonthEndSummaryPage />
    </RoleGuard>
  )
}
