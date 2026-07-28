'use client'
import { useState } from 'react'
import { History, ClipboardCheck } from 'lucide-react'
import { useStudentTimeline } from '../hooks/useStudentTimeline'
import { useMhaSessionSummary } from '@/features/mha-session/hooks/useMhaSessionSummary'
import SessionSummaryModal from '@/features/mha-session/components/SessionSummaryModal'
import { DOMAIN_RESULT_LEVEL_LABELS, LEVEL_BADGE_CLASS } from '@/types/sims/domain-result'
import type { TimelineEvent } from '@/types/sims/student-timeline'

interface StudentTimelinePanelProps {
  studentId: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// FR-SM-09/FR-MHA-28 — a single event row. Only one event type exists today (mha_session); the
// switch is here so a future second type is a new case, not a rewrite.
function TimelineEventRow({ event, onClick }: { event: TimelineEvent; onClick: (sessionId: string) => void }) {
  switch (event.type) {
    case 'mha_session':
      return (
        <button
          type="button"
          className="list-group-item list-group-item-action d-flex align-items-center justify-content-between gap-2"
          onClick={() => onClick(event.sessionId)}
        >
          <span className="d-flex align-items-center gap-2">
            <ClipboardCheck size={16} className="text-primary" />
            <span className="small">
              MHA Session &nbsp;<code className="text-primary">{event.caseNumber}</code>
            </span>
          </span>
          <span className="d-flex align-items-center gap-2">
            <span className={`badge ${LEVEL_BADGE_CLASS[event.maxLevel]}`}>
              {DOMAIN_RESULT_LEVEL_LABELS[event.maxLevel]}
            </span>
            <span className="text-muted small text-nowrap">{formatDate(event.date)}</span>
          </span>
        </button>
      )
    default:
      return null
  }
}

// AC #88-91 — mha_session events are visible only to Counselor/SchoolPsychologist/Principal; the
// backend filters this in-service, so this component just renders whatever the API returns
// (empty for Teacher today, since no other event type exists yet). AC #90 — clicking an entry
// opens the full session detail via the same on-demand-fetch pattern used elsewhere in this app.
export function StudentTimelinePanel({ studentId }: StudentTimelinePanelProps) {
  const { data, isLoading } = useStudentTimeline(studentId)
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null)
  const { data: viewingSummary } = useMhaSessionSummary(viewingSessionId)

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-white border-bottom py-3 d-flex align-items-center gap-2">
        <History size={18} className="text-muted" />
        <span className="fw-semibold">Timeline</span>
      </div>

      {isLoading && (
        <div className="p-3 placeholder-glow">
          <div className="placeholder col-12 rounded" style={{ height: 32 }} />
        </div>
      )}

      {!isLoading && (data?.events.length ?? 0) === 0 && (
        <div className="text-center text-muted small py-4">No timeline events yet.</div>
      )}

      {!isLoading && data && data.events.length > 0 && (
        <div className="list-group list-group-flush">
          {data.events.map((event, i) => (
            <TimelineEventRow key={`${event.type}-${i}`} event={event} onClick={setViewingSessionId} />
          ))}
        </div>
      )}

      {viewingSessionId && viewingSummary && (
        <SessionSummaryModal summary={viewingSummary} onClose={() => setViewingSessionId(null)} />
      )}
    </div>
  )
}
