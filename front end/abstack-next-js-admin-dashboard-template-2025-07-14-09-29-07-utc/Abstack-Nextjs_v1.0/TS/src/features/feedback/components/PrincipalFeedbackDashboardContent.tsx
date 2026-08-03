'use client'
import { Fragment, useState } from 'react'
import { MessageSquareWarning, CheckCircle2, Eye } from 'lucide-react'
import { useAllFeedback } from '../hooks/useAllFeedback'
import { useMarkUnderReview } from '../hooks/useMarkUnderReview'
import { useRespondToFeedback } from '../hooks/useRespondToFeedback'
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_LABELS,
  type FeedbackCategory,
  type FeedbackStatus,
} from '@/types/sims/feedback'
import { useNotificationContext } from '@/context/useNotificationContext'

const CATEGORIES = Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]
const STATUSES = Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]

const STATUS_BADGE: Record<string, string> = {
  received: 'bg-secondary',
  under_review: 'bg-warning text-dark',
  resolved: 'bg-success',
}

function responseTimeLabel(submittedAt: string, resolvedAt: string | null): string {
  if (!resolvedAt) return '—'
  const ms = new Date(resolvedAt).getTime() - new Date(submittedAt).getTime()
  const hours = Math.round(ms / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

export function PrincipalFeedbackDashboardContent() {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | ''>('')
  const { data: items, isLoading } = useAllFeedback({
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  })
  const markUnderReview = useMarkUnderReview()
  const respond = useRespondToFeedback()
  const { showNotification } = useNotificationContext()

  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseBody, setResponseBody] = useState('')

  const handleMarkUnderReview = (id: string) => {
    markUnderReview.mutate(id, {
      onSuccess: () => showNotification({ variant: 'success', message: 'Marked as under review.' }),
      onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not update this item.' }),
    })
  }

  const handleRespond = (id: string) => {
    if (!responseBody.trim()) {
      showNotification({ variant: 'danger', message: 'Enter a response before submitting.' })
      return
    }
    respond.mutate(
      { id, payload: { responseBody: responseBody.trim() } },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Response sent — the parent has been notified.' })
          setRespondingId(null)
          setResponseBody('')
        },
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not send this response.' }),
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
          <h4 className="mb-0 fw-bold">Parent Feedback &amp; Complaints</h4>
          <p className="text-muted small mb-0">Review, respond to, and track every parent submission.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Status</label>
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | '')}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Category</label>
              <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as FeedbackCategory | '')}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{FEEDBACK_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <span className="fw-bold text-white">Submissions ({items?.length ?? 0})</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !items?.length ? (
            <div className="p-5 text-center text-muted">
              <MessageSquareWarning size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No submissions match these filters.</p>
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
                    <th>Submitted</th>
                    <th>Response Time</th>
                    <th className="pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <Fragment key={item.id}>
                      <tr>
                        <td className="ps-4 small font-monospace">{item.referenceNumber}</td>
                        <td className="small fw-semibold">{item.subject}</td>
                        <td className="small">{FEEDBACK_CATEGORY_LABELS[item.category]}</td>
                        <td className="small">
                          <span className={`badge ${STATUS_BADGE[item.status]}`}>{FEEDBACK_STATUS_LABELS[item.status]}</span>
                        </td>
                        <td className="small">{new Date(item.submittedAt).toLocaleDateString()}</td>
                        <td className="small">{responseTimeLabel(item.submittedAt, item.resolvedAt)}</td>
                        <td className="pe-4 d-flex gap-2">
                          {item.status === 'received' && (
                            <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" disabled={markUnderReview.isPending} onClick={() => handleMarkUnderReview(item.id)}>
                              <Eye size={12} /> Review
                            </button>
                          )}
                          {item.status !== 'resolved' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                              onClick={() => { setRespondingId(respondingId === item.id ? null : item.id); setResponseBody('') }}
                            >
                              <CheckCircle2 size={12} /> Respond
                            </button>
                          )}
                        </td>
                      </tr>
                      {respondingId === item.id && (
                        <tr>
                          <td colSpan={7} className="bg-light">
                            <div className="d-flex gap-2 p-2">
                              <textarea className="form-control form-control-sm" rows={2} value={responseBody} onChange={(e) => setResponseBody(e.target.value)} placeholder="Write your response…" />
                              <button type="button" className="btn btn-sm btn-success" disabled={respond.isPending} onClick={() => handleRespond(item.id)}>
                                {respond.isPending ? 'Sending…' : 'Send & Resolve'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
