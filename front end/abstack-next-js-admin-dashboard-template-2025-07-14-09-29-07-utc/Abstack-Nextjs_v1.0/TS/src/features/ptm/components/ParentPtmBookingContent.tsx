'use client'
import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, ListChecks } from 'lucide-react'
import { usePtmEvents } from '../hooks/usePtmEvents'
import { useAvailableSlots } from '../hooks/useAvailableSlots'
import { useBookSlot } from '../hooks/useBookSlot'
import { useMyBookings } from '../hooks/useMyBookings'
import { useCancelBooking } from '../hooks/useCancelBooking'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useNotificationContext } from '@/context/useNotificationContext'

export function ParentPtmBookingContent() {
  const { data: events, isLoading: eventsLoading } = usePtmEvents()
  const { data: profile } = useMyGuardianProfile()
  const { data: staffRoster } = useStaff({ limit: 200 })
  const bookSlot = useBookSlot()
  const cancelBooking = useCancelBooking()
  const { data: myBookings } = useMyBookings()
  const { showNotification } = useNotificationContext()

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(selectedEventId || null)

  const teacherNameById = useMemo(
    () => new Map((staffRoster?.data ?? []).map((s) => [s.id, `${s.firstName} ${s.lastName}`])),
    [staffRoster],
  )

  const handleBook = (slotId: string) => {
    if (!selectedStudentId) {
      showNotification({ variant: 'danger', message: 'Select which child this meeting is about first.' })
      return
    }
    bookSlot.mutate(
      { eventId: selectedEventId, slotId, payload: { studentId: selectedStudentId } },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Slot booked — you and the teacher have been notified.' }),
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not book this slot — it may have just been taken.' }),
      },
    )
  }

  const handleCancel = (bookingId: string) => {
    if (!window.confirm('Cancel this booking? The slot will reopen for other parents.')) return
    cancelBooking.mutate(bookingId, {
      onSuccess: () => showNotification({ variant: 'success', message: 'Booking cancelled.' }),
      onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not cancel this booking.' }),
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <CalendarClock size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Parent-Teacher Meetings</h4>
          <p className="text-muted small mb-0">Book a slot with your child&apos;s teacher.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">PTM Event</label>
              <select className="form-select" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} disabled={eventsLoading}>
                <option value="">{eventsLoading ? 'Loading…' : 'Choose an event…'}</option>
                {events?.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.date}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Child</label>
              <select className="form-select" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">Select your child…</option>
                {profile?.students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedEventId && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <span className="fw-bold text-white">Available Slots</span>
          </div>
          <div className="card-body p-0">
            {slotsLoading ? (
              <div className="p-4 text-muted small">Loading…</div>
            ) : !slots?.length ? (
              <div className="p-5 text-center text-muted">
                <CalendarClock size={36} className="mb-2 opacity-25" />
                <p className="mb-0">No open slots for this event right now.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Teacher</th>
                      <th>Time</th>
                      <th className="pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id}>
                        <td className="ps-4 small fw-semibold">{teacherNameById.get(slot.teacherId) ?? 'Teacher'}</td>
                        <td className="small">
                          {new Date(slot.slotStartTime).toLocaleTimeString()} – {new Date(slot.slotEndTime).toLocaleTimeString()}
                        </td>
                        <td className="pe-4">
                          <button type="button" className="btn btn-sm btn-primary" disabled={bookSlot.isPending} onClick={() => handleBook(slot.id)}>
                            Book
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <span className="fw-bold text-white d-flex align-items-center gap-2"><ListChecks size={16} /> My Bookings</span>
        </div>
        <div className="card-body p-0">
          {!myBookings?.length ? (
            <div className="p-5 text-center text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No bookings yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Booked At</th>
                    <th>Status</th>
                    <th className="pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="ps-4 small">{new Date(b.bookedAt).toLocaleString()}</td>
                      <td className="small">
                        <span className={`badge ${b.status === 'confirmed' ? 'bg-success' : 'bg-secondary'}`}>{b.status}</span>
                      </td>
                      <td className="pe-4">
                        {b.status === 'confirmed' && (
                          <button type="button" className="btn btn-sm btn-outline-danger" disabled={cancelBooking.isPending} onClick={() => handleCancel(b.id)}>
                            Cancel
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
