'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Pencil, ChevronDown, ChevronUp, Users, Swords, ClipboardEdit, LineChart, Settings2 } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSports } from '@/features/sports/hooks/useSports'
import { useCreateSport } from '@/features/sports/hooks/useCreateSport'
import { useUpdateSport } from '@/features/sports/hooks/useUpdateSport'
import SportFormModal from '@/features/sports/components/SportFormModal'
import SportRosterPanel from '@/features/sports/components/SportRosterPanel'
import MatchHistoryList from '@/features/sports/components/MatchHistoryList'
import TrainingSessionList from '@/features/sports/components/TrainingSessionList'
import PerformanceTrendsTable from '@/features/sports/components/PerformanceTrendsTable'
import CoachAlertsPanel from '@/features/sports/components/CoachAlertsPanel'
import type { Sport, CreateSportPayload, UpdateSportPayload } from '@/types/sims/sports'

type SportsPanel = 'roster' | 'matches' | 'training' | 'trends'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function SportsSetupPage() {
  const { showNotification } = useNotificationContext()
  const { data: sports, isLoading } = useSports()
  const currentRole = useAuthStore((s) => s.user?.role)
  // Match creation/edit is Coach-or-(Admin/Principal) only — Section Head has read-only access here,
  // a deliberate asymmetry from sport/roster management which treats all three as privileged.
  const canManageMatches = currentRole === ROLES.SYSTEM_ADMIN || currentRole === ROLES.PRINCIPAL
  // GET /sports/alerts is Coach/Admin/Principal only — Section Head would 403, so the panel is
  // hidden for them here rather than rendered and silently failing.
  const canSeeCoachAlerts = currentRole === ROLES.SYSTEM_ADMIN || currentRole === ROLES.PRINCIPAL

  const [showModal, setShowModal] = useState(false)
  const [editingSport, setEditingSport] = useState<Sport | null>(null)
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

  const createMutation = useCreateSport()
  const updateMutation = useUpdateSport()

  const openCreate = () => { setEditingSport(null); setShowModal(true) }
  const openEdit = (sport: Sport) => { setEditingSport(sport); setShowModal(true) }

  const handleSubmit = (payload: CreateSportPayload | UpdateSportPayload) => {
    if (editingSport) {
      updateMutation.mutate(
        { id: editingSport.id, payload },
        {
          onSuccess: () => {
            showNotification({ variant: 'success', message: 'Sport updated.' })
            setShowModal(false)
          },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateSportPayload, {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Sport created.' })
          setShowModal(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      })
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <Trophy size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Sport Setup &amp; Management</h4>
            <p className="text-muted small mb-0">Create sports, assign coaches, and manage team rosters</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/sport-types" className="btn btn-outline-secondary btn-sm">
            <Settings2 size={14} className="me-1" /> Sport Types
          </Link>
          <button type="button" className="btn btn-sm text-white" style={{ background: '#f59e0b' }} onClick={openCreate}>
            + Add Sport
          </button>
        </div>
      </div>

      {canSeeCoachAlerts && <CoachAlertsPanel />}

      {isLoading && (
        <div className="placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 72 }} />
          ))}
        </div>
      )}

      {!isLoading && (sports?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">No sports created yet.</div>
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
                  <div className="small text-muted mb-1">
                    Coach: {sport.coach.firstName} {sport.coach.lastName}
                  </div>
                  <div className="small text-muted">
                    Season: {formatDate(sport.seasonStart)} – {formatDate(sport.seasonEnd)}
                  </div>
                  {sport.description && <p className="small mt-2 mb-0">{sport.description}</p>}
                </div>
                <div className="d-flex align-items-center gap-1 flex-shrink-0 flex-wrap">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(sport)}>
                    <Pencil size={14} className="me-1" /> Edit
                  </button>
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
                <MatchHistoryList sportId={sport.id} canManage={canManageMatches} />
              )}
              {expandedId === sport.id && expandedPanel === 'training' && (
                <TrainingSessionList sportId={sport.id} canManage={canManageMatches} />
              )}
              {expandedId === sport.id && expandedPanel === 'trends' && (
                <PerformanceTrendsTable sportId={sport.id} />
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <SportFormModal
          sport={editingSport}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

export default function AdminSportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <SportsSetupPage />
    </RoleGuard>
  )
}
