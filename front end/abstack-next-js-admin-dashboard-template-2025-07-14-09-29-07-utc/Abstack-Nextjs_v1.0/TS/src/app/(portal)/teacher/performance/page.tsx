'use client'
import { Activity } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyPerformance } from '@/features/teacher-performance/hooks/useMyPerformance'
import TeacherPerformanceCharts from '@/features/teacher-performance/components/TeacherPerformanceCharts'

function PerformanceDashboard() {
  const { data, isLoading } = useMyPerformance()

  if (isLoading) {
    return (
      <div className="container-fluid py-4">
        <div className="placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="placeholder col-3 mb-3 rounded" style={{ height: 20 }} />
                <div className="placeholder col-12 rounded" style={{ height: 200 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <Activity size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">My Performance</h4>
          <p className="text-muted small mb-0">
            Your own attendance, class results, and syllabus pace — shown as data and trends, not a single rating
          </p>
        </div>
      </div>

      <TeacherPerformanceCharts data={data} />
    </div>
  )
}

export default function TeacherPerformancePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <PerformanceDashboard />
    </RoleGuard>
  )
}
