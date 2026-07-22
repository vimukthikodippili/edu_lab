'use client'
import { Trophy } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import StudentSportsProfile from '@/features/sports/components/StudentSportsProfile'

function StudentSportsContent() {
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
          <h4 className="mb-0 fw-bold">My Sports Performance</h4>
          <p className="text-muted small mb-0">
            Match history, season averages, personal bests, and year-on-year progress for every sport you play
          </p>
        </div>
      </div>

      <StudentSportsProfile />
    </div>
  )
}

export default function StudentSportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentSportsContent />
    </RoleGuard>
  )
}
