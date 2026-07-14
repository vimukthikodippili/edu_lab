'use client'
import { Compass } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'
import { SelfDiscoveryWizard } from '@/features/self-discovery/components/SelfDiscoveryWizard'

const MIN_GRADE_LEVEL = 9

function SelfDiscoveryContent() {
  const { data: myStudent, isLoading, error } = useMyStudent()

  if (isLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 300 }} />
        </div>
      </div>
    )
  }

  if (error || !myStudent) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <Compass size={18} />
          <div>
            <strong>Student record not found.</strong> Your account is not yet linked to a student profile.
            Please contact your school administrator.
          </div>
        </div>
      </div>
    )
  }

  if (myStudent.grade.level < MIN_GRADE_LEVEL) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-info d-flex align-items-center gap-2">
          <Compass size={18} />
          <div>
            This assessment becomes available from Grade 9 onward. Check back once you reach Grade 9!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Compass size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Self-Discovery: Career Exploration</h4>
          <p className="text-muted small mb-0">
            A short reflection on your personality and interests — advisory only, never a decision about your subjects.
          </p>
        </div>
      </div>

      <SelfDiscoveryWizard />
    </div>
  )
}

export default function StudentSelfDiscoveryPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <SelfDiscoveryContent />
    </RoleGuard>
  )
}
