'use client'
import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import StudentSportsProfile from '@/features/sports/components/StudentSportsProfile'

function GuardianSportsContent() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyGuardianProfile()
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId && profile?.students.length) {
      setStudentId(profile.students[0].id)
    }
  }, [profile, studentId])

  if (profileLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning">
          Your account is not yet linked to a guardian record. Please contact your school administrator.
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <Trophy size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Sports Performance</h4>
          <p className="text-muted small mb-0">
            Match history, season averages, personal bests, and year-on-year progress
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

      <StudentSportsProfile studentId={studentId} />
    </div>
  )
}

export default function GuardianSportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianSportsContent />
    </RoleGuard>
  )
}
