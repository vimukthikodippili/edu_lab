'use client'
import { History, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import { useMhaSessionHistory } from '../hooks/useMhaSessionHistory'
import { DISORDER_SECTION_LABELS, RISK_CATEGORY_LABELS } from '@/types/sims/disorder-registry'
import { DOMAIN_RESULT_LEVEL_LABELS, LEVEL_BADGE_CLASS, type DomainResultLevel } from '@/types/sims/domain-result'
import type { MhaCategoryTrend, MhaHistorySession, TrendDirection } from '@/types/sims/mha-history'

interface MhaSessionHistoryPanelProps {
  studentId: string
}

// Same palette/left-accent-border convention as SessionSummaryModal.tsx (MHA-130) — not exported
// from there, so redefined here; the same small-duplication tolerance already established
// elsewhere in this module (e.g. SessionActionController's duplicated resolveStaffId).
const CARD_ACCENT_BORDER: Record<DomainResultLevel, string> = {
  not_assessed: 'border-dark',
  none: 'border-dark',
  low: 'border-success',
  moderate: 'border-warning',
  high: 'border-orange',
  severe: 'border-danger',
}

const TREND_ICON: Record<TrendDirection, { Icon: typeof TrendingUp; className: string; label: string }> = {
  worse: { Icon: TrendingUp, className: 'text-danger', label: 'Worse' },
  better: { Icon: TrendingDown, className: 'text-success', label: 'Better' },
  stable: { Icon: Minus, className: 'text-muted', label: 'Stable' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// AC #80 — one trend indicator set per category, comparing the two most recent sessions; shown
// once for the whole history, not per session card.
function TrendRow({ trends }: { trends: MhaCategoryTrend[] }) {
  return (
    <div className="mb-4">
      <div className="fw-semibold small mb-2">Trend vs. Previous Session</div>
      <div className="d-flex flex-wrap gap-2">
        {trends.map((t) => {
          const { Icon, className, label } = TREND_ICON[t.trend]
          return (
            <span
              key={t.category}
              className="badge bg-light text-dark border d-inline-flex align-items-center gap-1 py-2 px-2"
            >
              {RISK_CATEGORY_LABELS[t.category]}
              <Icon size={13} className={className} aria-label={label} />
            </span>
          )
        })}
      </div>
    </div>
  )
}

// AC #79 — case number, date, counselor, 7 category scores, Top Findings, Recommended Actions,
// all shown inline (no click-to-view step, unlike SessionSummaryModal which this replaces here).
function SessionCard({ session }: { session: MhaHistorySession }) {
  return (
    <div className="card border shadow-sm">
      <div className="card-body">
        <p className="small text-muted mb-3">
          <code className="text-primary">{session.caseNumber}</code> &nbsp;|&nbsp; {formatDate(session.screeningDate)}{' '}
          &nbsp;|&nbsp; Counselor: {session.counselorName}
        </p>

        <div className="row row-cols-2 row-cols-md-4 g-2 mb-3">
          {session.riskCategories.map((row) => (
            <div key={row.category}>
              <div className={`card border-0 shadow-sm border-start border-4 h-100 ${CARD_ACCENT_BORDER[row.level]}`}>
                <div className="card-body py-2 px-3">
                  <div className="text-muted small">{RISK_CATEGORY_LABELS[row.category]}</div>
                  <span className={`badge mt-1 ${LEVEL_BADGE_CLASS[row.level]}`}>
                    {DOMAIN_RESULT_LEVEL_LABELS[row.level]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div className="fw-semibold small mb-1">Top Findings</div>
          {session.topFindings.length === 0 ? (
            <div className="small text-muted">No High or Severe findings recorded in this screening.</div>
          ) : (
            <div className="d-flex flex-wrap gap-1">
              {session.topFindings.map((f) => (
                <span key={f.domainName} className={`badge ${LEVEL_BADGE_CLASS[f.level]}`} title={DISORDER_SECTION_LABELS[f.section]}>
                  {f.domainName}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="fw-semibold small mb-1">Recommended Actions</div>
          {session.recommendedActions.length === 0 ? (
            <div className="small text-muted">None.</div>
          ) : (
            <ul className="list-unstyled small mb-0">
              {session.recommendedActions.map((action) => (
                <li key={action.id} className="d-flex align-items-center gap-2 mb-1">
                  <span
                    className={
                      action.status === 'complete' ? 'text-muted text-decoration-line-through' : undefined
                    }
                  >
                    {action.actionText}
                  </span>
                  {action.status === 'complete' && <span className="badge bg-success-subtle text-success-emphasis">Complete</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// MHA-141/FR-MHA-27 — full chronological history (oldest -> newest) with per-category trend,
// mounted unchanged from admin/students/[id]/page.tsx (student profile, MHA-132) and from
// CaseloadContent.tsx's row-click modal (MHA-140) — satisfies AC #82's "both access points" by
// reuse, since this single component backs both.
export default function MhaSessionHistoryPanel({ studentId }: MhaSessionHistoryPanelProps) {
  const user = useAuthStore((s) => s.user)
  // AC #81 — Counselor/SchoolPsychologist/Principal only (the backend 403s admin, unlike other
  // MHA read routes); skip the request entirely for any other role rather than rendering a
  // broken panel inside an otherwise-accessible student profile page.
  const canView =
    user?.role === ROLES.COUNSELOR || user?.role === ROLES.SCHOOL_PSYCHOLOGIST || user?.role === ROLES.PRINCIPAL
  const { data, isLoading } = useMhaSessionHistory(studentId, canView)

  if (!canView) return null

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-white border-bottom py-3 d-flex align-items-center gap-2">
        <History size={18} className="text-muted" />
        <span className="fw-semibold">MHA Session History</span>
      </div>

      {isLoading && (
        <div className="p-3 placeholder-glow">
          <div className="placeholder col-12 rounded" style={{ height: 32 }} />
        </div>
      )}

      {!isLoading && (data?.sessions.length ?? 0) === 0 && (
        <div className="text-center text-muted small py-4">No completed MHA sessions for this student yet.</div>
      )}

      {!isLoading && data && data.sessions.length > 0 && (
        <div className="card-body">
          {data.trends && <TrendRow trends={data.trends} />}
          <div className="d-flex flex-column gap-3">
            {data.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
