'use client'
import { useState, useEffect } from 'react'
import { FlaskConical, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useGuardianChildLabReports } from '@/features/lab-reports/hooks/useGuardianChildLabReports'
import type { LabReportSubmissionStatus } from '@/types/sims/lab-reports'

const STATUS_CONFIG: Record<LabReportSubmissionStatus, { label: string; bg: string; color: string; icon: typeof CheckCircle }> = {
  graded: { label: 'Graded', bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  submitted: { label: 'Submitted', bg: '#e0e7ff', color: '#4338ca', icon: CheckCircle },
  late: { label: 'Late', bg: '#fee2e2', color: '#dc2626', icon: AlertTriangle },
  pending: { label: 'Not submitted', bg: '#fef3c7', color: '#92400e', icon: Clock },
}

function StatusBadge({ status }: { status: LabReportSubmissionStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className="badge rounded-pill px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

function GuardianLabReportsContent() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyGuardianProfile()
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId && profile?.students.length) {
      setStudentId(profile.students[0].id)
    }
  }, [profile, studentId])

  const { data: rows, isLoading: rowsLoading } = useGuardianChildLabReports(studentId)

  if (profileLoading) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
        <div className="placeholder-glow">
          <span className="placeholder col-6 rounded d-block mb-2" style={{ height: 32 }} />
          <span className="placeholder col-12 rounded d-block" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
        <div className="alert alert-warning">
          Your account is not yet linked to a guardian record. Please contact your school administrator.
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
        >
          <FlaskConical size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Lab Reports</h4>
          <p className="text-muted small mb-0">Your child&apos;s lab report status and grades.</p>
        </div>
      </div>

      {profile.students.length > 1 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body py-3">
            <label className="form-label fw-semibold small mb-2">Child</label>
            <div className="d-flex gap-2 flex-wrap">
              {profile.students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn btn-sm ${studentId === s.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setStudentId(s.id)}
                >
                  {s.firstName} {s.lastName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {rowsLoading ? (
        <div className="text-muted small py-3">Loading…</div>
      ) : !rows?.length ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <FlaskConical size={36} className="mb-3 opacity-25" />
            <p className="mb-0">No lab reports for this child&apos;s class yet.</p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {rows.map((row) => (
            <div key={row.assignment.id} className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4 d-flex flex-wrap align-items-start justify-content-between gap-3">
                <div style={{ minWidth: 240, flex: 1 }}>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className="badge rounded-pill px-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
                      {row.assignment.subject.name}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>
                  <h6 className="fw-bold mb-1">{row.assignment.title}</h6>
                  <span className="text-muted small d-flex align-items-center gap-1">
                    <Calendar size={13} /> Due {new Date(row.assignment.dueDate).toLocaleDateString()}
                  </span>
                  {row.submission?.feedback && (
                    <p className="small mt-2 mb-0" style={{ color: '#475569' }}>
                      <strong>Teacher feedback:</strong> {row.submission.feedback}
                    </p>
                  )}
                </div>
                {row.submission?.grade != null && (
                  <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                    {row.submission.grade} / {row.assignment.maxMarks}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GuardianLabReportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianLabReportsContent />
    </RoleGuard>
  )
}
