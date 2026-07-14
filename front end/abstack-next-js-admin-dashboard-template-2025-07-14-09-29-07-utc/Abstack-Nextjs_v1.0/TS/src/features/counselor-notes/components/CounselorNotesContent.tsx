'use client'
import { useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { StudentPicker } from '@/features/wellbeing/components/StudentPicker'
import { NotesTimeline } from './NotesTimeline'
import { useCreateNote } from '../hooks/useCreateNote'
import { useNotificationContext } from '@/context/useNotificationContext'

interface Props {
  /** POST /counselor-notes is Counselor-only server-side — Principal can read/share but not create. */
  canCreateNotes?: boolean
}

export function CounselorNotesContent({ canCreateNotes = true }: Props) {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [draft, setDraft] = useState('')
  const createNote = useCreateNote()
  const { showNotification } = useNotificationContext()

  const handleSubmit = () => {
    if (!studentId || !draft.trim()) return
    createNote.mutate(
      { studentId, notes: draft.trim() },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Session note recorded and encrypted.' })
          setDraft('')
        },
        onError: () => showNotification({ variant: 'danger', message: 'Could not save the note.' }),
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
          <Lock size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Counselor Session Notes</h4>
          <p className="text-muted small mb-0">
            Confidential — encrypted at rest, visible only to Principal and Counselor.
          </p>
        </div>
      </div>

      <StudentPicker selectedId={studentId} onSelect={(id, name) => { setStudentId(id); setStudentName(name) }} />

      {studentId && (
        <>
          {canCreateNotes && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body py-3">
                <label className="form-label fw-semibold small mb-1">New session note for {studentName}</label>
                <textarea
                  className="form-control form-control-sm mb-2"
                  rows={3}
                  placeholder="Professional session notes — encrypted before storage…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm text-white d-flex align-items-center gap-1"
                  style={{ background: '#0f766e', border: 'none' }}
                  disabled={!draft.trim() || createNote.isPending}
                  onClick={handleSubmit}
                >
                  <ShieldCheck size={13} />
                  {createNote.isPending ? 'Saving…' : 'Save Encrypted Note'}
                </button>
              </div>
            </div>
          )}

          <NotesTimeline studentId={studentId} studentName={studentName} />
        </>
      )}
    </div>
  )
}
