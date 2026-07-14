'use client'
import { useState } from 'react'
import { Compass, ShieldCheck } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { StudentPicker } from '@/features/wellbeing/components/StudentPicker'
import { CareerResultsTrend } from '@/features/self-discovery/components/CareerResultsTrend'
import { NotesTimeline } from '@/features/counselor-notes/components/NotesTimeline'
import { useCreateNote } from '@/features/counselor-notes/hooks/useCreateNote'
import { useNotificationContext } from '@/context/useNotificationContext'

function ReviewSessionNoteComposer({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { showNotification } = useNotificationContext()
  const createNote = useCreateNote()
  const [draft, setDraft] = useState('')

  const handleSubmit = () => {
    if (!draft.trim()) return
    createNote.mutate(
      { studentId, notes: draft.trim() },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Review session note saved.' })
          setDraft('')
        },
        onError: () => showNotification({ variant: 'danger', message: 'Could not save the note.' }),
      },
    )
  }

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body py-3">
        <label className="form-label fw-semibold small mb-1">Notes from today&apos;s review session with {studentName}</label>
        <textarea
          className="form-control form-control-sm mb-2"
          rows={3}
          placeholder="What did you discuss? Encrypted before storage…"
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
          {createNote.isPending ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </div>
  )
}

function CareerReviewContent() {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [userId, setUserId] = useState<number | null>(null)

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 960 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Compass size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Career Guidance</h4>
          <p className="text-muted small mb-0">
            Review a student&apos;s self-discovery results together, and record notes from your conversation.
          </p>
        </div>
      </div>

      <StudentPicker
        selectedId={studentId}
        onSelect={(id, name, sUserId) => {
          setStudentId(id)
          setStudentName(name)
          setUserId(sUserId ?? null)
        }}
      />

      {studentId && userId == null && (
        <div className="alert alert-info small">
          This student&apos;s account is not yet linked to a portal login, so they have not been able to take
          the self-discovery questionnaire. You can still leave a note below.
        </div>
      )}

      {studentId && (
        <div className="row g-4">
          {userId != null && (
            <div className="col-12 col-lg-6">
              <CareerResultsTrend userId={userId} studentName={studentName} />
            </div>
          )}
          <div className={userId != null ? 'col-12 col-lg-6' : 'col-12'}>
            <ReviewSessionNoteComposer studentId={studentId} studentName={studentName} />
            <NotesTimeline studentId={studentId} studentName={studentName} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function CounselorCareerPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR]}>
      <CareerReviewContent />
    </RoleGuard>
  )
}
