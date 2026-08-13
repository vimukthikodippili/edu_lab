import { Metadata } from 'next'
import AdminDashboardContent from './_components/AdminDashboardContent'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'

export const metadata: Metadata = { title: 'System Admin Dashboard' }

export default function AdminDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN]}>
      <AdminDashboardContent />
    </RoleGuard>
  )
}
