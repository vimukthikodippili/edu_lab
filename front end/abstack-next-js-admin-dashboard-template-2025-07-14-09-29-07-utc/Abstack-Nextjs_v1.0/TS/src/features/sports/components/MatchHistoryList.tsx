'use client'
import { useState } from 'react'
import { Pencil, CalendarDays, MapPin, Trophy, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useMatches } from '../hooks/useMatches'
import { useCreateMatch } from '../hooks/useCreateMatch'
import { useUpdateMatch } from '../hooks/useUpdateMatch'
import MatchFormModal from './MatchFormModal'
import PerformanceEntryGrid from './PerformanceEntryGrid'
import { MATCH_TYPE_LABELS, TEAM_RESULT_LABELS } from '@/types/sims/sports'
import type { Match, CreateMatchPayload, UpdateMatchPayload, TeamResult } from '@/types/sims/sports'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

const RESULT_COLORS: Record<TeamResult, { bg: string; text: string }> = {
  win: { bg: '#dcfce7', text: '#15803d' },
  loss: { bg: '#fee2e2', text: '#dc2626' },
  draw: { bg: '#fff7ed', text: '#c2410c' },
  no_result: { bg: '#f1f5f9', text: '#6b7280' },
}

function ResultBadge({ result }: { result: TeamResult }) {
  const { bg, text } = RESULT_COLORS[result]
  return (
    <span className="badge rounded-pill px-2 py-1 fw-bold" style={{ background: bg, color: text }}>
      {TEAM_RESULT_LABELS[result]}
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MatchHistoryList({
  sportId,
  canManage,
}: {
  sportId: string
  canManage: boolean
}) {
  const { showNotification } = useNotificationContext()
  const { data: matches, isLoading } = useMatches(sportId)

  const [showModal, setShowModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [expandedPerformanceMatchId, setExpandedPerformanceMatchId] = useState<string | null>(null)

  const createMutation = useCreateMatch(sportId)
  const updateMutation = useUpdateMatch(sportId)

  const openLog = () => { setEditingMatch(null); setShowModal(true) }
  const openEdit = (match: Match) => { setEditingMatch(match); setShowModal(true) }

  const handleSubmit = (payload: CreateMatchPayload | UpdateMatchPayload) => {
    if (editingMatch) {
      updateMutation.mutate(
        { matchId: editingMatch.id, payload },
        {
          onSuccess: () => {
            showNotification({ variant: 'success', message: 'Match updated.' })
            setShowModal(false)
          },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateMatchPayload, {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Match logged.' })
          setShowModal(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      })
    }
  }

  return (
    <div className="border-top pt-3 mt-2">
      {canManage && (
        <div className="d-flex justify-content-end mb-3">
          <button
            type="button"
            className="btn btn-sm text-white d-flex align-items-center gap-1"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            onClick={openLog}
          >
            <Trophy size={14} /> Log Match
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="placeholder-glow">
          <div className="placeholder col-12 rounded" style={{ height: 60 }} />
        </div>
      ) : (matches?.length ?? 0) === 0 ? (
        <p className="text-muted small mb-0">No matches logged yet.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {(matches ?? []).map((m) => (
            <div
              key={m.id}
              className="rounded-3 p-2 px-3"
              style={{ background: '#f8fafc', borderLeft: `4px solid ${RESULT_COLORS[m.teamResult].text}` }}
            >
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className="fw-semibold small">
                      {m.opponent ? `vs ${m.opponent}` : MATCH_TYPE_LABELS[m.matchType]}
                    </span>
                    <span className="badge bg-secondary bg-opacity-15 text-secondary" style={{ fontSize: '0.7rem' }}>
                      {MATCH_TYPE_LABELS[m.matchType]}
                    </span>
                    <ResultBadge result={m.teamResult} />
                    {m.teamScore && <span className="small text-muted fw-semibold">{m.teamScore}</span>}
                  </div>
                  <div className="d-flex align-items-center gap-3 text-muted" style={{ fontSize: '0.78rem' }}>
                    <span className="d-flex align-items-center gap-1">
                      <CalendarDays size={12} /> {formatDate(m.date)}
                    </span>
                    <span className="d-flex align-items-center gap-1">
                      <MapPin size={12} /> {m.venue}
                    </span>
                  </div>
                  {m.notes && <p className="small mt-1 mb-0 text-muted">{m.notes}</p>}
                </div>
                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                    title="Enter/view individual student performance"
                    onClick={() =>
                      setExpandedPerformanceMatchId(expandedPerformanceMatchId === m.id ? null : m.id)
                    }
                  >
                    <ClipboardList size={14} /> Performance
                    {expandedPerformanceMatchId === m.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-1 text-secondary"
                      title="Edit match"
                      onClick={() => openEdit(m)}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>
              {expandedPerformanceMatchId === m.id && (
                <PerformanceEntryGrid sportId={sportId} matchId={m.id} canManage={canManage} />
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <MatchFormModal
          match={editingMatch}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}
