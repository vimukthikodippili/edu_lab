'use client'
import { HeartHandshake, NotebookText } from 'lucide-react'
import { useStudentObservations } from '../hooks/useStudentObservations'
import type { StaffMember } from '@/features/staff/types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  studentId: string
  studentName: string
  staffById: Map<string, StaffMember>
}

export function ObservationTimeline({ studentId, studentName, staffById }: Props) {
  const { data: observations, isLoading } = useStudentObservations(studentId)

  return (
    <div className="card border-0 shadow-sm">
      <div
        className="card-header border-0 py-3 px-4 d-flex align-items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
      >
        <HeartHandshake size={18} className="text-white" />
        <span className="fw-semibold text-white">{studentName} — Wellbeing Notes</span>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-muted small py-3">Loading…</div>
        ) : !observations?.length ? (
          <div className="text-center text-muted py-5">
            <NotebookText size={32} className="mb-2 opacity-50" />
            <p className="mb-0 small">No observations have been logged for this student.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {observations.map((obs) => {
              const author = staffById.get(obs.authorStaffId)
              return (
                <div
                  key={obs.id}
                  className="rounded-3 p-3"
                  style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}
                >
                  <p className="mb-2" style={{ fontSize: 14, color: '#134e4a' }}>{obs.notes}</p>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {author ? `Logged by ${author.firstName} ${author.lastName}` : 'Logged by a teacher'}
                    </span>
                    <span className="text-muted" style={{ fontSize: 12 }}>{formatDate(obs.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
