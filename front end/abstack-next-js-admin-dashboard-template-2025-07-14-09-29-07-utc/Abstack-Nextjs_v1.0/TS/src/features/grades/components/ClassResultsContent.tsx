'use client'
import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, Award, BarChart3, Download, Send, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react'
import { useAcademicTerms } from '../hooks/useAcademicTerms'
import { useClassResults } from '../hooks/useClassResults'
import { usePublishResults } from '../hooks/usePublishResults'
import { useClassSections } from '@/features/teacher-subject-requirements/hooks/useClassSections'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { ClassRankRow, ClassSubjectRankRow } from '@/types/sims/grades'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const DISTRIBUTION_BUCKETS = [
  { label: '0-20', min: 0, max: 20 },
  { label: '21-40', min: 21, max: 40 },
  { label: '41-60', min: 41, max: 60 },
  { label: '61-80', min: 61, max: 80 },
  { label: '81-100', min: 81, max: 100 },
]

function PercentageCell({ isComplete, percentage }: { isComplete: boolean; percentage: number | null }) {
  if (!isComplete) {
    return (
      <span
        className="badge rounded-pill px-2 py-1 fw-bold"
        style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.7rem' }}
      >
        Not yet complete
      </span>
    )
  }
  return (
    <span className="text-muted small">
      {percentage !== null ? `${percentage.toFixed(2)}%` : '—'}
    </span>
  )
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-muted small">—</span>
  return (
    <span
      className="badge rounded-pill fw-bold px-3 py-2"
      style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', fontSize: '0.85rem' }}
    >
      {rank}
    </span>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex align-items-center gap-3 py-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 44, height: 44, background: `${accent}1a` }}
          >
            {icon}
          </div>
          <div>
            <div className="fw-bold fs-5" style={{ color: accent, lineHeight: 1.15 }}>{value}</div>
            <div className="text-muted small">{label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ClassResultsContent() {
  const { user } = useAuthStore()
  const { showNotification } = useNotificationContext()
  const canPublish = user?.role === ROLES.PRINCIPAL || user?.role === ROLES.SECTION_HEAD

  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedClassSectionId, setSelectedClassSectionId] = useState<number | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: classSections = [], isLoading: sectionsLoading } = useClassSections()
  const { data: subjects } = useSubjects({ limit: 100 })
  const { data: classResults, isLoading: rowsLoading } = useClassResults(
    selectedClassSectionId,
    selectedTermId,
    selectedSubjectId || null,
  )
  const publishMutation = usePublishResults()

  const isSubjectView = !!selectedSubjectId
  const rows = classResults?.rows ?? []
  const summary = classResults?.summary

  const handlePublish = () => {
    if (!selectedClassSectionId || !selectedTermId) return
    if (
      !window.confirm(
        'Publish results for this class and term? This will make completed results visible and generate report cards. Continue?',
      )
    )
      return

    publishMutation.mutate(
      { classSectionId: selectedClassSectionId, termId: selectedTermId },
      {
        onSuccess: (summaryResult) => {
          showNotification({
            variant: 'success',
            message: `Published ${summaryResult.publishedCount} result(s). ${summaryResult.skippedIncompleteCount} incomplete result(s) skipped, ${summaryResult.alreadyPublishedCount} already published.`,
          })
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message ?? err.message ?? 'Failed to publish results.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  useEffect(() => {
    if (terms.length > 0 && selectedTermId === null) {
      setSelectedTermId(terms[0].id)
    }
  }, [terms, selectedTermId])

  useEffect(() => {
    if (classSections.length > 0 && selectedClassSectionId === null) {
      setSelectedClassSectionId(classSections[0].id)
    }
  }, [classSections, selectedClassSectionId])

  const distribution = useMemo(() => {
    const complete = rows.filter((r) => r.isComplete && r.percentage !== null)
    return DISTRIBUTION_BUCKETS.map((bucket) => ({
      ...bucket,
      count: complete.filter((r) => r.percentage! >= bucket.min && r.percentage! <= bucket.max).length,
    }))
  }, [rows])

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
          >
            <Trophy size={22} color="white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Class Results</h4>
            <p className="mb-0 text-muted small">Ranked results, class average, and distribution for a class section and term</p>
          </div>
        </div>

        {canPublish && (
          <button
            type="button"
            className="btn d-flex align-items-center gap-2 text-white fw-semibold px-4"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }}
            disabled={!selectedTermId || !selectedClassSectionId || publishMutation.isPending}
            onClick={handlePublish}
          >
            <Send size={15} />
            {publishMutation.isPending ? 'Publishing…' : 'Publish Results'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body py-3 px-4">
          <div className="row align-items-center g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Academic Term</label>
              {termsLoading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                </div>
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
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Class Section</label>
              {sectionsLoading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedClassSectionId ?? ''}
                  onChange={(e) =>
                    setSelectedClassSectionId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— Select a class section —</option>
                  {classSections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grade.name} · Section {c.name} ({c.academicYear})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">
                Subject <span className="text-muted fw-normal">(optional — per-subject rank)</span>
              </label>
              <select
                className="form-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="">All Subjects (overall term rank)</option>
                {(subjects?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedTermId && selectedClassSectionId && !rowsLoading && rows.length > 0 && summary && (
        <>
          {/* Summary stats */}
          <div className="row g-3 mb-3">
            <SummaryCard
              icon={<BarChart3 size={20} color="#6366f1" />}
              label={isSubjectView ? 'Subject Average' : 'Class Average'}
              value={summary.classAveragePercentage !== null ? `${summary.classAveragePercentage.toFixed(1)}%` : '—'}
              accent="#6366f1"
            />
            <SummaryCard
              icon={<TrendingUp size={20} color="#16a34a" />}
              label="Highest"
              value={summary.highestPercentage !== null ? `${summary.highestPercentage.toFixed(1)}%` : '—'}
              accent="#16a34a"
            />
            <SummaryCard
              icon={<TrendingDown size={20} color="#dc2626" />}
              label="Lowest"
              value={summary.lowestPercentage !== null ? `${summary.lowestPercentage.toFixed(1)}%` : '—'}
              accent="#dc2626"
            />
            <SummaryCard
              icon={<Award size={20} color="#d97706" />}
              label="Pass Rate (≥50%)"
              value={summary.passRate !== null ? `${summary.passRate.toFixed(1)}%` : '—'}
              accent="#d97706"
            />
          </div>

          {/* Distribution chart */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
            >
              <Users size={16} color="white" />
              <span className="fw-bold text-white">Mark Distribution</span>
            </div>
            <div className="card-body">
              <Chart
                type="bar"
                height={240}
                series={[{ name: 'Students', data: distribution.map((b) => b.count) }]}
                options={{
                  chart: { toolbar: { show: false } },
                  plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
                  xaxis: { categories: distribution.map((b) => b.label), title: { text: 'Percentage range' } },
                  yaxis: { title: { text: 'Students' }, forceNiceScale: true, min: 0 },
                  colors: ['#6366f1'],
                  dataLabels: { enabled: true },
                  legend: { show: false },
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Results table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          {!selectedTermId || !selectedClassSectionId ? (
            <div className="text-center py-5 text-muted">
              <Trophy size={40} className="mb-3 opacity-25" />
              <p className="mb-0">Select a term and class section to view results.</p>
            </div>
          ) : rowsLoading ? (
            <div className="p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="placeholder-glow mb-3">
                  <span className="placeholder col-12 rounded" style={{ height: 32 }} />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Trophy size={40} className="mb-3 opacity-25" />
              <p className="mb-1 fw-semibold">No results yet</p>
              <p className="mb-0 small">No results have been computed for this class and term.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">#</th>
                    <th className="py-3 text-muted small fw-semibold border-0">{isSubjectView ? 'Subj. Rank' : 'Rank'}</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Student</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Total / Max</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Percentage</th>
                    {!isSubjectView && <th className="py-3 text-muted small fw-semibold border-0">Status</th>}
                    {!isSubjectView && <th className="py-3 text-muted small fw-semibold border-0">Report Card</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const termRow = row as ClassRankRow
                    const subjectRow = row as ClassSubjectRankRow
                    return (
                      <tr key={row.studentId}>
                        <td className="px-4 text-muted small">{idx + 1}</td>
                        <td>
                          <RankBadge rank={isSubjectView ? subjectRow.subjectRank : termRow.rank} />
                        </td>
                        <td>
                          <div className="fw-semibold small">
                            {row.lastName}, {row.firstName}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {row.admissionNumber}
                          </div>
                        </td>
                        <td className="small">
                          {row.totalScore} / {row.totalMaxScore}
                        </td>
                        <td>
                          <PercentageCell isComplete={row.isComplete} percentage={row.percentage} />
                        </td>
                        {!isSubjectView && (
                          <td>
                            <div className="d-flex flex-column gap-1 align-items-start">
                              {termRow.isComplete ? (
                                <span
                                  className="badge rounded-pill px-2 py-1 fw-bold"
                                  style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem' }}
                                >
                                  Complete
                                </span>
                              ) : (
                                <span
                                  className="badge rounded-pill px-2 py-1 fw-bold"
                                  style={{ background: '#fef9c3', color: '#92400e', fontSize: '0.7rem' }}
                                >
                                  In progress
                                </span>
                              )}
                              {termRow.isPublished && (
                                <span
                                  className="badge rounded-pill px-2 py-1 fw-bold"
                                  style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem' }}
                                >
                                  Published
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {!isSubjectView && (
                          <td>
                            {termRow.reportCardPath ? (
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1${termRow.reportCardPath}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-link btn-sm p-0 d-flex align-items-center gap-1 text-primary"
                              >
                                <Download size={14} /> Download
                              </a>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
          No academic terms configured yet.
        </div>
      )}
    </div>
  )
}
