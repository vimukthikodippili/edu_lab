'use client'
import { useState } from 'react'
import { Users, CheckCircle2, Clock, X } from 'lucide-react'
import { useAllClassSections } from '@/features/attendance/hooks/useAllClassSections'
import { StudentPicker } from '@/features/wellbeing/components/StudentPicker'
import { useAddParticipants } from '../hooks/useAddParticipants'
import { useEventParticipants } from '../hooks/useEventParticipants'
import { useNotificationContext } from '@/context/useNotificationContext'

interface EventParticipantsManagerProps {
  eventId: string
}

export function EventParticipantsManager({ eventId }: EventParticipantsManagerProps) {
  const { data: classSections } = useAllClassSections()
  const { data: participants, isLoading } = useEventParticipants(eventId)
  const addParticipants = useAddParticipants(eventId)
  const { showNotification } = useNotificationContext()

  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([])
  const [pendingStudents, setPendingStudents] = useState<{ id: string; name: string }[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const toggleClass = (id: number) => {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const addStudent = (id: string, name: string) => {
    setPendingStudents((prev) => (prev.some((s) => s.id === id) ? prev : [...prev, { id, name }]))
    setPickerOpen(false)
  }

  const removeStudent = (id: string) => setPendingStudents((prev) => prev.filter((s) => s.id !== id))

  const handleAdd = () => {
    if (selectedClassIds.length === 0 && pendingStudents.length === 0) return
    addParticipants.mutate(
      { classSectionIds: selectedClassIds.length ? selectedClassIds : undefined, studentIds: pendingStudents.length ? pendingStudents.map((s) => s.id) : undefined },
      {
        onSuccess: (created) => {
          showNotification({ variant: 'success', message: `${created.length} student(s) added as participants, each with a QR ticket.` })
          setSelectedClassIds([])
          setPendingStudents([])
        },
        onError: () => showNotification({ variant: 'danger', message: 'Could not add participants.' }),
      },
    )
  }

  return (
    <div className="container-fluid px-0">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <Users size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Event Participants</h4>
          <p className="text-muted small mb-0">Choose which classes/students are expected — each gets a QR ticket in their student portal.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <label className="form-label fw-semibold small mb-2">By class section</label>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {classSections?.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`btn btn-sm ${selectedClassIds.includes(c.id) ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => toggleClass(c.id)}
              >
                {c.grade.name} · {c.name}
              </button>
            ))}
          </div>

          <label className="form-label fw-semibold small mb-2">Individual students</label>
          <div className="d-flex flex-wrap gap-2 mb-2">
            {pendingStudents.map((s) => (
              <span key={s.id} className="badge bg-light text-dark border d-flex align-items-center gap-1 px-2 py-2">
                {s.name}
                <X size={12} role="button" onClick={() => removeStudent(s.id)} />
              </span>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPickerOpen((v) => !v)}>
              + Add Student
            </button>
          </div>
          {pickerOpen && <StudentPicker selectedId={null} onSelect={(id, name) => addStudent(id, name)} />}

          <button
            type="button"
            className="btn btn-primary btn-sm mt-2"
            disabled={addParticipants.isPending || (selectedClassIds.length === 0 && pendingStudents.length === 0)}
            onClick={handleAdd}
          >
            {addParticipants.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Add Participants'}
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <span className="fw-bold text-white">Expected Participants ({participants?.length ?? 0})</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !participants?.length ? (
            <div className="p-5 text-center text-muted">
              <Users size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No students added yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Student</th>
                    <th>Class</th>
                    <th className="pe-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((row) => (
                    <tr key={row.participant.id}>
                      <td className="ps-4 small fw-semibold">{row.studentName}</td>
                      <td className="small">{row.className}</td>
                      <td className="pe-4">
                        {row.checkedInAt ? (
                          <span className="badge rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1" style={{ background: '#dcfce7', color: '#15803d' }}>
                            <CheckCircle2 size={12} /> Checked In
                          </span>
                        ) : (
                          <span className="badge rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1" style={{ background: '#fef3c7', color: '#92400e' }}>
                            <Clock size={12} /> Expected
                          </span>
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
