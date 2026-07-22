'use client'
import { Trophy, Medal } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { usePublicSportsBoard } from '@/features/sports/hooks/usePublicSportsBoard'
import { MATCH_TYPE_LABELS, TEAM_RESULT_LABELS } from '@/types/sims/sports'
import type { PublicSportsBoardRow, PublicMatchResult } from '@/types/sims/sports'

const ALL_ROLES = Object.values(ROLES)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const RESULT_COLORS: Record<string, { bg: string; text: string }> = {
  win: { bg: '#dcfce7', text: '#15803d' },
  loss: { bg: '#fee2e2', text: '#dc2626' },
  draw: { bg: '#fef9c3', text: '#a16207' },
  no_result: { bg: '#f1f5f9', text: '#6b7280' },
}

function ResultBadge({ result }: { result: PublicMatchResult['teamResult'] }) {
  const { bg, text } = RESULT_COLORS[result]
  return (
    <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ background: bg, color: text }}>
      {TEAM_RESULT_LABELS[result]}
    </span>
  )
}

function MatchResultsList({ matchResults }: { matchResults: PublicMatchResult[] }) {
  if (matchResults.length === 0) {
    return <p className="text-muted small mb-0">No match results yet this season.</p>
  }
  return (
    <div className="d-flex flex-column gap-2">
      {matchResults.map((m) => (
        <div key={m.matchId} className="d-flex align-items-center gap-2 small flex-wrap">
          <span className="text-muted" style={{ minWidth: 90 }}>{formatDate(m.date)}</span>
          <span className="fw-semibold">{m.opponent ?? 'Internal'}</span>
          <span className="text-muted">({MATCH_TYPE_LABELS[m.matchType]})</span>
          <ResultBadge result={m.teamResult} />
          {m.teamScore && <span className="text-muted">{m.teamScore}</span>}
        </div>
      ))}
    </div>
  )
}

function TopPerformersList({ topPerformersByMetric }: { topPerformersByMetric: PublicSportsBoardRow['topPerformersByMetric'] }) {
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
              <div key={`${p.firstName}-${p.lastName}-${i}`} className="d-flex align-items-center gap-2 small">
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SportBoardCard({ sport }: { sport: PublicSportsBoardRow }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
      >
        <Medal size={18} className="text-white" />
        <span className="fw-bold text-white">{sport.sportName}</span>
        <span className="text-white-50 small">{sport.sportType}</span>
      </div>
      <div className="card-body">
        <span className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>Match Results</span>
        <MatchResultsList matchResults={sport.matchResults} />

        <hr />

        <span className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>Top Performers</span>
        <TopPerformersList topPerformersByMetric={sport.topPerformersByMetric} />
      </div>
    </div>
  )
}

function PublicSportsBoardContent() {
  const { data: sports, isLoading, error } = usePublicSportsBoard()
  const isDisabled = (error as { response?: { status?: number } } | null)?.response?.status === 404

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <Trophy size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">School Sports Board</h4>
          <p className="text-muted small mb-0">Team match results and top performers — the school-wide public view</p>
        </div>
      </div>

      {isLoading && (
        <div className="row g-4 placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="placeholder col-6 mb-3 rounded" style={{ height: 24 }} />
                  <div className="placeholder col-12 rounded" style={{ height: 160 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && isDisabled && (
        <div className="py-5 text-center text-muted">
          <Trophy size={40} className="mb-3 opacity-25" />
          <p className="fw-semibold mb-1">The sports board isn&rsquo;t available right now</p>
          <p className="small mb-0">Ask an Admin or Principal to enable it in School Settings.</p>
        </div>
      )}

      {!isLoading && !isDisabled && (!sports || sports.length === 0) && (
        <div className="py-5 text-center text-muted">
          <Trophy size={40} className="mb-3 opacity-25" />
          <p className="fw-semibold mb-1">No sports have been set up yet</p>
        </div>
      )}

      {!isLoading && !isDisabled && sports && sports.length > 0 && (
        <div className="row g-4">
          {sports.map((sport) => (
            <div key={sport.sportId} className="col-md-6 col-xl-4">
              <SportBoardCard sport={sport} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PublicSportsBoardPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <PublicSportsBoardContent />
    </RoleGuard>
  )
}
