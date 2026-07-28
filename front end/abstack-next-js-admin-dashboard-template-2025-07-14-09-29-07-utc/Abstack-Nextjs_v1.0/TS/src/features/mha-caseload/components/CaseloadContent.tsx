'use client'
import { useState } from 'react'
import { Users, ShieldAlert, ClipboardCheck, CheckCircle2, History } from 'lucide-react'
import { useMhaCaseload } from '../hooks/useMhaCaseload'
import { useGrades } from '@/features/students/hooks/useGrades'
import MhaSessionHistoryPanel from '@/features/mha-session/components/MhaSessionHistoryPanel'
import {
  DOMAIN_RESULT_LEVEL_LABELS,
  LEVEL_BADGE_CLASS,
  SELECTABLE_DOMAIN_RESULT_LEVELS,
  type DomainResultLevel,
} from '@/types/sims/domain-result'
import type { MhaCaseloadItem } from '@/types/sims/mha-caseload'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// AC #74 — 'Follow-up pending' badge on any student with an open Recommended Action.
function FollowUpBadge() {
  return (
    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle d-inline-flex align-items-center gap-1">
      <ClipboardCheck size={12} /> Follow-up pending
    </span>
  )
}

// AC #75 — permanent 'Safety' badge regardless of session age (a lifetime, cross-session flag).
function SafetyBadge() {
  return (
    <span className="badge bg-danger text-white d-inline-flex align-items-center gap-1">
      <ShieldAlert size={12} /> Safety
    </span>
  )
}

export function CaseloadContent() {
  const [riskLevel, setRiskLevel] = useState<DomainResultLevel | ''>('')
  const [gradeId, setGradeId] = useState<number | ''>('')
  const [hasPendingActions, setHasPendingActions] = useState(false)
  const [hasSafetyFlag, setHasSafetyFlag] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const { data: grades } = useGrades()
  const { data: caseload, isLoading } = useMhaCaseload({
    riskLevel: riskLevel || undefined,
    gradeId: gradeId === '' ? undefined : gradeId,
    hasPendingActions: hasPendingActions || undefined,
    hasSafetyFlag: hasSafetyFlag || undefined,
  })

  const pendingCount = caseload?.filter((c) => c.hasPendingActions).length ?? 0
  const safetyCount = caseload?.filter((c) => c.hasSafetyFlag).length ?? 0

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <Users size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">MHA Caseload</h4>
          <p className="text-muted small mb-0">
            Every student with a completed MHA session — risk level, pending follow-up, and safety history at a glance.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <div className="card border-0 shadow-sm border-start border-primary border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Caseload</div>
              <div className="fs-4 fw-bold text-primary">{caseload?.length ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card border-0 shadow-sm border-start border-info border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Follow-up Pending</div>
              <div className="fs-4 fw-bold text-info">{pendingCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Safety Flag History</div>
              <div className="fs-4 fw-bold text-danger">{safetyCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters — AC #76 */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <select
          className="form-select form-select-sm w-auto"
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value as DomainResultLevel | '')}
        >
          <option value="">All Risk Levels</option>
          {SELECTABLE_DOMAIN_RESULT_LEVELS.map((level) => (
            <option key={level} value={level}>{DOMAIN_RESULT_LEVEL_LABELS[level]}</option>
          ))}
        </select>

        <select
          className="form-select form-select-sm w-auto"
          value={gradeId}
          onChange={(e) => setGradeId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">All Grades</option>
          {(grades ?? []).map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <div className="form-check form-check-inline ms-2">
          <input
            type="checkbox"
            className="form-check-input"
            id="filterPending"
            checked={hasPendingActions}
            onChange={(e) => setHasPendingActions(e.target.checked)}
          />
          <label className="form-check-label small" htmlFor="filterPending">Pending follow-up only</label>
        </div>

        <div className="form-check form-check-inline">
          <input
            type="checkbox"
            className="form-check-input"
            id="filterSafety"
            checked={hasSafetyFlag}
            onChange={(e) => setHasSafetyFlag(e.target.checked)}
          />
          <label className="form-check-label small" htmlFor="filterSafety">Safety flag history only</label>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <span className="fw-bold text-white">Caseload</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <span key={i} className="placeholder col-12 mb-2 d-block" style={{ height: 40 }} />
              ))}
            </div>
          ) : !caseload?.length ? (
            <div className="p-5 text-center text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-25" />
              <p className="fw-semibold mb-0">No students match these filters.</p>
              <p className="small mb-0">Students appear here once they have at least one completed MHA session.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Student</th>
                    <th>Grade</th>
                    <th>Latest Session</th>
                    <th>Highest Risk Level</th>
                    <th>Status</th>
                    <th className="pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {caseload.map((row: MhaCaseloadItem) => (
                    <tr
                      key={row.studentId}
                      role="button"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedStudentId(row.studentId)}
                    >
                      <td className="ps-4 fw-semibold small">{row.studentName}</td>
                      <td className="small">{row.grade}</td>
                      <td className="small text-nowrap">{formatDate(row.latestSessionDate)}</td>
                      <td>
                        <span className={`badge ${LEVEL_BADGE_CLASS[row.highestRiskLevel]}`}>
                          {DOMAIN_RESULT_LEVEL_LABELS[row.highestRiskLevel]}
                        </span>
                      </td>
                      <td className="d-flex flex-wrap gap-1 py-2">
                        {row.hasPendingActions && <FollowUpBadge />}
                        {row.hasSafetyFlag && <SafetyBadge />}
                      </td>
                      <td className="pe-4">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedStudentId(row.studentId)
                          }}
                        >
                          <History size={14} /> History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* AC #77 — clicking a student row opens their full MHA session history, reusing the same
          panel already mounted on the student profile page (MHA-132) rather than rebuilding it. */}
      {selectedStudentId && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setSelectedStudentId(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {caseload?.find((c) => c.studentId === selectedStudentId)?.studentName ?? 'MHA Session History'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setSelectedStudentId(null)} />
                </div>
                <div className="modal-body">
                  <MhaSessionHistoryPanel studentId={selectedStudentId} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
