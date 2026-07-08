'use client'
import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { TrendingDown, AlertTriangle, LineChart, Info, Lightbulb } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useMyAssessments } from '@/features/grades/hooks/useMyAssessments'
import { useGradeTrends } from '@/features/grades/hooks/useGradeTrends'
import type { GradeTrendStudentRow } from '@/types/sims/grades'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface SubjectClassOption {
  subjectId: string
  classSectionId: number
  subjectName: string
  classSectionName: string
}

// ─── Chart row ──────────────────────────────────────────────────────────────

function TrendChart({ row }: { row: GradeTrendStudentRow }) {
  if (row.series.length === 0) {
    return <p className="text-muted small mb-0">No submitted marks yet for this subject.</p>
  }

  return (
    <Chart
      type="line"
      height={220}
      series={[{ name: 'Score %', data: row.series.map((p) => Math.round(p.percentScore * 10) / 10) }]}
      options={{
        chart: { toolbar: { show: false } },
        xaxis: {
          categories: row.series.map((p) =>
            new Date(`${p.scheduledDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          ),
        },
        yaxis: { min: 0, max: 100, title: { text: 'Score %' } },
        stroke: { curve: 'smooth', width: 3 },
        colors: [row.decliningTrend ? '#dc3545' : '#6366f1'],
        markers: { size: 4 },
        dataLabels: { enabled: false },
      }}
    />
  )
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function GradeTrendsPage() {
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: assessments = [], isLoading: assessmentsLoading } = useMyAssessments(selectedTermId)

  useEffect(() => {
    if (terms.length > 0 && selectedTermId === null) {
      setSelectedTermId(terms[0].id)
    }
  }, [terms, selectedTermId])

  const subjectClassOptions = useMemo<SubjectClassOption[]>(() => {
    const map = new Map<string, SubjectClassOption>()
    assessments.forEach((a) => {
      const key = `${a.subjectId}::${a.classSectionId}`
      if (!map.has(key)) {
        map.set(key, {
          subjectId: a.subjectId,
          classSectionId: a.classSectionId,
          subjectName: a.subject.name,
          classSectionName: a.classSection?.name ?? `Section ${a.classSectionId}`,
        })
      }
    })
    return [...map.values()]
  }, [assessments])

  useEffect(() => {
    if (subjectClassOptions.length > 0) {
      setSelectedKey(`${subjectClassOptions[0].subjectId}::${subjectClassOptions[0].classSectionId}`)
    } else {
      setSelectedKey('')
    }
  }, [subjectClassOptions])

  const [subjectId, classSectionIdStr] = selectedKey ? selectedKey.split('::') : [null, null]
  const classSectionId = classSectionIdStr ? Number(classSectionIdStr) : null

  const { data: rows = [], isLoading: rowsLoading } = useGradeTrends(classSectionId, subjectId)

  const decliningCount = rows.filter((r) => r.decliningTrend).length

  return (
    <div className="container-fluid py-4">

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <LineChart size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Grade Trends</h4>
          <p className="text-muted small mb-0">Score history per student — spot a decline before it becomes a problem</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-4">
              <label className="form-label fw-semibold small mb-1">Term</label>
              {termsLoading ? (
                <span className="placeholder col-12 rounded d-block" style={{ height: 32 }} />
              ) : (
                <select
                  className="form-select form-select-sm"
                  value={selectedTermId ?? ''}
                  onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : null)}
                >
                  {terms.length === 0 && <option value="">No terms configured</option>}
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="col-12 col-sm-8">
              <label className="form-label fw-semibold small mb-1">Subject / Class</label>
              {assessmentsLoading ? (
                <span className="placeholder col-12 rounded d-block" style={{ height: 32 }} />
              ) : (
                <select
                  className="form-select form-select-sm"
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                >
                  {subjectClassOptions.length === 0 && <option value="">No subjects/classes for this term</option>}
                  {subjectClassOptions.map((opt) => {
                    const key = `${opt.subjectId}::${opt.classSectionId}`
                    return (
                      <option key={key} value={key}>
                        {opt.subjectName} · {opt.classSectionName}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {classSectionId && subjectId && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3 flex-wrap gap-2">
            <span className="fw-semibold">{rowsLoading ? 'Loading…' : 'Students'}</span>
            {decliningCount > 0 && (
              <span className="badge d-inline-flex align-items-center gap-1 bg-warning bg-opacity-15 text-warning-emphasis">
                <AlertTriangle size={13} />
                {decliningCount} student{decliningCount !== 1 ? 's' : ''} declining
              </span>
            )}
          </div>

          {rowsLoading && (
            <div className="p-3 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 44 }} />
              ))}
            </div>
          )}

          {!rowsLoading && rows.length === 0 && (
            <div className="py-5 text-center text-muted">
              <LineChart size={40} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">No active students in this class section</p>
            </div>
          )}

          {!rowsLoading && rows.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Student</th>
                    <th style={{ width: 150 }} className="text-center">Trend</th>
                    <th style={{ width: 120 }} className="text-center">Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <React.Fragment key={row.studentId}>
                      <tr>
                        <td>
                          <span className="fw-medium small">{row.lastName}, {row.firstName}</span>
                          <p className="text-muted small mb-0" style={{ fontSize: '0.75rem' }}>
                            {row.admissionNumber}
                          </p>
                          {row.attendanceGradeFlag && (
                            <p className="small mb-0 mt-1 d-flex align-items-start gap-1 text-info" style={{ fontSize: '0.75rem' }}>
                              <Info size={13} className="flex-shrink-0 mt-1" />
                              <span>{row.attendanceGradeFlag.description}</span>
                            </p>
                          )}
                          {row.effortOutcomeMismatchFlag && (
                            <p className="small mb-0 mt-1 d-flex align-items-start gap-1 text-primary" style={{ fontSize: '0.75rem' }}>
                              <Lightbulb size={13} className="flex-shrink-0 mt-1" />
                              <span>{row.effortOutcomeMismatchFlag.description}</span>
                            </p>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-flex flex-column align-items-center gap-1">
                            {row.decliningTrend ? (
                              <span className="badge d-inline-flex align-items-center gap-1 bg-warning bg-opacity-15 text-warning-emphasis">
                                <TrendingDown size={13} />
                                Declining
                              </span>
                            ) : (
                              <span className="badge d-inline-flex align-items-center gap-1 bg-secondary bg-opacity-15 text-secondary">
                                Stable
                              </span>
                            )}
                            {row.attendanceGradeFlag && (
                              <span className="badge d-inline-flex align-items-center gap-1 bg-info bg-opacity-15 text-info">
                                <Info size={13} />
                                Pattern flagged
                              </span>
                            )}
                            {row.effortOutcomeMismatchFlag && (
                              <span className="badge d-inline-flex align-items-center gap-1 bg-primary bg-opacity-15 text-primary">
                                <Lightbulb size={13} />
                                Support suggested
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() =>
                              setExpandedStudentId(expandedStudentId === row.studentId ? null : row.studentId)
                            }
                          >
                            {expandedStudentId === row.studentId ? 'Hide' : 'View Chart'}
                          </button>
                        </td>
                      </tr>
                      {expandedStudentId === row.studentId && (
                        <tr>
                          <td colSpan={3} className="bg-light">
                            <TrendChart row={row} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Export with RoleGuard ────────────────────────────────────────────────────

export default function TeacherGradeTrends() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <GradeTrendsPage />
    </RoleGuard>
  )
}
