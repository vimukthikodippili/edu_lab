import { Metadata } from 'next'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { ExamHallManagementContent } from '@/features/exam-halls/components/ExamHallManagementContent'
import { ExamAllocationContent } from '@/features/exam-halls/components/ExamAllocationContent'

export const metadata: Metadata = { title: 'Exam Halls' }

export default function SectionHeadExamHallsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECTION_HEAD]}>
      <ExamHallManagementContent />
      <ExamAllocationContent />
    </RoleGuard>
  )
}
