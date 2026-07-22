'use client'
import { useState } from 'react'
import { useCreateLabReportAssignment } from '../hooks/useCreateLabReportAssignment'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useNotificationContext } from '@/context/useNotificationContext'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

interface Props {
  experimentLogId: string
  onClose: () => void
  onCreated?: () => void
}

export default function LabReportAssignmentFormModal({ experimentLogId, onClose, onCreated }: Props) {
  const { showNotification } = useNotificationContext()
  const createMutation = useCreateLabReportAssignment(experimentLogId)
  const { data: terms } = useAcademicTerms()

  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [markingScheme, setMarkingScheme] = useState('')
  const [maxMarks, setMaxMarks] = useState(100)
  const [includeInTermAssessment, setIncludeInTermAssessment] = useState(false)
  const [termId, setTermId] = useState('')

  const isValid =
    title.trim() && instructions.trim() && dueDate && markingScheme.trim() && maxMarks > 0 &&
    (!includeInTermAssessment || !!termId)
  const isPending = createMutation.isPending

  const handleSubmit = () => {
    if (!isValid) return
    createMutation.mutate(
      {
        title: title.trim(),
        instructions: instructions.trim(),
        dueDate,
        markingScheme: markingScheme.trim(),
        maxMarks,
        includeInTermAssessment,
        termId: includeInTermAssessment ? Number(termId) : undefined,
      },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Lab report assignment created — students have been notified.' })
          onCreated?.()
          onClose()
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
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
              <h5 className="modal-title">Assign Lab Report</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Title</label>
                <input type="text" className="form-control" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Instructions</label>
                <textarea className="form-control" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Due Date</label>
                  <input type="date" className="form-control" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Max Marks</label>
                  <input type="number" min={1} className="form-control" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Marking Scheme</label>
                <textarea className="form-control" rows={2} value={markingScheme} onChange={(e) => setMarkingScheme(e.target.value)} />
              </div>

              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="includeInTermAssessment"
                  checked={includeInTermAssessment}
                  onChange={(e) => setIncludeInTermAssessment(e.target.checked)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="includeInTermAssessment">
                  Include this grade in the student&apos;s term assessment marks
                </label>
              </div>
              {includeInTermAssessment && (
                <div className="mb-1">
                  <label className="form-label fw-semibold small">Academic Term</label>
                  <select className="form-select" value={termId} onChange={(e) => setTermId(e.target.value)}>
                    <option value="">Select a term…</option>
                    {terms?.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.academicYear})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : 'Create Assignment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
