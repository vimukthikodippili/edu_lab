'use client'
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useSchoolSportsDashboard } from '@/features/sports/hooks/useSchoolSportsDashboard'
import type { SchoolDashboardSportRow } from '@/types/sims/sports'

function formatWinRate(rate: number | null): string {
  return rate === null ? '—' : `${(rate * 100).toFixed(0)}%`
}

function WinRateStat({ label, rate }: { label: string; rate: number | null }) {
  return (
    <div className="d-flex flex-column align-items-center px-3 py-2 rounded-3 bg-light">
      <span className="fw-bold fs-5">{formatWinRate(rate)}</span>
      <span className="text-muted" style={{ fontSize: '0.7rem' }}>{label}</span>
    </div>
  )
}

function WinRateComparison({ thisSeason, lastSeason }: { thisSeason: number | null; lastSeason: number | null }) {
  const delta = thisSeason !== null && lastSeason !== null ? thisSeason - lastSeason : null
  return (
    <div className="d-flex align-items-center gap-3">
      <WinRateStat label="This season" rate={thisSeason} />
      <WinRateStat label="Last season" rate={lastSeason} />
      {delta !== null && (
        <span
          className={`d-inline-flex align-items-center gap-1 small fw-semibold ${
            delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted'
          }`}
        >
          {delta > 0 ? <TrendingUp size={14} /> : delta < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
          {delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(0)} pts`}
        </span>
      )}
    </div>
  )
}

function TopPerformersList({ topPerformersByMetric }: { topPerformersByMetric: SchoolDashboardSportRow['topPerformersByMetric'] }) {
  if (topPerformersByMetric.length === 0) {
    return <p className="text-muted small mb-0">No season averages recorded yet.</p>
  }
  return (
    <div className="d-flex flex-column gap-3">
      {topPerformersByMetric.map((metric) => (
        <div key={metric.metricName}>
          <span className="fw-semibold small d-block mb-1">{metric.metricName}</span>
          <div className="d-flex flex-column gap-1">
            {metric.topPerformers.map((p, i) => (
              <div key={p.studentId} className="d-flex align-items-center gap-2 small">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                  style={{
                    width: 20,
                    height: 20,
                    fontSize: '0.65rem',
                    background: i === 0 ? '#fef3c7' : i === 1 ? '#e5e7eb' : '#fed7aa',
                    color: i === 0 ? '#92400e' : i === 1 ? '#374151' : '#9a3412',
                  }}
                >
                  {i + 1}
                </span>
                <span>{p.firstName} {p.lastName}</span>
                <span className="text-muted">({p.admissionNumber})</span>
                <span className="fw-semibold ms-auto">{p.seasonAvg.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function YearOnYearDistribution({ distribution }: { distribution: SchoolDashboardSportRow['yearOnYearDistribution'] }) {
  return (
    <div className="d-flex flex-wrap gap-2">
      <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#dcfce7', color: '#15803d' }}>
        {distribution.better} Better
      </span>
      <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#fee2e2', color: '#dc2626' }}>
        {distribution.worse} Worse
      </span>
      <span className="badge rounded-pill px-2 py-1 fw-semibold" style={{ background: '#f1f5f9', color: '#6b7280' }}>
        {distribution.similar} Similar
      </span>
      <span className="badge rounded-pill px-2 py-1 fw-normal text-muted" style={{ background: '#f8fafc' }}>
        {distribution.noData} No data
      </span>
    </div>
  )
}

function SportCard({ sport }: { sport: SchoolDashboardSportRow }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
          >
            <Medal size={18} className="text-white" />
          </div>
          <h6 className="mb-0 fw-bold">{sport.sportName}</h6>
        </div>

        <div className="mb-4">
          <span className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>Team Win Rate</span>
          <WinRateComparison thisSeason={sport.thisSeasonWinRate} lastSeason={sport.lastSeasonWinRate} />
        </div>

        <div className="mb-4">
          <span className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>Top Performers</span>
          <TopPerformersList topPerformersByMetric={sport.topPerformersByMetric} />
        </div>

        <div>
          <span className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>Year-on-Year Trend Distribution</span>
          <YearOnYearDistribution distribution={sport.yearOnYearDistribution} />
        </div>
      </div>
    </div>
  )
}

export default function SportsDashboardContent() {
  const { data: sports, isLoading } = useSchoolSportsDashboard()

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <Trophy size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">School Sports Dashboard</h4>
          <p className="text-muted small mb-0">
            Year-on-year team win rates, top performers per metric, and trend distribution across every sport
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="row g-4 placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="placeholder col-6 mb-3 rounded" style={{ height: 24 }} />
                  <div className="placeholder col-12 rounded" style={{ height: 180 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!sports || sports.length === 0) && (
        <div className="py-5 text-center text-muted">
          <Trophy size={40} className="mb-3 opacity-25" />
          <p className="fw-semibold mb-1">No sports have been set up yet</p>
        </div>
      )}

      {!isLoading && sports && sports.length > 0 && (
        <div className="row g-4">
          {sports.map((sport) => (
            <div key={sport.sportId} className="col-md-6 col-xl-4">
              <SportCard sport={sport} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
