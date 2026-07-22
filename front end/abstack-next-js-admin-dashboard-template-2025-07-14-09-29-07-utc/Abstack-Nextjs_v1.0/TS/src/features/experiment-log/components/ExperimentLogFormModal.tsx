'use client'
import { useEffect, useState } from 'react'
import { Paperclip, X, FileText } from 'lucide-react'
import { useExperimentLogForBooking } from '../hooks/useExperimentLogForBooking'
import { useUpsertExperimentLog } from '../hooks/useUpsertExperimentLog'
import { useUploadFile } from '@/features/staff/hooks/useUploadFile'
import { useNotificationContext } from '@/context/useNotificationContext'
import LabReportAssignmentFormModal from '@/features/lab-reports/components/LabReportAssignmentFormModal'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }
function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface Attachment {
  id: string
  path: string
}

interface Props {
  bookingId: string
  onClose: () => void
}

export default function ExperimentLogFormModal({ bookingId, onClose }: Props) {
  const { showNotification } = useNotificationContext()
  const { data, isLoading } = useExperimentLogForBooking(bookingId)
  const upsertMutation = useUpsertExperimentLog(bookingId)
  const uploadMutation = useUploadFile()

  const [experimentName, setExperimentName] = useState('')
  const [objective, setObjective] = useState('')
  const [procedureSummary, setProcedureSummary] = useState('')
  const [outcome, setOutcome] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showAssignLabReport, setShowAssignLabReport] = useState(false)

  useEffect(() => {
    if (data?.log) {
      setExperimentName(data.log.experimentName)
      setObjective(data.log.objective)
      setProcedureSummary(data.log.procedureSummary)
      setOutcome(data.log.outcome)
      setAttachments(data.log.attachments ?? [])
    }
  }, [data?.log])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadMutation.mutate(file, {
      onSuccess: ({ file: uploaded }) => setAttachments((prev) => [...prev, uploaded]),
      onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
    })
    e.target.value = ''
  }

  const isValid = experimentName.trim() && objective.trim() && procedureSummary.trim() && outcome.trim()
  const isPending = upsertMutation.isPending

  const handleSubmit = () => {
    if (!isValid) return
    upsertMutation.mutate(
      {
        experimentName: experimentName.trim(),
        objective: objective.trim(),
        procedureSummary: procedureSummary.trim(),
        outcome: outcome.trim(),
        attachmentFileIds: attachments.map((a) => a.id),
      },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Experiment log saved.' })
          onClose()
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const context = data?.context

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{data?.log ? 'Edit Experiment Log' : 'Log Experiment'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {isLoading && <div className="placeholder-glow"><span className="placeholder col-12 rounded d-block" style={{ height: 100 }} /></div>}

              {context && (
                <div className="alert alert-secondary small mb-3">
                  <strong>{context.date}</strong> · Period {context.periodNumber} · {context.labName} ·{' '}
                  {context.subjectName ?? '—'} · {context.classSectionName ?? '—'} · {context.teacherName}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-semibold small">Experiment Name</label>
                <input type="text" className="form-control" maxLength={200} value={experimentName} onChange={(e) => setExperimentName(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Objective</label>
                <textarea className="form-control" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Procedure Summary</label>
                <textarea className="form-control" rows={3} value={procedureSummary} onChange={(e) => setProcedureSummary(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Outcome</label>
                <textarea className="form-control" rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
              </div>

              <div className="mb-1">
                <label className="form-label fw-semibold small d-block">Attachments (worksheets, result sheets, photos)</label>
                <input type="file" className="form-control form-control-sm" onChange={handleFileSelect} disabled={uploadMutation.isPending} />
                {uploadMutation.isPending && <span className="spinner-border spinner-border-sm ms-2" />}
              </div>
              {attachments.length > 0 && (
                <ul className="list-group list-group-flush small mt-2">
                  {attachments.map((a) => (
                    <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-1">
                      <a href={`${API_URL}${a.path}`} target="_blank" rel="noreferrer" className="text-truncate">
                        <Paperclip size={12} className="me-1" /> {a.path.split('/').pop()}
                      </a>
                      <button type="button" className="btn btn-sm text-danger p-0" onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}>
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              {data?.log && (
                <button type="button" className="btn btn-outline-primary me-auto" onClick={() => setShowAssignLabReport(true)}>
                  <FileText size={14} className="me-1" /> Assign Lab Report
                </button>
              )}
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : 'Save Experiment Log'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showAssignLabReport && data?.log && (
        <LabReportAssignmentFormModal experimentLogId={data.log.id} onClose={() => setShowAssignLabReport(false)} />
      )}
    </>
  )
}
