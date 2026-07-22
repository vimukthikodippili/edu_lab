'use client'
import { useState } from 'react'
import { Users } from 'lucide-react'
import { useSportRoster } from '../hooks/useSportRoster'
import type {
  TrainingSession,
  CreateTrainingSessionPayload,
  UpdateTrainingSessionPayload,
} from '@/types/sims/sports'

interface TrainingSessionFormModalProps {
  sportId: string
  session: TrainingSession | null
  onClose: () => void
  onSubmit: (payload: CreateTrainingSessionPayload | UpdateTrainingSessionPayload) => void
  isPending: boolean
}

export default function TrainingSessionFormModal({
  sportId,
  session,
  onClose,
  onSubmit,
  isPending,
}: TrainingSessionFormModalProps) {
  const { data: rosterData } = useSportRoster(sportId)
  const roster = rosterData?.roster ?? []

  const [date, setDate] = useState(session?.date?.slice(0, 10) ?? '')
  const [description, setDescription] = useState(session?.description ?? '')
  const [attendeeIds, setAttendeeIds] = useState<string[]>(session?.attendeeStudentIds ?? [])
  const [leaderId, setLeaderId] = useState(session?.sessionLeaderStudentId ?? '')

  const isValid = date && description.trim() && attendeeIds.length > 0

  const toggleAttendee = (studentId: string) => {
    setAttendeeIds((prev) => {
      const next = prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
      if (leaderId && !next.includes(leaderId)) setLeaderId('')
      return next
    })
  }

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      date,
      description: description.trim(),
      attendeeStudentIds: attendeeIds,
      sessionLeaderStudentId: leaderId || undefined,
    })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{session ? 'Edit Training Session' : 'Log Training Session'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">What happened / what did they do</label>
                <textarea
                  className="form-control"
                  rows={3}
                  maxLength={2000}
                  placeholder="e.g. Ran fielding drills and net practice for 90 minutes."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small d-flex align-items-center gap-2">
                  <Users size={14} /> Attendees
                </label>
                {roster.length === 0 ? (
                  <p className="text-muted small mb-0">No students enrolled on this sport's roster yet.</p>
                ) : (
                  <div
                    className="border rounded-2 p-2"
                    style={{ maxHeight: 180, overflowY: 'auto', background: '#f8fafc' }}
                  >
                    {roster.map((r) => (
                      <div key={r.studentId} className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`attendee-${r.studentId}`}
                          checked={attendeeIds.includes(r.studentId)}
                          onChange={() => toggleAttendee(r.studentId)}
                        />
                        <label
                          className="form-check-label small"
                          htmlFor={`attendee-${r.studentId}`}
                        >
                          {r.firstName} {r.lastName} <span className="text-muted">({r.admissionNumber})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-1">
                <label className="form-label fw-semibold small">Session Leader (optional)</label>
                <select
                  className="form-select"
                  value={leaderId}
                  disabled={attendeeIds.length === 0}
                  onChange={(e) => setLeaderId(e.target.value)}
                >
                  <option value="">No leader designated</option>
                  {roster
                    .filter((r) => attendeeIds.includes(r.studentId))
                    .map((r) => (
                      <option key={r.studentId} value={r.studentId}>
                        {r.firstName} {r.lastName}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : session ? 'Save Changes' : 'Log Session'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
