'use client'
import { useState } from 'react'
import { MATCH_TYPES, MATCH_TYPE_LABELS, TEAM_RESULTS, TEAM_RESULT_LABELS } from '@/types/sims/sports'
import type { Match, MatchType, TeamResult, CreateMatchPayload, UpdateMatchPayload } from '@/types/sims/sports'

interface MatchFormModalProps {
  match: Match | null
  onClose: () => void
  onSubmit: (payload: CreateMatchPayload | UpdateMatchPayload) => void
  isPending: boolean
}

export default function MatchFormModal({ match, onClose, onSubmit, isPending }: MatchFormModalProps) {
  const [date, setDate] = useState(match?.date?.slice(0, 10) ?? '')
  const [opponent, setOpponent] = useState(match?.opponent ?? '')
  const [venue, setVenue] = useState(match?.venue ?? '')
  const [matchType, setMatchType] = useState<MatchType>(match?.matchType ?? 'friendly')
  const [teamResult, setTeamResult] = useState<TeamResult>(match?.teamResult ?? 'no_result')
  const [teamScore, setTeamScore] = useState(match?.teamScore ?? '')
  const [notes, setNotes] = useState(match?.notes ?? '')

  const isValid = date && venue.trim()

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      date,
      opponent: opponent.trim() || undefined,
      venue: venue.trim(),
      matchType,
      teamResult,
      teamScore: teamScore.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{match ? 'Edit Match' : 'Log Match'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Match Type</label>
                  <select
                    className="form-select"
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as MatchType)}
                  >
                    {MATCH_TYPES.map((t) => (
                      <option key={t} value={t}>{MATCH_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Opponent (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Royal College"
                    value={opponent}
                    maxLength={120}
                    onChange={(e) => setOpponent(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Venue</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Home Ground"
                    value={venue}
                    maxLength={120}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Team Result</label>
                  <select
                    className="form-select"
                    value={teamResult}
                    onChange={(e) => setTeamResult(e.target.value as TeamResult)}
                  >
                    {TEAM_RESULTS.map((r) => (
                      <option key={r} value={r}>{TEAM_RESULT_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Team Score (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2-1"
                    value={teamScore}
                    maxLength={50}
                    onChange={(e) => setTeamScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-1">
                <label className="form-label fw-semibold small">Notes (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. Rained in the second half, match shortened."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : match ? 'Save Changes' : 'Log Match'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
