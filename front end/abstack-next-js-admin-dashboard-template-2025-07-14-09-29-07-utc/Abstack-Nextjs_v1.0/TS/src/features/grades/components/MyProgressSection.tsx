'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, TrendingDown, Minus, Award, LineChart as LineChartIcon } from 'lucide-react'
import { usePerformanceTrend } from '../hooks/usePerformanceTrend'
import type { SubjectTrend, PerformanceTrendDirection } from '@/types/sims/grades'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

function TrendBadge({ trend }: { trend: PerformanceTrendDirection }) {
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

function SubjectProgressChart({ subject }: { subject: SubjectTrend }) {
  const allTerms = subject.yearlyTrends.flatMap((y) => y.termTrends)
  if (allTerms.length === 0) return null

  const categories = allTerms.map((t) => t.termLabel)
  // ApexCharts crashes ("Cannot create property 'rangeName' on number") when a combo chart
  // mixes plain-number line-series data with rangeArea's {x,y:[low,high]} object data — every
  // series must use the same {x,y} object shape for the combo to render at all.
  const studentSeries = allTerms.map((t) => ({ x: t.termLabel, y: t.studentAverage ?? 0 }))
  const classSeries = allTerms.map((t) => ({ x: t.termLabel, y: t.classAverage ?? 0 }))

  // Two rangeArea bands (green = student above class avg, red = below) shade the region
  // between the two lines; zero-height points collapse to invisible where the condition
  // doesn't hold for that term, so only the relevant side ever shows a fill.
  const aboveBand = allTerms.map((t) => {
    const s = t.studentAverage
    const c = t.classAverage
    if (s === null || c === null || s < c) return { x: t.termLabel, y: [c ?? 0, c ?? 0] }
    return { x: t.termLabel, y: [c, s] }
  })
  const belowBand = allTerms.map((t) => {
    const s = t.studentAverage
    const c = t.classAverage
    if (s === null || c === null || s >= c) return { x: t.termLabel, y: [c ?? 0, c ?? 0] }
    return { x: t.termLabel, y: [s, c] }
  })

  return (
    <Chart
      type="rangeArea"
      height={300}
      series={[
        { name: 'Above Class Avg', type: 'rangeArea', data: aboveBand },
        { name: 'Below Class Avg', type: 'rangeArea', data: belowBand },
        { name: 'Your Average', type: 'line', data: studentSeries },
        { name: 'Class Average', type: 'line', data: classSeries },
      ]}
      options={{
        chart: { toolbar: { show: false } },
        xaxis: { categories, labels: { rotate: -45, style: { fontSize: '11px' } } },
        yaxis: { min: 0, max: 100, title: { text: '%' } },
        colors: ['rgba(34,197,94,0.25)', 'rgba(239,68,68,0.25)', '#6366f1', '#94a3b8'],
        stroke: { curve: 'smooth', width: [0, 0, 3, 2], dashArray: [0, 0, 0, 6] },
        markers: { size: [0, 0, 4, 0] },
        legend: { position: 'top' },
        dataLabels: { enabled: false },
        tooltip: { shared: true, intersect: false },
      }}
    />
  )
}

function TopicMiniChart({ topicName, values, categories }: { topicName: string; values: number[]; categories: string[] }) {
  return (
    <div className="col-md-6">
      <div className="border rounded-3 p-3 h-100">
        <div className="fw-semibold small mb-2">{topicName}</div>
        <Chart
          type="line"
          height={140}
          series={[{ name: topicName, data: values }]}
          options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories, labels: { style: { fontSize: '10px' } } },
            yaxis: { min: 0, max: 100 },
            stroke: { curve: 'smooth', width: 3 },
            colors: ['#6366f1'],
            markers: { size: 3 },
            dataLabels: { enabled: false },
            legend: { show: false },
          }}
        />
      </div>
    </div>
  )
}

function SubjectProgress({ subject }: { subject: SubjectTrend }) {
  const allTerms = subject.yearlyTrends.flatMap((y) => y.termTrends)
  const categories = allTerms.map((t) => t.termLabel)

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">{subject.subjectName}</span>
          <TrendBadge trend={subject.overallTrend} />
        </div>
        {subject.personalBestTerm && (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-1">
            <Award size={12} />
            Best: {subject.personalBestTerm.termLabel} — {subject.personalBestTerm.average.toFixed(1)}%
          </span>
        )}
      </div>

      {allTerms.length === 0 ? (
        <p className="text-muted small mb-0">No term history yet for this subject.</p>
      ) : (
        <SubjectProgressChart subject={subject} />
      )}

      {subject.topicTrends.length > 0 && (
        <div className="mt-4">
          <div className="fw-semibold small mb-2 d-flex align-items-center gap-2">
            <LineChartIcon size={14} /> Topic Progress
          </div>
          <div className="row g-3">
            {subject.topicTrends.map((tt) => {
              const values = allTerms.map((t) => {
                const row = t.topicBreakdown.find((tb) => tb.subjectTopicId === tt.subjectTopicId)
                return row ? row.studentAverage : 0
              })
              return (
                <TopicMiniChart key={tt.subjectTopicId} topicName={tt.topicName} values={values} categories={categories} />
              )
            })}
          </div>
        </div>
      )}

      {subject.weakTopicsCurrently.length > 0 && (
        <div className="mt-4">
          <div className="fw-semibold small mb-2">Where extra practice may help</div>
          <div className="d-flex flex-column gap-2">
            {subject.weakTopicsCurrently.map((w) => (
              <div key={w.subjectTopicId} className="border rounded-3 p-2 small">
                <span className="fw-semibold">{w.topicName}</span> — {w.currentAverage.toFixed(1)}% recently.{' '}
                <span className="text-muted">{w.recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  studentId: string
  title?: string
}

export function MyProgressSection({ studentId, title = 'My Progress' }: Props) {
  const { data, isLoading, isError } = usePerformanceTrend(studentId)
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)

  const subjects = data?.subjects ?? []
  const active = subjects.find((s) => s.subjectId === activeSubjectId) ?? subjects[0]

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <span className="fw-bold text-white">{title}</span>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="placeholder-glow">
            <span className="placeholder col-12 rounded" style={{ height: 220 }} />
          </div>
        ) : isError ? (
          <div className="alert alert-danger py-2 small mb-0">Failed to load progress history. Please refresh.</div>
        ) : subjects.length === 0 ? (
          <div className="text-center text-muted py-4">
            <LineChartIcon size={32} className="mb-2 opacity-25" />
            <p className="mb-0 small">No multi-term history yet — progress will appear here once more terms are complete.</p>
          </div>
        ) : (
          <>
            <div className="d-flex gap-2 mb-4 flex-wrap">
              {subjects.map((s) => (
                <button
                  key={s.subjectId}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-semibold ${active?.subjectId === s.subjectId ? 'text-white' : 'btn-outline-secondary'}`}
                  style={active?.subjectId === s.subjectId ? { background: 'var(--edulab-accent)', border: 'none' } : undefined}
                  onClick={() => setActiveSubjectId(s.subjectId)}
                >
                  {s.subjectName}
                </button>
              ))}
            </div>
            {active && <SubjectProgress subject={active} />}
          </>
        )}
      </div>
    </div>
  )
}
