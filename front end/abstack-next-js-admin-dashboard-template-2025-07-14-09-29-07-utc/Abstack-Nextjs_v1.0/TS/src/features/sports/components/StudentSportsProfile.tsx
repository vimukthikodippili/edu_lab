'use client'
import { Trophy, Medal } from 'lucide-react'
import { useMySportsPerformance } from '../hooks/useMySportsPerformance'
import { TrendBadge, YearOnYearBadge } from './PerformanceTrendsTable'
import {
  MATCH_TYPE_LABELS,
  TEAM_RESULT_LABELS,
} from '@/types/sims/sports'
import type { StudentSportProfile, MatchHistoryRow, StudentMetricSnapshot } from '@/types/sims/sports'

function formatNumber(n: number | null) {
  return n === null ? '—' : Number(n).toFixed(2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const RESULT_COLORS: Record<string, { bg: string; text: string }> = {
  win: { bg: '#dcfce7', text: '#15803d' },
  loss: { bg: '#fee2e2', text: '#dc2626' },
  draw: { bg: '#fef9c3', text: '#a16207' },
  no_result: { bg: '#f1f5f9', text: '#6b7280' },
}

function ResultBadge({ result }: { result: MatchHistoryRow['teamResult'] }) {
  const { bg, text } = RESULT_COLORS[result]
  return (
    <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ background: bg, color: text }}>
      {TEAM_RESULT_LABELS[result]}
    </span>
  )
}

function MetricSnapshotRow({ snapshot }: { snapshot: StudentMetricSnapshot }) {
  return (
    <tr>
      <td className="small ps-4 text-muted">{snapshot.metricName}</td>
      <td><TrendBadge trend={snapshot.trendFlag} /></td>
      <td className="small">{formatNumber(snapshot.seasonAvg)}</td>
      <td className="small fw-semibold">{formatNumber(snapshot.personalBest)}</td>
      <td className="small">{formatNumber(snapshot.lastSeasonAvg)}</td>
      <td><YearOnYearBadge flag={snapshot.yearOnYearFlag} /></td>
    </tr>
  )
}

function MatchHistoryTable({ matchHistory }: { matchHistory: MatchHistoryRow[] }) {
  if (matchHistory.length === 0) {
    return <p className="text-muted small mb-0">No submitted match results yet this season.</p>
  }

  const metricNames = [...new Set(matchHistory.flatMap((m) => Object.keys(m.metricValues)))]

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr className="small text-muted">
            <th>Date</th>
            <th>Opponent</th>
            <th>Venue</th>
            <th>Type</th>
            <th>Result</th>
            {metricNames.map((name) => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matchHistory.map((m) => (
            <tr key={m.matchId}>
              <td className="small">{formatDate(m.date)}</td>
              <td className="small">{m.opponent ?? '—'}</td>
              <td className="small text-muted">{m.venue}</td>
              <td className="small text-muted">{MATCH_TYPE_LABELS[m.matchType]}</td>
              <td><ResultBadge result={m.teamResult} /></td>
              {metricNames.map((name) => (
                <td key={name} className="small fw-semibold">
                  {m.metricValues[name] ?? '—'}
                  {m.personalBests[name] && (
                    <Medal size={12} className="text-warning ms-1" aria-label="Personal best" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SportProfileCard({ profile }: { profile: StudentSportProfile }) {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
      >
        <Trophy size={18} className="text-white" />
        <span className="fw-bold text-white">{profile.sport.name}</span>
        <span className="text-white-50 small">{profile.sport.sportType.name}</span>
      </div>
      <div className="card-body">
        <span className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>Match History</span>
        <MatchHistoryTable matchHistory={profile.matchHistory} />

        {profile.metricSnapshots.length > 0 && (
          <>
            <hr />
            <span className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>
              Trend &amp; Year-on-Year (latest week)
            </span>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr className="small text-muted">
                    <th>Metric</th>
                    <th>Trend</th>
                    <th>Season Avg</th>
                    <th>Personal Best</th>
                    <th>Last Season Avg</th>
                    <th>Year-on-Year</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.metricSnapshots.map((s) => (
                    <MetricSnapshotRow key={s.metricName} snapshot={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function StudentSportsProfile({
  studentId,
}: {
  /** Omit entirely for a student's own self-view; pass the selected child's id (or `null`
   * before one is picked, which disables the query) for a guardian's view. */
  studentId?: string | null
}) {
  const { data: profiles, isLoading } = useMySportsPerformance(studentId, studentId !== null)

  if (studentId === null) {
    return null
  }

  if (isLoading) {
    return (
      <div className="placeholder-glow">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="placeholder col-4 mb-3 rounded" style={{ height: 24 }} />
              <div className="placeholder col-12 rounded" style={{ height: 140 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="py-5 text-center text-muted">
        <Trophy size={40} className="mb-3 opacity-25" />
        <p className="fw-semibold mb-1">Not enrolled in any sports yet</p>
      </div>
    )
  }

  return (
    <div>
      {profiles.map((profile) => (
        <SportProfileCard key={profile.sport.id} profile={profile} />
      ))}
    </div>
  )
}
