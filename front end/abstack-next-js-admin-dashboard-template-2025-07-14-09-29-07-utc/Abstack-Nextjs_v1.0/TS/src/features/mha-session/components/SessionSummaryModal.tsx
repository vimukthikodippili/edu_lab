'use client'
import { useState } from 'react'
import { ClipboardCheck, MessageCircleHeart, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useUpdateSessionActionStatus } from '../hooks/useUpdateSessionActionStatus'
import NotifyGuardianModal from './NotifyGuardianModal'
import { DISORDER_SECTION_LABELS, RISK_CATEGORY_LABELS } from '@/types/sims/disorder-registry'
import { DOMAIN_RESULT_LEVEL_LABELS, LEVEL_BADGE_CLASS } from '@/types/sims/domain-result'
import type { MhaSessionSummary } from '@/types/sims/mha-session'

interface SessionSummaryModalProps {
  summary: MhaSessionSummary
  onClose: () => void
}

// MHA-131/AC #55 — exact wording, kept in one place so the "prepended first" styling check below
// and the backend's generated text can be compared by value.
const SAFETY_ACTION_TEXT = 'Immediate Safety Escalation — notify counselor/clinician today'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function categoryStatus(level: MhaSessionSummary['riskCategories'][number]['level']): string {
  if (level === 'not_assessed') return 'Not assessed'
  if (level === 'high' || level === 'severe') return '⚑ Top finding'
  return 'Assessed'
}

// MHA-130 (AC #52) — left-accent-border color per card, matching LEVEL_BADGE_CLASS's palette.
// `border-dark` (not `border-secondary`) for grey, since this theme's `secondary` renders purple.
const CARD_ACCENT_BORDER: Record<MhaSessionSummary['riskCategories'][number]['level'], string> = {
  not_assessed: 'border-dark',
  none: 'border-dark',
  low: 'border-success',
  moderate: 'border-warning',
  high: 'border-orange',
  severe: 'border-danger',
}

export default function SessionSummaryModal({ summary, onClose }: SessionSummaryModalProps) {
  const user = useAuthStore((s) => s.user)
  const canTrackActions = user?.role === ROLES.COUNSELOR || user?.role === ROLES.SCHOOL_PSYCHOLOGIST
  const updateStatusMutation = useUpdateSessionActionStatus()
  const hasSafetyEscalation = summary.recommendedActions.some((a) => a.actionText === SAFETY_ACTION_TEXT)
  const { showNotification } = useNotificationContext()
  const [showNotifyGuardian, setShowNotifyGuardian] = useState(false)
  // MHA-142/AC #85 — an optional note per open action, sent together with the completion PATCH.
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  // MHA-134/AC #68 — counselor-only (not school_psychologist, a deliberate narrowing FR-MHA-33's
  // own text specifies), and only when the session actually produced a Recommended Action.
  const canNotifyGuardian = user?.role === ROLES.COUNSELOR && summary.recommendedActions.length > 0

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <ClipboardCheck size={20} className="text-success" /> Session Summary
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="small text-muted mb-3">
                {summary.studentName} &nbsp;|&nbsp; Age: {summary.age} &nbsp;|&nbsp; Grade: {summary.grade}{' '}
                &nbsp;|&nbsp; Case No.: <code>{summary.caseNumber}</code> &nbsp;|&nbsp; Date:{' '}
                {formatDate(summary.screeningDate)}
              </p>

              <div className="row row-cols-2 row-cols-md-4 g-3 mb-3">
                {summary.riskCategories.map((row) => (
                  <div key={row.category}>
                    <div
                      className={`card border-0 shadow-sm border-start border-4 h-100 ${CARD_ACCENT_BORDER[row.level]}`}
                    >
                      <div className="card-body py-3">
                        <div className="text-muted small">{RISK_CATEGORY_LABELS[row.category]}</div>
                        <span className={`badge mt-1 ${LEVEL_BADGE_CLASS[row.level]}`}>
                          {DOMAIN_RESULT_LEVEL_LABELS[row.level]}
                        </span>
                        <div className="small text-muted mt-1">{categoryStatus(row.level)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <div className="fw-semibold small mb-1">Top Findings</div>
                {summary.topFindings.length === 0 ? (
                  <div className="small text-muted">No High or Severe findings recorded in this screening.</div>
                ) : (
                  <div className="row row-cols-1 row-cols-md-2 g-2">
                    {summary.topFindings.map((f) => (
                      <div key={f.domainName}>
                        <div
                          className={`card border-0 shadow-sm border-start border-4 h-100 ${CARD_ACCENT_BORDER[f.level]}`}
                        >
                          <div className="card-body py-2 px-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="fw-medium small">{f.domainName}</span>
                              <span className={`badge ${LEVEL_BADGE_CLASS[f.level]}`}>
                                {DOMAIN_RESULT_LEVEL_LABELS[f.level]}
                              </span>
                            </div>
                            <div className="small text-muted">
                              {DISORDER_SECTION_LABELS[f.section]} &middot; {RISK_CATEGORY_LABELS[f.riskCategory]}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="fw-semibold small mb-1 d-flex align-items-center gap-1">
                  {hasSafetyEscalation && <ShieldAlert size={14} className="text-danger" />}
                  Recommended Actions
                </div>
                {summary.recommendedActions.length === 0 ? (
                  <div className="small text-muted">None.</div>
                ) : (
                  <ul className="list-unstyled small mb-0">
                    {summary.recommendedActions.map((action) => {
                      const isSafety = action.actionText === SAFETY_ACTION_TEXT
                      const isComplete = action.status === 'complete'

                      // MHA-142/AC #87 — a completed action is immutable (the backend 422s any
                      // further PATCH), so once complete there's no checkbox at all, just the
                      // permanent completion record.
                      if (isComplete) {
                        return (
                          <li key={action.id} className="mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-muted text-decoration-line-through">{action.actionText}</span>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Completed {action.completedAt ? formatDate(action.completedAt) : ''}
                              {action.completionNote && <> &mdash; {action.completionNote}</>}
                            </div>
                          </li>
                        )
                      }

                      return (
                        <li key={action.id} className="mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={false}
                              disabled={!canTrackActions || updateStatusMutation.isPending}
                              onChange={(e) => {
                                if (!e.target.checked) return
                                updateStatusMutation.mutate({
                                  sessionId: summary.id,
                                  actionId: action.id,
                                  status: 'complete',
                                  completionNote: noteDrafts[action.id]?.trim() || undefined,
                                })
                              }}
                            />
                            <span className={isSafety ? 'text-danger fw-semibold' : undefined}>{action.actionText}</span>
                          </div>
                          {canTrackActions && (
                            <input
                              type="text"
                              className="form-control form-control-sm mt-1"
                              style={{ maxWidth: 360 }}
                              placeholder="Completion note (optional) — e.g. Parent meeting held on DD/MM"
                              value={noteDrafts[action.id] ?? ''}
                              disabled={updateStatusMutation.isPending}
                              onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [action.id]: e.target.value }))}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {canNotifyGuardian && (
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 me-auto"
                  onClick={() => setShowNotifyGuardian(true)}
                >
                  <MessageCircleHeart size={14} /> Notify Guardian (Non-Clinical)
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {showNotifyGuardian && (
        <NotifyGuardianModal
          sessionId={summary.id}
          studentName={summary.studentName}
          onClose={() => setShowNotifyGuardian(false)}
          onSent={(guardiansNotified) => {
            setShowNotifyGuardian(false)
            showNotification({
              variant: 'success',
              message: `Wellbeing check-in notification sent to ${guardiansNotified} guardian${guardiansNotified === 1 ? '' : 's'}.`,
            })
          }}
        />
      )}
    </>
  )
}
