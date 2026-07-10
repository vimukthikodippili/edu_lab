'use client'
import { useState } from 'react'
import { HeartHandshake, Send } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { StudentPicker } from '@/features/wellbeing/components/StudentPicker'
import { useLogBehavioralObservation } from '@/features/wellbeing/hooks/useLogBehavioralObservation'

type ApiError = { response?: { data?: { message?: string } } }
function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiError)?.response?.data?.message ?? fallback
}

function WellbeingLogContent() {
  const { showNotification } = useNotificationContext()
  const logObservation = useLogBehavioralObservation()

  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = () => {
    if (!studentId) {
      showNotification({ variant: 'warning', message: 'Search for and select a student first.' })
      return
    }
    if (!notes.trim()) {
      showNotification({ variant: 'warning', message: 'Write what you observed before submitting.' })
      return
    }

    logObservation.mutate(
      { studentId, notes: notes.trim() },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: `Observation logged for ${studentName}.` })
          setNotes('')
          setStudentId(null)
          setStudentName('')
        },
        onError: (err) => {
          showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not log the observation. Please try again.') })
        },
      },
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
        >
          <HeartHandshake size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Log a Wellbeing Observation</h4>
          <p className="text-muted small mb-0">
            A plain note of what you noticed — no labels or scores needed. Only the Counselor and Principal can see it.
          </p>
        </div>
      </div>

      <StudentPicker selectedId={studentId} onSelect={(id, name) => { setStudentId(id); setStudentName(name) }} />

      {studentId && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge bg-teal text-white" style={{ background: '#0f766e' }}>{studentName}</span>
            </div>
            <label className="form-label fw-semibold small mb-1">What did you notice?</label>
            <textarea
              className="form-control mb-2"
              rows={5}
              placeholder="e.g. Seemed withdrawn during group work today, didn't join in like usual."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
            />
            <p className="text-muted mb-3" style={{ fontSize: 12 }}>
              Just describe what you saw — there's no need to interpret it or assign a cause.
            </p>
            <button
              type="button"
              className="btn d-flex align-items-center gap-2 text-white"
              style={{ background: '#0f766e' }}
              onClick={handleSubmit}
              disabled={logObservation.isPending}
            >
              {logObservation.isPending ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <Send size={14} />
              )}
              Log Observation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeacherWellbeingPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <WellbeingLogContent />
    </RoleGuard>
  )
}
