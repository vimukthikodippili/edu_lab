'use client'
import { useState } from 'react'
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'
import { useAcademicContext } from '../hooks/useAcademicContext'

const TIER_GOOD = '#16a34a'
const TIER_WARN = '#c2410c'
const TIER_CRITICAL = '#dc2626'

function attendanceTierColor(presentPercent: number): string {
  if (presentPercent >= 90) return TIER_GOOD
  if (presentPercent >= 75) return TIER_WARN
  return TIER_CRITICAL
}

function formatFlagType(type: string): string {
  return type === 'effort_outcome_mismatch' ? 'Effort-Outcome Mismatch' : 'Attendance-Grade Correlation'
}

// AC #15-18 — read-only, non-clinical academic risk context alongside the MHA intake form.
// Self-fetching (only `studentId` passed in), mirrors the collapsible idiom from
// ClassSummaryPanel.tsx, but defaults to expanded — the story's whole point is "context
// without switching screens," so it should be visible immediately, not require an extra click.
// Styled deliberately neutral/subdued (not the app's colorful gradients) to visually reinforce
// "secondary, non-clinical" per AC #16.
export function AcademicContextPanel({ studentId }: { studentId: string | null }) {
  const [expanded, setExpanded] = useState(true)
  const { data, isLoading, isError } = useAcademicContext(studentId)

  if (!studentId) return null

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-header py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
        style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="fw-semibold small text-dark">Academic Context (non-clinical, read-only)</span>
        {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </div>

      {expanded && (
        <div className="card-body">
          {isLoading && <p className="text-muted small mb-0">Loading academic context…</p>}
          {isError && <p className="text-muted small mb-0">Academic context unavailable.</p>}

          {!isLoading && !isError && data && !data.hasAnyData && (
            <p className="text-muted small mb-0">No academic data available yet.</p>
          )}

          {!isLoading && !isError && data && data.hasAnyData && (
            <div className="d-flex flex-column gap-4">
              {/* Attendance */}
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <CalendarClock size={16} className="text-primary" />
                  <span className="fw-semibold small">Attendance (last {data.attendance.windowDays} days)</span>
                </div>
                {!data.attendance.hasData ? (
                  <p className="text-muted small mb-0">No attendance recorded in this window.</p>
                ) : (
                  <p className="small mb-0">
                    <span
                      className="fw-bold"
                      style={{ color: attendanceTierColor(100 - (data.attendance.absencePercent ?? 0)) }}
                    >
                      {100 - (data.attendance.absencePercent ?? 0)}% present
                    </span>
                    {' · '}
                    {data.attendance.absencePercent}% absent
                    {' '}
                    <span className="text-muted">({data.attendance.totalDaysRecorded} day(s) recorded)</span>
                  </p>
                )}
              </div>

              {/* Grade trend */}
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-primary" />
                  <span className="fw-semibold small">Grade Trend</span>
                </div>
                {data.gradeTrends.length === 0 ? (
                  <p className="text-muted small mb-0">No grade trend data yet.</p>
                ) : (
                  <>
                    <p className="small mb-2">
                      {data.gradeTrends.filter((t) => t.decliningTrend).length} of {data.gradeTrends.length} subject
                      {data.gradeTrends.length === 1 ? '' : 's'} show a declining trend
                    </p>
                    {data.gradeTrends.some((t) => t.decliningTrend) && (
                      <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
                        {data.gradeTrends
                          .filter((t) => t.decliningTrend)
                          .map((t) => (
                            <li key={t.subjectId} className="small d-flex align-items-center gap-2">
                              <TrendingDown size={12} style={{ color: TIER_WARN }} />
                              {t.subjectName}
                            </li>
                          ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {/* Open academic flags */}
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-primary" />
                  <span className="fw-semibold small">Open Academic Flags</span>
                </div>
                {data.patternFlags.length === 0 ? (
                  <p className="text-muted small mb-0">No open academic flags.</p>
                ) : (
                  <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                    {data.patternFlags.map((f) => (
                      <li
                        key={f.id}
                        className="d-flex align-items-start gap-2 small rounded-3 p-2"
                        style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                      >
                        <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-1" />
                        <span>
                          <strong>{formatFlagType(f.type)}</strong> — {f.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
