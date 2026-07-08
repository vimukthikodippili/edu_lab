'use client'
import React, { useState } from 'react'
import { BarChart2, AlertTriangle, CheckCircle2, Users, BookOpen } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useSectionSyllabusSummary } from '@/features/lesson-plan/hooks/useSectionSyllabusSummary'

const CURRENT_YEAR = String(new Date().getFullYear())

const STAGE_OPTIONS: { value: string; label: string; gradeFrom?: number; gradeTo?: number }[] = [
  { value: 'all', label: 'All Grades' },
  { value: 'primary', label: 'Primary (1-5)', gradeFrom: 1, gradeTo: 5 },
  { value: 'junior_secondary', label: 'Junior Secondary (6-9)', gradeFrom: 6, gradeTo: 9 },
  { value: 'senior_secondary', label: 'Senior Secondary (10-11)', gradeFrom: 10, gradeTo: 11 },
  { value: 'collegiate', label: 'Collegiate (12-13)', gradeFrom: 12, gradeTo: 13 },
]

function progressBarColor(completionPercentage: number, behindSchedule: boolean): string {
  if (behindSchedule) return 'bg-danger'
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

function SectionHeadSyllabusProgressPage() {
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [stage, setStage] = useState('all')
  const [filter, setFilter] = useState<{ academicYear: string; gradeFrom?: number; gradeTo?: number } | null>(null)

  const { data: teachers, isLoading, isFetching } = useSectionSyllabusSummary({
    academicYear: filter?.academicYear,
    gradeFrom: filter?.gradeFrom,
    gradeTo: filter?.gradeTo,
  })

  const handleLoad = () => {
    if (!academicYear.match(/^\d{4}$/)) return
    const selectedStage = STAGE_OPTIONS.find((s) => s.value === stage)
    setFilter({
      academicYear,
      gradeFrom: selectedStage?.gradeFrom,
      gradeTo: selectedStage?.gradeTo,
    })
  }

  const totalTeachers = teachers?.length ?? 0
  const totalSubjectGroups = teachers?.reduce((sum, t) => sum + t.subjects.length, 0) ?? 0
  const behindScheduleCount = teachers?.reduce(
    (sum, t) => sum + t.subjects.filter((s) => s.behindSchedule).length,
    0,
  ) ?? 0

  return (
    <div className="container-fluid py-4">

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <BarChart2 size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Syllabus Completion</h4>
          <p className="text-muted small mb-0">Track lesson coverage per teacher and subject in your section</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-6 col-sm-3">
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

            <div className="col-12 col-sm-5">
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

            <div className="col-12 col-sm-4">
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
              {behindScheduleCount > 0 && (
                <span
                  className="badge d-inline-flex align-items-center gap-1 px-3 py-2 bg-warning bg-opacity-15 text-warning-emphasis"
                  style={{ fontSize: '0.8rem', borderRadius: '20px' }}
                >
                  <AlertTriangle size={13} />
                  {behindScheduleCount} behind schedule
                </span>
              )}
            </div>
          )}

          {/* Table card */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <span className="fw-semibold">Completion by Teacher &amp; Subject</span>
            </div>

            {isLoading && <SkeletonRows />}

            {!isLoading && totalTeachers === 0 && (
              <div className="py-5 text-center text-muted">
                <BarChart2 size={40} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">No lesson plan data found</p>
                <p className="small mb-0">
                  No teachers have planned lessons yet for this year/grade range.
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
                      <th style={{ width: 160 }} className="text-center">Status</th>
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
                        {teacher.subjects.map((subj) => (
                          <tr key={`${teacher.staffId}-${subj.subjectId}-${subj.gradeId}`}>
                            <td className="ps-4 small">
                              {subj.subjectName} <span className="text-muted">({subj.gradeName})</span>
                            </td>
                            <td>
                              <div className="progress" style={{ height: 8 }}>
                                <div
                                  className={`progress-bar ${progressBarColor(subj.completionPercentage, subj.behindSchedule)}`}
                                  style={{ width: `${subj.completionPercentage}%`, transition: 'width 0.3s ease' }}
                                />
                              </div>
                            </td>
                            <td className="text-center small">
                              {subj.completedUnits} / {subj.totalUnits} ({subj.completionPercentage}%)
                            </td>
                            <td className="text-center">
                              {subj.behindSchedule ? (
                                <span className="badge d-inline-flex align-items-center gap-1 bg-warning bg-opacity-15 text-warning-emphasis">
                                  <AlertTriangle size={13} />
                                  Behind schedule
                                </span>
                              ) : subj.completionPercentage >= 100 ? (
                                <span className="badge d-inline-flex align-items-center gap-1 bg-success bg-opacity-15 text-success">
                                  <CheckCircle2 size={13} />
                                  On track
                                </span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-15 text-secondary">
                                  In progress
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
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

export default function SectionHeadSyllabusProgress() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECTION_HEAD, ROLES.PRINCIPAL, ROLES.SYSTEM_ADMIN]}>
      <SectionHeadSyllabusProgressPage />
    </RoleGuard>
  )
}
