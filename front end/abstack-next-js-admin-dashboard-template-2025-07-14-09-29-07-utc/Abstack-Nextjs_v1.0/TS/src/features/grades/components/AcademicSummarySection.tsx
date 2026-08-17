'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart3, TrendingUp, TrendingDown, Minus, Award, AlertTriangle, GraduationCap } from 'lucide-react'
import { useStudentAcademicSummary } from '../hooks/useStudentAcademicSummary'
import { useAcademicTerms } from '../hooks/useAcademicTerms'
import type { RecentTrend, SubjectSummaryRow } from '@/types/sims/grades'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type TabKey = 'overview' | 'detail' | 'flags' | 'attendance'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Subject Overview' },
  { key: 'detail', label: 'Subject Detail' },
  { key: 'flags', label: 'Academic Flags' },
  { key: 'attendance', label: 'Attendance' },
]

const FLAG_TYPE_LABELS: Record<string, string> = {
  attendance_grade_correlation: 'Attendance & Grades Both Declining',
  effort_outcome_mismatch: 'Effort-Outcome Mismatch',
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function TrendBadge({ trend }: { trend: RecentTrend }) {
  if (trend === 'improving') {
    return (
      <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
        <TrendingUp size={12} /> Improving
      </span>
    )
  }
  if (trend === 'declining') {
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1">
        <TrendingDown size={12} /> Declining
      </span>
    )
  }
  return (
    <span className="badge bg-secondary-subtle text-secondary border d-inline-flex align-items-center gap-1">
      <Minus size={12} /> Stable
    </span>
  )
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof BarChart3; title: string; subtitle: string }) {
  return (
    <div className="text-center py-5 text-muted">
      <Icon size={36} className="mb-2 opacity-25" />
      <p className="mb-1 small fw-medium">{title}</p>
      <p className="mb-0 text-muted" style={{ fontSize: '0.78rem' }}>{subtitle}</p>
    </div>
  )
}

interface Props {
  studentId: string
}

export function AcademicSummarySection({ studentId }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  const { data: terms = [] } = useAcademicTerms()
  const { data: summary, isLoading, isError } = useStudentAcademicSummary(studentId, selectedTermId)

  // Default the Subject Detail tab to the first subject once real data arrives, without
  // clobbering a selection the user already made by clicking an overview card.
  useEffect(() => {
    if (!selectedSubjectId && summary?.subjectSummaries.length) {
      setSelectedSubjectId(summary.subjectSummaries[0].subjectId)
    }
  }, [summary, selectedSubjectId])

  const openSubjectDetail = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setActiveTab('detail')
  }

  const selectedSubject: SubjectSummaryRow | undefined = summary?.subjectSummaries.find(
    (s) => s.subjectId === selectedSubjectId,
  )

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div
        className="card-header border-0 d-flex align-items-center justify-content-between py-3 px-4 flex-wrap gap-2"
        style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
      >
        <span className="fw-bold text-white d-flex align-items-center gap-2">
          <BarChart3 size={18} />
          Academic Summary
        </span>
        <div className="d-flex align-items-center gap-2">
          {summary && (
            <span className="badge bg-white bg-opacity-25 text-white rounded-pill">{summary.termName}</span>
          )}
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={selectedTermId ?? summary?.termId ?? ''}
            onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : null)}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-body">
        {isLoading ? (
          <div className="p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="placeholder-glow mb-2">
                <span className="placeholder col-12 rounded" style={{ height: 56 }} />
              </div>
            ))}
          </div>
        ) : isError || !summary ? (
          <div className="alert alert-danger py-2 small mb-0">Failed to load academic summary. Please refresh.</div>
        ) : (
          <>
            {/* Overall rank/average strip */}
            <div className="d-flex flex-wrap gap-3 mb-4">
              <div className="border rounded-3 px-3 py-2 flex-grow-1">
                <div className="text-muted small">Overall Rank</div>
                <div className="fw-bold fs-5">
                  {summary.overallRank != null ? `#${summary.overallRank}` : <span className="text-muted fs-6">Not yet computed</span>}
                </div>
              </div>
              <div className="border rounded-3 px-3 py-2 flex-grow-1">
                <div className="text-muted small">Overall Average</div>
                <div className="fw-bold fs-5">
                  {summary.overallAverage != null ? `${summary.overallAverage.toFixed(1)}%` : <span className="text-muted fs-6">Not yet computed</span>}
                </div>
              </div>
              <div className="border rounded-3 px-3 py-2 flex-grow-1">
                <div className="text-muted small">Attendance (this term)</div>
                <div className="fw-bold fs-5">{summary.attendanceSummary.thisTermRate}%</div>
              </div>
            </div>

            {/* Tab strip */}
            <div className="d-flex gap-2 mb-3 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === t.key ? 'text-white' : 'btn-outline-secondary'}`}
                  style={activeTab === t.key ? { background: 'var(--edulab-accent)', border: 'none' } : undefined}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Subject Overview */}
            {activeTab === 'overview' && (
              summary.subjectSummaries.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="No subject marks recorded yet this term"
                  subtitle="Once assessments are marked for this student, subjects will appear here."
                />
              ) : (
                <div className="row g-3">
                  {summary.subjectSummaries.map((s) => (
                    <div key={s.subjectId} className="col-md-6 col-lg-4">
                      <button
                        type="button"
                        onClick={() => openSubjectDetail(s.subjectId)}
                        className="card border h-100 w-100 text-start p-3"
                        style={{ background: 'none', cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fw-semibold">{s.subjectName}</span>
                          <TrendBadge trend={s.recentTrend} />
                        </div>
                        <div className="text-muted small mb-2">{s.teacherName ?? 'Teacher not assigned'}</div>
                        <div className="d-flex align-items-baseline gap-2">
                          <span className="fs-3 fw-bold">
                            {s.thisTermAverage != null ? `${s.thisTermAverage.toFixed(1)}%` : '—'}
                          </span>
                          {s.classRankLatest != null && s.classSize != null && (
                            <span className="text-muted small">Rank {s.classRankLatest}/{s.classSize}</span>
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Subject Detail */}
            {activeTab === 'detail' && (
              summary.subjectSummaries.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="No subject selected"
                  subtitle="Pick a subject from Subject Overview to see its assessment history."
                />
              ) : (
                <div>
                  <select
                    className="form-select form-select-sm mb-3"
                    style={{ maxWidth: 280 }}
                    value={selectedSubjectId ?? ''}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                  >
                    {summary.subjectSummaries.map((s) => (
                      <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                    ))}
                  </select>

                  {selectedSubject && (
                    <>
                      <div className="d-flex flex-wrap gap-3 mb-4">
                        <div className="border rounded-3 px-3 py-2">
                          <div className="text-muted small">This Term</div>
                          <div className="fw-bold">{selectedSubject.thisTermAverage != null ? `${selectedSubject.thisTermAverage.toFixed(1)}%` : '—'}</div>
                        </div>
                        <div className="border rounded-3 px-3 py-2">
                          <div className="text-muted small">All-Time Average</div>
                          <div className="fw-bold">{selectedSubject.allTimeAverage != null ? `${selectedSubject.allTimeAverage.toFixed(1)}%` : '—'}</div>
                        </div>
                        <div className="border rounded-3 px-3 py-2">
                          <div className="text-muted small">Trend</div>
                          <div className="pt-1"><TrendBadge trend={selectedSubject.recentTrend} /></div>
                        </div>
                      </div>

                      {selectedSubject.assessmentHistory.length === 0 ? (
                        <EmptyState
                          icon={Award}
                          title="No assessments marked yet this term"
                          subtitle="Assessment history and class rank will appear here once marks are submitted."
                        />
                      ) : (
                        <>
                          <div style={{ marginBottom: 24 }}>
                            <Chart
                              type="line"
                              height={220}
                              series={[
                                { name: 'Score %', data: selectedSubject.assessmentHistory.map((a) => a.percentage) },
                                { name: 'Class Average %', data: selectedSubject.assessmentHistory.map((a) => a.classAverage ?? 0) },
                              ]}
                              options={{
                                chart: { toolbar: { show: false } },
                                xaxis: { categories: selectedSubject.assessmentHistory.map((a) => a.assessmentName) },
                                yaxis: { min: 0, max: 100, title: { text: '%' } },
                                stroke: { curve: 'smooth', width: 3 },
                                colors: ['#6366f1', '#22c55e'],
                                markers: { size: 4 },
                                dataLabels: { enabled: false },
                                legend: { position: 'top' },
                              }}
                            />
                          </div>

                          <div className="table-responsive mb-4">
                            <table className="table table-hover align-middle mb-0">
                              <thead>
                                <tr className="text-muted small">
                                  <th>Assessment</th>
                                  <th>Date</th>
                                  <th>Mark</th>
                                  <th>%</th>
                                  <th>Class Rank</th>
                                  <th>Class Average</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSubject.assessmentHistory.map((a) => (
                                  <tr key={a.assessmentId}>
                                    <td>{a.assessmentName}</td>
                                    <td className="text-muted small">{new Date(a.date).toLocaleDateString('en-GB')}</td>
                                    <td>{a.studentMark}/{a.total}</td>
                                    <td className="fw-semibold">{a.percentage.toFixed(1)}%</td>
                                    <td>{a.classRank}</td>
                                    <td>{a.classAverage != null ? `${a.classAverage.toFixed(1)}%` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      <div className="fw-semibold small mb-2">Topic Weakness</div>
                      {selectedSubject.topicSummaries.length === 0 ? (
                        <p className="text-muted small mb-0">No topic-level data yet for this subject.</p>
                      ) : (
                        <Chart
                          type="bar"
                          height={Math.max(140, selectedSubject.topicSummaries.length * 48)}
                          series={[{ name: 'Student Average %', data: selectedSubject.topicSummaries.map((t) => t.averageScore) }]}
                          options={{
                            chart: { toolbar: { show: false } },
                            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
                            xaxis: { categories: selectedSubject.topicSummaries.map((t) => t.topicName), min: 0, max: 100 },
                            colors: selectedSubject.topicSummaries.map((t) => (t.isWeak ? '#ef4444' : '#22c55e')),
                            dataLabels: { enabled: true, formatter: (v: number) => `${v}%` },
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              )
            )}

            {/* Academic Flags */}
            {activeTab === 'flags' && (
              summary.academicFlags.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No academic flags"
                  subtitle="No attendance/grade correlation or effort-outcome patterns have been detected for this student."
                />
              ) : (
                <div className="d-flex flex-column gap-2">
                  {summary.academicFlags.map((f, i) => (
                    <div key={i} className="border rounded-3 p-3 d-flex align-items-start gap-3">
                      <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-1" />
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                            {FLAG_TYPE_LABELS[f.type] ?? f.type}
                          </span>
                          <span className="badge bg-secondary-subtle text-secondary border">{f.subjectName}</span>
                        </div>
                        <div className="small">{f.description}</div>
                        <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                          {new Date(f.flaggedAt).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Attendance */}
            {activeTab === 'attendance' && (
              <div>
                <div className="d-flex flex-wrap gap-3 mb-4">
                  <div className="border rounded-3 px-3 py-2 flex-grow-1">
                    <div className="text-muted small">Overall Rate</div>
                    <div className="fw-bold fs-4">{summary.attendanceSummary.overallRate}%</div>
                  </div>
                  <div className="border rounded-3 px-3 py-2 flex-grow-1">
                    <div className="text-muted small">This Term</div>
                    <div className="fw-bold fs-4">{summary.attendanceSummary.thisTermRate}%</div>
                  </div>
                </div>

                {summary.attendanceSummary.monthlyBreakdown.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No attendance records yet"
                    subtitle="Monthly attendance will appear here once attendance is taken for this student."
                  />
                ) : (
                  <Chart
                    type="bar"
                    height={260}
                    series={[{ name: 'Attendance Rate %', data: summary.attendanceSummary.monthlyBreakdown.map((m) => m.rate) }]}
                    options={{
                      chart: { toolbar: { show: false } },
                      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
                      xaxis: { categories: summary.attendanceSummary.monthlyBreakdown.map((m) => formatMonth(m.month)) },
                      yaxis: { min: 0, max: 100, title: { text: '%' } },
                      colors: ['#6366f1'],
                      dataLabels: { enabled: false },
                      legend: { show: false },
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
