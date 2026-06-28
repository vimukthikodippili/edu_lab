import { Metadata } from 'next'
import Link from 'next/link'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { EnrollmentWizard } from '@/features/students'

export const metadata: Metadata = { title: 'Enroll Student — SIMS' }

export default function EnrollStudentPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <div className="container-fluid">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link href="/admin/students">Students</Link>
            </li>
            <li className="breadcrumb-item active">Enroll New Student</li>
          </ol>
        </nav>

        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-7">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <EnrollmentWizard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
