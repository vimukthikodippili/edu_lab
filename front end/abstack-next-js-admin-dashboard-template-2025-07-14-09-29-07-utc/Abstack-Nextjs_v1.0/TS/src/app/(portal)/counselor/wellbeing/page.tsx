'use client'
import { useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { StudentPicker } from '@/features/wellbeing/components/StudentPicker'
import { ObservationTimeline } from '@/features/wellbeing/components/ObservationTimeline'

function WellbeingLogsContent() {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const { data: staffData } = useStaff({ limit: 100 } as any)
  const staffById = new Map((staffData?.data ?? []).map((s) => [s.id, s]))

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
        >
          <HeartHandshake size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Wellbeing Logs</h4>
          <p className="text-muted small mb-0">
            Teacher-submitted observations, for your review — plain notes only, never a label or score.
          </p>
        </div>
      </div>

      <StudentPicker selectedId={studentId} onSelect={(id, name) => { setStudentId(id); setStudentName(name) }} />

      {studentId && (
        <ObservationTimeline studentId={studentId} studentName={studentName} staffById={staffById} />
      )}
    </div>
  )
}

export default function CounselorWellbeingPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.COUNSELOR]}>
      <WellbeingLogsContent />
    </RoleGuard>
  )
}
