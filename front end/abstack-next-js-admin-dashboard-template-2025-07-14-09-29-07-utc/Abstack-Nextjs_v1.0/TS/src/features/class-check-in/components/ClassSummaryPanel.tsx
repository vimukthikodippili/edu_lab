'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, ChevronDown, ChevronUp, HeartPulse, TrendingUp, Users } from 'lucide-react'
import { useCurrentClassRoster } from '../hooks/useCurrentClassRoster'
import { useGradeTrends } from '@/features/grades/hooks/useGradeTrends'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Status tiers — same green/amber/red language already used throughout this app
// (e.g. live-class-monitor, assignment due-date badges). Color is always paired with
// a label here (bar category names + the caption row below), never carries meaning alone.
const TIER_GOOD = '#16a34a'
const TIER_WARN = '#c2410c'
const TIER_CRITICAL = '#dc2626'

function tierColor(percent: number): string {
  if (percent >= 75) return TIER_GOOD
  if (percent >= 50) return TIER_WARN
  return TIER_CRITICAL
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((sum, n) => sum + n, 0) / nums.length
}

export default function ClassSummaryPanel() {
  const [expanded, setExpanded] = useState(false)
  const { data: roster, isLoading: rosterLoading } = useCurrentClassRoster(true)

  const timetableEntry = roster?.timetableEntry ?? null
  const studentsWithNotes = (roster?.students ?? []).filter((s) => !!s.medicalNotes)

  const { data: trends = [], isLoading: trendsLoading } = useGradeTrends(
    timetableEntry?.classSectionId ?? null,
    timetableEntry?.subjectId ?? null,
  )

  const studentAverages = trends
    .map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      average: average(t.series.map((p) => p.percentScore)),
      hasData: t.series.length > 0,
    }))
    .filter((s) => s.hasData)
    .sort((a, b) => a.average - b.average)

  if (rosterLoading) return null
  if (!timetableEntry) return null

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
        style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)', cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="fw-bold text-white d-flex align-items-center gap-2">
          <Users size={16} />
          Class Summary — {timetableEntry.subjectName} · {timetableEntry.classSectionName}
        </span>
        <div className="d-flex align-items-center gap-2">
          {studentsWithNotes.length > 0 && (
            <span
              className="badge rounded-pill d-flex align-items-center gap-1 fw-semibold"
              style={{ background: 'rgba(255,255,255,0.9)', color: '#c2410c', fontSize: '0.75rem' }}
            >
              <AlertTriangle size={12} />
              {studentsWithNotes.length} health note{studentsWithNotes.length === 1 ? '' : 's'}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-white" /> : <ChevronDown size={16} className="text-white" />}
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          {/* ── Health / physical notes ─────────────────────────────────── */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <HeartPulse size={16} className="text-danger" />
              <span className="fw-semibold small">Things to be aware of</span>
            </div>
            {studentsWithNotes.length === 0 ? (
              <p className="text-muted small mb-0">Nothing flagged for this class — no known allergies, phobias, or physical notes.</p>
            ) : (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                {studentsWithNotes.map((s) => (
                  <li
                    key={s.id}
                    className="d-flex align-items-start gap-2 small rounded-3 p-2"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                  >
                    <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-1" />
                    <span>
                      <strong>{s.firstName} {s.lastName}</strong> ({s.admissionNumber}) — {s.medicalNotes}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Subject performance ─────────────────────────────────────── */}
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <span className="fw-semibold small">Performance in {timetableEntry.subjectName}</span>
            </div>
            {trendsLoading ? (
              <p className="text-muted small mb-0">Loading…</p>
            ) : studentAverages.length === 0 ? (
              <p className="text-muted small mb-0">No submitted marks for this class/subject yet this year.</p>
            ) : (
              <>
                <Chart
                  type="bar"
                  height={Math.max(160, studentAverages.length * 34)}
                  series={[{ name: 'Average score', data: studentAverages.map((s) => Math.round(s.average * 10) / 10) }]}
                  options={{
                    chart: { toolbar: { show: false } },
                    plotOptions: {
                      bar: { horizontal: true, distributed: true, borderRadius: 4, barHeight: '55%' },
                    },
                    colors: studentAverages.map((s) => tierColor(s.average)),
                    xaxis: { categories: studentAverages.map((s) => s.name), min: 0, max: 100 },
                    yaxis: { labels: { style: { fontSize: '11px' } } },
                    legend: { show: false },
                    dataLabels: { enabled: true, formatter: (v: number) => `${v}%` },
                    tooltip: { y: { formatter: (v: number) => `${v}%` } },
                  }}
                />
                <div className="d-flex align-items-center gap-3 mt-2">
                  <span className="d-flex align-items-center gap-1 small text-muted">
                    <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: TIER_GOOD }} />
                    75%+
                  </span>
                  <span className="d-flex align-items-center gap-1 small text-muted">
                    <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: TIER_WARN }} />
                    50–74%
                  </span>
                  <span className="d-flex align-items-center gap-1 small text-muted">
                    <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: TIER_CRITICAL }} />
                    Below 50%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
