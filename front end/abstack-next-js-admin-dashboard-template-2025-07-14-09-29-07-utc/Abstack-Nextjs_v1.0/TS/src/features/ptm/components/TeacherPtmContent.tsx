'use client'
import { useState } from 'react'
import { CalendarClock, Clock, Users } from 'lucide-react'
import { usePtmEvents } from '../hooks/usePtmEvents'
import { useSubmitAvailability } from '../hooks/useSubmitAvailability'
import { useTeacherPtmSchedule } from '../hooks/useTeacherPtmSchedule'
import { useNotificationContext } from '@/context/useNotificationContext'

export function TeacherPtmContent() {
  const { data: events, isLoading } = usePtmEvents()
  const submitAvailability = useSubmitAvailability()
  const { showNotification } = useNotificationContext()

  const [selectedEventId, setSelectedEventId] = useState('')
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('16:00')

  const { data: schedule, isLoading: scheduleLoading } = useTeacherPtmSchedule(selectedEventId || null)

  const selectedEvent = events?.find((e) => e.id === selectedEventId)

  const handleSubmit = () => {
    if (!selectedEventId) return
    submitAvailability.mutate(
      { eventId: selectedEventId, payload: { startTime, endTime } },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Availability saved.' }),
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not save availability.' }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <CalendarClock size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Parent-Teacher Meetings</h4>
          <p className="text-muted small mb-0">Confirm your available window, then view your booked meetings.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <label className="form-label small fw-semibold">PTM Event</label>
          <select className="form-select" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} disabled={isLoading}>
            <option value="">{isLoading ? 'Loading…' : 'Choose an event…'}</option>
            {events?.map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {e.date} ({e.status})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedEvent?.status === 'draft' && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2"><Clock size={16} /> Your Available Window</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-semibold">From</label>
                <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">To</label>
                <input type="time" className="form-control" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button type="button" className="btn btn-primary w-100" disabled={submitAvailability.isPending} onClick={handleSubmit}>
                  {submitAvailability.isPending ? 'Saving…' : 'Confirm Availability'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEvent?.status === 'published' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <span className="fw-bold text-white d-flex align-items-center gap-2"><Users size={16} /> Your Schedule — {selectedEvent.name}</span>
          </div>
          <div className="card-body p-0">
            {scheduleLoading ? (
              <div className="p-4 text-muted small">Loading…</div>
            ) : !schedule?.length ? (
              <div className="p-5 text-center text-muted">
                <Users size={36} className="mb-2 opacity-25" />
                <p className="mb-0">No slots for this event.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Time</th>
                      <th>Parent</th>
                      <th className="pe-4">Child</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.slot.id}>
                        <td className="ps-4 small">
                          {new Date(row.slot.slotStartTime).toLocaleTimeString()} – {new Date(row.slot.slotEndTime).toLocaleTimeString()}
                        </td>
                        <td className="small">{row.guardianName ?? <span className="text-muted">Open</span>}</td>
                        <td className="pe-4 small">{row.studentName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
