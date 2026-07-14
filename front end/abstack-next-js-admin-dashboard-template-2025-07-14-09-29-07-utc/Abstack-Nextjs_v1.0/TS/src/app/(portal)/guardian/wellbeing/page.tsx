'use client'
import { useState, useEffect } from 'react'
import { HeartHandshake, MessageCircleHeart } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useMyChildApprovedSummaries } from '@/features/counselor-notes/hooks/useMyChildApprovedSummaries'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function GuardianWellbeingContent() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyGuardianProfile()
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId && profile?.students.length) {
      setStudentId(profile.students[0].id)
    }
  }, [profile, studentId])

  const { data: summaries, isLoading: summariesLoading } = useMyChildApprovedSummaries(studentId)

  if (profileLoading) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 640 }}>
        <div className="placeholder-glow">
          <span className="placeholder col-6 rounded d-block mb-2" style={{ height: 32 }} />
          <span className="placeholder col-12 rounded d-block" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 640 }}>
        <div className="alert alert-warning">
          Your account is not yet linked to a guardian record. Please contact your school administrator.
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 640 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
        >
          <HeartHandshake size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Wellbeing Updates</h4>
          <p className="text-muted small mb-0">
            Non-clinical summaries your school counselor has chosen to share with you.
          </p>
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

      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4"
          style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
        >
          <span className="fw-semibold text-white">Shared Updates</span>
        </div>
        <div className="card-body">
          {summariesLoading ? (
            <div className="text-muted small py-3">Loading…</div>
          ) : !summaries?.length ? (
            <div className="text-center text-muted py-5">
              <MessageCircleHeart size={32} className="mb-2 opacity-50" />
              <p className="mb-0 small">No updates shared yet.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {summaries.map((summary) => (
                <div key={summary.id} className="rounded-3 p-3" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                  <p className="mb-2" style={{ fontSize: 14, color: '#134e4a' }}>{summary.approvedSummary}</p>
                  <span className="text-muted" style={{ fontSize: 12 }}>{formatDate(summary.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GuardianWellbeingPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianWellbeingContent />
    </RoleGuard>
  )
}
