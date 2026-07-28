'use client'
import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { useCreateEvent } from '../hooks/useCreateEvent'
import { EVENT_TYPE_LABELS, type EventType } from '@/types/sims/events'

interface CreateEventModalProps {
  onClose: () => void
}

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export function CreateEventModal({ onClose }: CreateEventModalProps) {
  const createEvent = useCreateEvent()
  const [name, setName] = useState('')
  const [eventType, setEventType] = useState<EventType>('sports_day')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('13:00')
  const [venue, setVenue] = useState('')
  const [description, setDescription] = useState('')
  const [capacity, setCapacity] = useState(100)
  const [ticketsPerFamily, setTicketsPerFamily] = useState(2)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setError(null)
    if (!name.trim() || !date || !venue.trim()) {
      setError('Name, date, and venue are required.')
      return
    }
    createEvent.mutate(
      { name: name.trim(), eventType, date, startTime, endTime, venue: venue.trim(), description: description.trim() || undefined, capacity, ticketsPerFamily },
      {
        onSuccess: () => onClose(),
        onError: () => setError('Could not create the event. Please try again.'),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <CalendarPlus size={20} className="text-primary" /> Create Event
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Event Name</label>
                  <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Annual Sports Day 2026" />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Event Type</label>
                  <select className="form-select" value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Venue</label>
                  <input type="text" className="form-control" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Main School Grounds" />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Date</label>
                  <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Start Time</label>
                  <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">End Time</label>
                  <input type="time" className="form-control" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Capacity</label>
                  <input type="number" min={1} className="form-control" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Max Tickets per Family</label>
                  <input type="number" min={1} className="form-control" value={ticketsPerFamily} onChange={(e) => setTicketsPerFamily(Number(e.target.value))} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Description (optional)</label>
                  <textarea className="form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
              {error && <div className="alert alert-danger small mt-3 mb-0">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={createEvent.isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} disabled={createEvent.isPending}>
                {createEvent.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Create Draft Event'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
