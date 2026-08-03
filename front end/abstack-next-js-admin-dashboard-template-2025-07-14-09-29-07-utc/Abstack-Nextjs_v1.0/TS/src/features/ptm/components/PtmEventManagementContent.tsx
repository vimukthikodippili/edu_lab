'use client'
import { useState } from 'react'
import { CalendarClock, Plus, Send } from 'lucide-react'
import { usePtmEvents } from '../hooks/usePtmEvents'
import { useCreatePtmEvent } from '../hooks/useCreatePtmEvent'
import { usePublishPtmEvent } from '../hooks/usePublishPtmEvent'
import { useNotificationContext } from '@/context/useNotificationContext'

export function PtmEventManagementContent() {
  const { data: events, isLoading } = usePtmEvents()
  const createEvent = useCreatePtmEvent()
  const publishEvent = usePublishPtmEvent()
  const { showNotification } = useNotificationContext()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(10)
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState(24)

  const handleCreate = () => {
    if (!name.trim() || !date || slotDurationMinutes <= 0) {
      showNotification({ variant: 'danger', message: 'Name, date, and a positive slot duration are required.' })
      return
    }
    createEvent.mutate(
      { name: name.trim(), date, slotDurationMinutes, cancellationCutoffHours },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: `${name} created as a draft.` })
          setShowCreate(false)
          setName('')
          setDate('')
        },
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not create this PTM event.' }),
      },
    )
  }

  const handlePublish = (eventId: string, eventName: string) => {
    if (!window.confirm(`Publish "${eventName}"? This generates every teacher's slots from their confirmed availability and cannot be undone.`)) return
    publishEvent.mutate(eventId, {
      onSuccess: (result) =>
        showNotification({ variant: 'success', message: `Published — ${result.slotsGenerated} slot(s) generated.` }),
      onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not publish this event.' }),
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <CalendarClock size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Parent-Teacher Meetings</h4>
            <p className="text-muted small mb-0">Create a PTM session, let teachers confirm availability, then publish to open booking.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={16} /> {showCreate ? 'Cancel' : 'New PTM Event'}
        </button>
      </div>

      {showCreate && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Event Name</label>
                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Term 2 Parent-Teacher Meeting" />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Date</label>
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-semibold">Slot Duration (min)</label>
                <input type="number" min={1} className="form-control" value={slotDurationMinutes} onChange={(e) => setSlotDurationMinutes(Number(e.target.value))} />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-semibold">Cancel Cutoff (hrs)</label>
                <input type="number" min={1} className="form-control" value={cancellationCutoffHours} onChange={(e) => setCancellationCutoffHours(Number(e.target.value))} />
              </div>
              <div className="col-12">
                <button type="button" className="btn btn-primary" disabled={createEvent.isPending} onClick={handleCreate}>
                  {createEvent.isPending ? 'Creating…' : 'Create Draft Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <span className="fw-bold text-white">PTM Events ({events?.length ?? 0})</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !events?.length ? (
            <div className="p-5 text-center text-muted">
              <CalendarClock size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No PTM events yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Name</th>
                    <th>Date</th>
                    <th>Slot Duration</th>
                    <th>Status</th>
                    <th className="pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="ps-4 small fw-semibold">{e.name}</td>
                      <td className="small">{e.date}</td>
                      <td className="small">{e.slotDurationMinutes} min</td>
                      <td className="small">
                        <span className={`badge ${e.status === 'published' ? 'bg-success' : 'bg-secondary'}`}>{e.status}</span>
                      </td>
                      <td className="pe-4">
                        {e.status === 'draft' && (
                          <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" disabled={publishEvent.isPending} onClick={() => handlePublish(e.id, e.name)}>
                            <Send size={14} /> Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
