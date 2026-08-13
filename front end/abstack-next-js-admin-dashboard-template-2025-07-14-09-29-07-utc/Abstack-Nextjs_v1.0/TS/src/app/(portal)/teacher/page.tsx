import { Metadata } from 'next'
import TeacherDashboardContent from './_components/TeacherDashboardContent'

export const metadata: Metadata = { title: 'Teacher Dashboard' }

export default function TeacherDashboard() {
  return <TeacherDashboardContent />
}
