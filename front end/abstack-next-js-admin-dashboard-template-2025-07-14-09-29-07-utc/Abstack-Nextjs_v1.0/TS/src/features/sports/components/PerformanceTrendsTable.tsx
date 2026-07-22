'use client'
import { Fragment } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { usePerformanceTrends } from '../hooks/usePerformanceTrends'
import { TREND_FLAG_LABELS, YEAR_ON_YEAR_FLAG_LABELS } from '@/types/sims/sports'
import type { SnapshotRow, TrendFlag, YearOnYearFlag } from '@/types/sims/sports'

const TREND_COLORS: Record<TrendFlag, { bg: string; text: string }> = {
  improving: { bg: '#dcfce7', text: '#15803d' },
  stable: { bg: '#f1f5f9', text: '#6b7280' },
  declining: { bg: '#fee2e2', text: '#dc2626' },
}

const TREND_ICONS: Record<TrendFlag, typeof TrendingUp> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
}

export function TrendBadge({ trend }: { trend: TrendFlag }) {
  const { bg, text } = TREND_COLORS[trend]
  const Icon = TREND_ICONS[trend]
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold d-inline-flex align-items-center gap-1"
      style={{ background: bg, color: text }}
    >
      <Icon size={11} /> {TREND_FLAG_LABELS[trend]}
    </span>
  )
}

const YOY_COLORS: Record<YearOnYearFlag, { bg: string; text: string }> = {
  better: { bg: '#dcfce7', text: '#15803d' },
  similar: { bg: '#f1f5f9', text: '#6b7280' },
  worse: { bg: '#fee2e2', text: '#dc2626' },
}

const YOY_ICONS: Record<YearOnYearFlag, typeof TrendingUp> = {
  better: TrendingUp,
  similar: Minus,
  worse: TrendingDown,
}

/** FR-P3-PA-05/06: this season vs the same student's last season, same colour language as the
 * weekly trend badge — a muted "No prior data" (not a false Similar) when the student has no
 * snapshot from last year to compare against, e.g. their first tracked season. */
export function YearOnYearBadge({ flag }: { flag: YearOnYearFlag | null }) {
  if (!flag) {
    return <span className="badge rounded-pill px-2 py-1 fw-normal text-muted" style={{ background: '#f8fafc' }}>No prior data</span>
  }
  const { bg, text } = YOY_COLORS[flag]
  const Icon = YOY_ICONS[flag]
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold d-inline-flex align-items-center gap-1"
      style={{ background: bg, color: text }}
    >
      <Icon size={11} /> {YEAR_ON_YEAR_FLAG_LABELS[flag]}
    </span>
  )
}

function formatNumber(n: number | null) {
  return n === null ? '—' : Number(n).toFixed(2)
}

function formatWeek(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PerformanceTrendsTable({ sportId }: { sportId: string }) {
  const { data: rows, isLoading } = usePerformanceTrends(sportId)

  if (isLoading) {
    return (
      <div className="border-top pt-3 mt-2 placeholder-glow">
        <div className="placeholder col-12 rounded" style={{ height: 80 }} />
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="border-top pt-3 mt-2">
        <p className="text-muted small mb-0">
          No performance trend data yet — trends compute weekly once matches have been submitted.
        </p>
      </div>
    )
  }

  const byStudent = new Map<string, SnapshotRow[]>()
  for (const row of rows) {
    const list = byStudent.get(row.studentId) ?? []
    list.push(row)
    byStudent.set(row.studentId, list)
  }

  return (
    <div className="border-top pt-3 mt-2">
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr className="small text-muted">
              <th style={{ minWidth: 160 }}>Student / Metric</th>
              <th>Trend</th>
              <th>Rolling Avg (last 4)</th>
              <th>Season Avg</th>
              <th>Personal Best</th>
              <th>Last Season Avg</th>
              <th>Year-on-Year</th>
              <th className="text-muted">As of</th>
            </tr>
          </thead>
          <tbody>
            {[...byStudent.entries()].map(([studentId, studentRows]) => (
              <Fragment key={studentId}>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={8} className="fw-bold small">
                    {studentRows[0].firstName} {studentRows[0].lastName}{' '}
                    <span className="text-muted fw-normal">({studentRows[0].admissionNumber})</span>
                  </td>
                </tr>
                {studentRows.map((row) => (
                  <tr key={`${studentId}-${row.metricName}`}>
                    <td className="small ps-4 text-muted">{row.metricName}</td>
                    <td><TrendBadge trend={row.trendFlag} /></td>
                    <td className="small">{formatNumber(row.rollingAvg)}</td>
                    <td className="small">{formatNumber(row.seasonAvg)}</td>
                    <td className="small fw-semibold">{formatNumber(row.personalBest)}</td>
                    <td className="small">{formatNumber(row.lastSeasonAvg)}</td>
                    <td><YearOnYearBadge flag={row.yearOnYearFlag} /></td>
                    <td className="small text-muted">{formatWeek(row.weekEnding)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
