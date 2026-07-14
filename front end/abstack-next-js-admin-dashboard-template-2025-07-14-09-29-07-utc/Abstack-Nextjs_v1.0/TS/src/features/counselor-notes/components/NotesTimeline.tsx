'use client'
import { useState } from 'react'
import { Lock, NotebookText, Share2, X } from 'lucide-react'
import { useStudentNotes } from '../hooks/useStudentNotes'
import { useSetApprovedSummary } from '../hooks/useSetApprovedSummary'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { CounselorNote } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ApprovedSummaryControl({ note, studentId }: { note: CounselorNote; studentId: string }) {
  const { showNotification } = useNotificationContext()
  const setApprovedSummary = useSetApprovedSummary()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.approvedSummary ?? '')

  const handleSave = () => {
    if (!draft.trim()) return
    setApprovedSummary.mutate(
      { id: note.id, studentId, summary: draft.trim() },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Summary shared with the guardian portal.' })
          setEditing(false)
        },
        onError: () => showNotification({ variant: 'danger', message: 'Could not save the summary.' }),
      },
    )
  }

  const handleUnshare = () => {
    setApprovedSummary.mutate(
      { id: note.id, studentId, summary: null },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Summary removed from the guardian portal.' }),
        onError: () => showNotification({ variant: 'danger', message: 'Could not remove the summary.' }),
      },
    )
  }

  if (note.approvedSummary && !editing) {
    return (
      <div className="mt-2 rounded-2 p-2" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div className="d-flex align-items-center gap-1 mb-1" style={{ fontSize: 11 }}>
              <Share2 size={11} className="text-success" />
              <span className="fw-semibold text-success">Shared with guardian</span>
            </div>
            <p className="mb-0" style={{ fontSize: 13, color: '#065f46' }}>{note.approvedSummary}</p>
          </div>
          <div className="d-flex gap-1 flex-shrink-0">
            <button type="button" className="btn btn-sm btn-outline-secondary py-0" style={{ fontSize: 11 }} onClick={() => { setDraft(note.approvedSummary ?? ''); setEditing(true) }}>
              Edit
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger py-0" style={{ fontSize: 11 }} onClick={handleUnshare} disabled={setApprovedSummary.isPending}>
              <X size={11} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="mt-2 d-flex flex-column gap-2">
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Write a plain, non-clinical summary the guardian will see…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-sm btn-success" disabled={!draft.trim() || setApprovedSummary.isPending} onClick={handleSave}>
            {setApprovedSummary.isPending ? 'Saving…' : 'Share with Guardian'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-success mt-2 d-flex align-items-center gap-1"
      style={{ fontSize: 12, width: 'fit-content' }}
      onClick={() => setEditing(true)}
    >
      <Share2 size={12} /> Share a summary with guardian
    </button>
  )
}

interface Props {
  studentId: string
  studentName: string
}

export function NotesTimeline({ studentId, studentName }: Props) {
  const { data: notes, isLoading } = useStudentNotes(studentId)

  return (
    <div className="card border-0 shadow-sm">
      <div
        className="card-header border-0 py-3 px-4 d-flex align-items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
      >
        <Lock size={16} className="text-white" />
        <span className="fw-semibold text-white">{studentName} — Session Notes (Confidential)</span>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-muted small py-3">Loading…</div>
        ) : !notes?.length ? (
          <div className="text-center text-muted py-5">
            <NotebookText size={32} className="mb-2 opacity-50" />
            <p className="mb-0 small">No session notes recorded yet.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-3 p-3" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                <p className="mb-2" style={{ fontSize: 14, color: '#134e4a', whiteSpace: 'pre-wrap' }}>{note.notes}</p>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-muted" style={{ fontSize: 12 }}>Encrypted at rest</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{formatDate(note.createdAt)}</span>
                </div>
                <ApprovedSummaryControl note={note} studentId={studentId} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
