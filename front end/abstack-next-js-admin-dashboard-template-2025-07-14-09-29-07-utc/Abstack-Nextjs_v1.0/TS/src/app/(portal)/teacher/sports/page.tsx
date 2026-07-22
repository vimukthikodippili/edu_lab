'use client'
import { useState } from 'react'
import { Trophy, Users, ChevronDown, ChevronUp, Swords, ClipboardEdit, LineChart } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyCoachedSports } from '@/features/sports/hooks/useMyCoachedSports'
import SportRosterPanel from '@/features/sports/components/SportRosterPanel'
import MatchHistoryList from '@/features/sports/components/MatchHistoryList'
import TrainingSessionList from '@/features/sports/components/TrainingSessionList'
import PerformanceTrendsTable from '@/features/sports/components/PerformanceTrendsTable'
import CoachAlertsPanel from '@/features/sports/components/CoachAlertsPanel'

type SportsPanel = 'roster' | 'matches' | 'training' | 'trends'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function MyCoachedSportsPage() {
  const { data: sports, isLoading } = useMyCoachedSports()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedPanel, setExpandedPanel] = useState<SportsPanel>('roster')

  const togglePanel = (sportId: string, panel: SportsPanel) => {
    if (expandedId === sportId && expandedPanel === panel) {
      setExpandedId(null)
    } else {
      setExpandedId(sportId)
      setExpandedPanel(panel)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
        >
          <Trophy size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">My Sports Teams</h4>
          <p className="text-muted small mb-0">Manage the roster, matches, training sessions, and trends for the sport(s) you coach</p>
        </div>
      </div>

      <CoachAlertsPanel />

      {isLoading && (
        <div className="placeholder-glow">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 72 }} />
          ))}
        </div>
      )}

      {!isLoading && (sports?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            You are not currently assigned as coach for any sport.
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {(sports ?? []).map((sport) => (
          <div key={sport.id} className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-semibold">{sport.name}</span>
                    <span className="badge bg-secondary bg-opacity-15 text-secondary">
                      {sport.sportType.name}
                    </span>
                  </div>
                  <div className="small text-muted">
                    Season: {formatDate(sport.seasonStart)} – {formatDate(sport.seasonEnd)}
                  </div>
                  {sport.description && <p className="small mt-2 mb-0">{sport.description}</p>}
                </div>
                <div className="d-flex align-items-center gap-1 flex-shrink-0 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => togglePanel(sport.id, 'roster')}
                  >
                    <Users size={14} className="me-1" /> Roster
                    {expandedId === sport.id && expandedPanel === 'roster'
                      ? <ChevronUp size={14} className="ms-1" />
                      : <ChevronDown size={14} className="ms-1" />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => togglePanel(sport.id, 'matches')}
                  >
                    <Swords size={14} className="me-1" /> Matches
                    {expandedId === sport.id && expandedPanel === 'matches'
                      ? <ChevronUp size={14} className="ms-1" />
                      : <ChevronDown size={14} className="ms-1" />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => togglePanel(sport.id, 'training')}
                  >
                    <ClipboardEdit size={14} className="me-1" /> Training Sessions
                    {expandedId === sport.id && expandedPanel === 'training'
                      ? <ChevronUp size={14} className="ms-1" />
                      : <ChevronDown size={14} className="ms-1" />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => togglePanel(sport.id, 'trends')}
                  >
                    <LineChart size={14} className="me-1" /> Trends
                    {expandedId === sport.id && expandedPanel === 'trends'
                      ? <ChevronUp size={14} className="ms-1" />
                      : <ChevronDown size={14} className="ms-1" />}
                  </button>
                </div>
              </div>
              {expandedId === sport.id && expandedPanel === 'roster' && <SportRosterPanel sportId={sport.id} />}
              {expandedId === sport.id && expandedPanel === 'matches' && (
                <MatchHistoryList sportId={sport.id} canManage />
              )}
              {expandedId === sport.id && expandedPanel === 'training' && (
                <TrainingSessionList sportId={sport.id} canManage />
              )}
              {expandedId === sport.id && expandedPanel === 'trends' && (
                <PerformanceTrendsTable sportId={sport.id} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TeacherSportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <MyCoachedSportsPage />
    </RoleGuard>
  )
}
