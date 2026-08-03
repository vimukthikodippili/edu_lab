'use client'
import { useState } from 'react'
import { MessageSquareWarning, Send, ListChecks } from 'lucide-react'
import { useSubmitFeedback } from '../hooks/useSubmitFeedback'
import { useMyFeedback } from '../hooks/useMyFeedback'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { FEEDBACK_CATEGORY_LABELS, FEEDBACK_STATUS_LABELS, type FeedbackCategory } from '@/types/sims/feedback'
import { useNotificationContext } from '@/context/useNotificationContext'

const CATEGORIES = Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]

const STATUS_BADGE: Record<string, string> = {
  received: 'bg-secondary',
  under_review: 'bg-warning text-dark',
  resolved: 'bg-success',
}

export function ParentFeedbackContent() {
  const { data: profile } = useMyGuardianProfile()
  const submitFeedback = useSubmitFeedback()
  const { data: myFeedback, isLoading } = useMyFeedback()
  const { showNotification } = useNotificationContext()

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('academic')
  const [studentId, setStudentId] = useState('')

  const handleSubmit = () => {
    if (!subject.trim() || !body.trim()) {
      showNotification({ variant: 'danger', message: 'Subject and message are required.' })
      return
    }
    submitFeedback.mutate(
      { subject: subject.trim(), body: body.trim(), category, studentId: studentId || undefined },
      {
        onSuccess: (feedback) => {
          showNotification({ variant: 'success', message: `Submitted — your reference number is ${feedback.referenceNumber}.` })
          setSubject('')
          setBody('')
          setStudentId('')
        },
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not submit your feedback.' }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <MessageSquareWarning size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Feedback &amp; Complaints</h4>
          <p className="text-muted small mb-0">Raise a concern with the school and track its status until resolved.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Subject</label>
              <input type="text" className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Canteen food quality" />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{FEEDBACK_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">About (optional)</label>
              <select className="form-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">General / not child-specific</option>
                {profile?.students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Message</label>
              <textarea className="form-control" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your feedback or complaint…" />
            </div>
            <div className="col-12">
              <button type="button" className="btn btn-primary d-flex align-items-center gap-2" disabled={submitFeedback.isPending} onClick={handleSubmit}>
                <Send size={14} /> {submitFeedback.isPending ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <span className="fw-bold text-white d-flex align-items-center gap-2"><ListChecks size={16} /> My Submissions</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !myFeedback?.length ? (
            <div className="p-5 text-center text-muted">
              <MessageSquareWarning size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No submissions yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Reference</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th className="pe-4">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {myFeedback.map(({ feedback, response }) => (
                    <tr key={feedback.id}>
                      <td className="ps-4 small font-monospace">{feedback.referenceNumber}</td>
                      <td className="small fw-semibold">{feedback.subject}</td>
                      <td className="small">{FEEDBACK_CATEGORY_LABELS[feedback.category]}</td>
                      <td className="small">
                        <span className={`badge ${STATUS_BADGE[feedback.status]}`}>{FEEDBACK_STATUS_LABELS[feedback.status]}</span>
                      </td>
                      <td className="pe-4 small">{response ? response.responseBody : <span className="text-muted">—</span>}</td>
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
