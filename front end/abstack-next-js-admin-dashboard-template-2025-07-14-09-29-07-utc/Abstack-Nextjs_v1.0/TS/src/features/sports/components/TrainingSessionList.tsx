'use client'
import { useState } from 'react'
import { Pencil, CalendarDays, Users, Award, ClipboardEdit } from 'lucide-react'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useTrainingSessions } from '../hooks/useTrainingSessions'
import { useCreateTrainingSession } from '../hooks/useCreateTrainingSession'
import { useUpdateTrainingSession } from '../hooks/useUpdateTrainingSession'
import TrainingSessionFormModal from './TrainingSessionFormModal'
import type {
  TrainingSession,
  CreateTrainingSessionPayload,
  UpdateTrainingSessionPayload,
} from '@/types/sims/sports'

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function TrainingSessionList({
  sportId,
  canManage,
}: {
  sportId: string
  canManage: boolean
}) {
  const { showNotification } = useNotificationContext()
  const { data: sessions, isLoading } = useTrainingSessions(sportId)

  const [showModal, setShowModal] = useState(false)
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null)

  const createMutation = useCreateTrainingSession(sportId)
  const updateMutation = useUpdateTrainingSession(sportId)

  const openLog = () => { setEditingSession(null); setShowModal(true) }
  const openEdit = (session: TrainingSession) => { setEditingSession(session); setShowModal(true) }

  const handleSubmit = (payload: CreateTrainingSessionPayload | UpdateTrainingSessionPayload) => {
    if (editingSession) {
      updateMutation.mutate(
        { sessionId: editingSession.id, payload },
        {
          onSuccess: () => {
            showNotification({ variant: 'success', message: 'Training session updated.' })
            setShowModal(false)
          },
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
    } else {
      createMutation.mutate(payload as CreateTrainingSessionPayload, {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Training session logged.' })
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
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}
            onClick={openLog}
          >
            <ClipboardEdit size={14} /> Log Training Session
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="placeholder-glow">
          <div className="placeholder col-12 rounded" style={{ height: 60 }} />
        </div>
      ) : (sessions?.length ?? 0) === 0 ? (
        <p className="text-muted small mb-0">No training sessions logged yet.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {(sessions ?? []).map((s) => (
            <div
              key={s.id}
              className="d-flex align-items-start justify-content-between gap-3 rounded-3 p-2 px-3"
              style={{ background: '#f0f9ff', borderLeft: '4px solid #0ea5e9' }}
            >
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-3 mb-1 text-muted" style={{ fontSize: '0.78rem' }}>
                  <span className="d-flex align-items-center gap-1">
                    <CalendarDays size={12} /> {formatDate(s.date)}
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <Users size={12} /> {s.attendeeStudentIds.length} attended
                  </span>
                  {s.sessionLeaderStudent && (
                    <span className="badge rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{ background: '#fef3c7', color: '#92400e' }}>
                      <Award size={11} /> {s.sessionLeaderStudent.firstName} {s.sessionLeaderStudent.lastName}
                    </span>
                  )}
                </div>
                <p className="small mb-0">{s.description}</p>
              </div>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-1 text-secondary flex-shrink-0"
                  title="Edit session"
                  onClick={() => openEdit(s)}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TrainingSessionFormModal
          sportId={sportId}
          session={editingSession}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}
